import * as Three from 'three';

export class Ramp
{
  private texture: Three.DataTexture;
  private grungeTextures: (Three.Texture | null)[];
  private grungeColors: (Three.Color | null)[];

  constructor(
    shadowColor: Three.Color = new Three.Color(0x333333),
    baseColor: Three.Color = new Three.Color(0x6666cc),
    intermediateColor: Three.Color = new Three.Color(0x9999ff),
    highlightColor: Three.Color = new Three.Color(0xffffff),
    percentages: number[] = [25, 25, 25, 25],
    grungeTextures: (Three.Texture | null)[] = [null, null, null, null],
    grungeColors: (Three.Color | null)[] = [null, null, null, null],
    width: number = 512
  ) {
    const colors = [shadowColor, baseColor, intermediateColor, highlightColor];

    // Normalize percentages
    const total = percentages.reduce((sum, p) => sum + p, 0);
    const fractions = percentages.map(p => p / total);

    // Calculate cumulative fractions
    const cumulativeFractions = [];
    let cum = 0;
    for (const f of fractions) {
      cum += f;
      cumulativeFractions.push(cum);
    }

    // Ensure cumulative fractions are correct
    if (cumulativeFractions[cumulativeFractions.length - 1] !== 1) {
      cumulativeFractions[cumulativeFractions.length - 1] = 1; // Force last value to 1
    }

    const data = new Uint8Array(width * 4);
    for (let i = 0; i < width; i++) {
      const position = i / (width - 1); // Map pixel to 0-1 range
      let segment = 0;
      for (let s = 0; s < cumulativeFractions.length; s++) {
        if (position <= cumulativeFractions[s]) {
          segment = s;
          break;
        }
      }
      const color = colors[segment];
      // Apply inverse gamma correction 
      // because i don't understand what on earth is going with the color space in 3js...
      // Otherwise we get whack colors that aren't what we set
      const adjustedR = Math.pow(color.r, 1.0 / 2.2);
      const adjustedG = Math.pow(color.g, 1.0 / 2.2);
      const adjustedB = Math.pow(color.b, 1.0 / 2.2);

      // Pretend we're doing cool pointer arithmetic in C
      data[i * 4] = Math.floor(adjustedR * 255);
      data[i * 4 + 1] = Math.floor(adjustedG * 255);
      data[i * 4 + 2] = Math.floor(adjustedB * 255);
      data[i * 4 + 3] = 255;
    }
    this.texture = new Three.DataTexture(data, width, 1, Three.RGBAFormat);

    // ????
    // Ok so apparently even though eslint gives an error here saying this is not a field, it is!
    // Ok just tell it to shut up because for some reason this correctly sets the color space
    this.texture.encoding = Three.sRGBEncoding;
    this.texture.minFilter = Three.NearestFilter;
    this.texture.magFilter = Three.NearestFilter;
    this.texture.needsUpdate = true;
    this.grungeTextures = grungeTextures;
    this.grungeColors = grungeColors;
  }

  public getTexture(): Three.DataTexture {
    return this.texture;
  }

  public getGrungeTextures(): (Three.Texture | null)[] {
    return this.grungeTextures;
  }

  public getGrungeColors(): (Three.Color | null)[] {
    return this.grungeColors;
  }

  public dispose(): void {
    this.texture.dispose();
    this.grungeTextures.forEach(texture => {
      if (texture) texture.dispose();
    });
  }
}

export const vertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

void main() {
  vUv = uv;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;  // World-space position
  vWorldNormal = normalize(mat3(modelMatrix) * normal);      // World-space normal
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragmentShader = `
// Hardcode arrays to size 4 for simplicity
uniform sampler2D rampTexture;          // Texture for color based on intensity
uniform sampler2D grungeTextures[4];    // Optional grunge textures
uniform bool grungeEnabled[4];          // Flags for grunge per segment
uniform vec3 grungeColors[4];           // Colors for grunge effects
uniform float grungeStrength;           // Strength of grunge effect
uniform vec2 grungeScale;               // Scale for grunge UVs
uniform int numDirectionalLights;       // Number of directional lights
uniform vec3 directionalLightDirections[4]; // World-space directions
uniform vec3 directionalLightColors[4]; // Colors I might add later
uniform int numPointLights;             // Number of point lights
uniform vec3 pointLightPositions[4];    // Now in world space
uniform vec3 pointLightColors[4];       // Colors I might add later
uniform vec3 ambientLightColor;         // Ambient color
uniform float ambientIntensity;         // Ambient strength

varying vec2 vUv;                       // UV coordinates
varying vec3 vWorldPosition;            // World-space position
varying vec3 vWorldNormal;              // World-space normal

void main() {
  vec3 normal = normalize(vWorldNormal); // Use world-space normal
  float totalIntensity = 0.0;
  float maxNdotL = 0.0;
  int totalLights = numDirectionalLights + numPointLights;

  // Directional lights (assuming directions are in world space)
  for (int i = 0; i < numDirectionalLights; ++i) {
    vec3 lightDir = normalize(directionalLightDirections[i]);
    float NdotL = dot(normal, lightDir);
    float intensity = max(NdotL, 0.0);
    totalIntensity += intensity;
    maxNdotL = max(maxNdotL, intensity);
  }

  // Point lights (using world-space positions)
  for (int i = 0; i < numPointLights; ++i) {
    vec3 lightDir = normalize(pointLightPositions[i] - vWorldPosition);
    float NdotL = dot(normal, lightDir);
    float intensity = max(NdotL, 0.0);
    totalIntensity += intensity;
    maxNdotL = max(maxNdotL, intensity);
  }

  // Normalize intensity across all lights
  if (totalLights > 0) {
    totalIntensity /= float(totalLights);
  } else {
    totalIntensity = 0.0;
  }

  // Add ambient contribution
  float ambientContribution = ambientIntensity * length(ambientLightColor);
  totalIntensity += ambientContribution;

  // Adjust intensity to emphasize dominant light
  totalIntensity = mix(totalIntensity, maxNdotL, 0.7);
  totalIntensity = pow(totalIntensity, 0.5);
  totalIntensity = clamp(totalIntensity, 0.0, 1.0);

  // Sample color from ramp texture
  vec3 baseColor = texture2D(rampTexture, vec2(totalIntensity, 0.5)).rgb;

  // Grunge effect (optional, adjust as needed)
  vec3 finalColor = baseColor;
  float weight = grungeStrength * (1.0 - totalIntensity);
  vec2 scaledUv = vUv * grungeScale;

  // Apply grunge based on intensity segments
  float segmentFloat = totalIntensity * 4.0;
  int segment = int(floor(segmentFloat));
  segment = clamp(segment, 0, 3);

  if (segment == 0 && grungeEnabled[0]) {
    float grungeValue = texture2D(grungeTextures[0], scaledUv).r;
    finalColor = mix(baseColor, grungeColors[0], weight * grungeValue);
  } else if (segment == 1 && grungeEnabled[1]) {
    float grungeValue = texture2D(grungeTextures[1], scaledUv).r;
    finalColor = mix(baseColor, grungeColors[1], weight * grungeValue);
  } else if (segment == 2 && grungeEnabled[2]) {
    float grungeValue = texture2D(grungeTextures[2], scaledUv).r;
    finalColor = mix(baseColor, grungeColors[2], weight * grungeValue);
  } else if (segment == 3 && grungeEnabled[3]) {
    float grungeValue = texture2D(grungeTextures[3], scaledUv).r;
    finalColor = mix(baseColor, grungeColors[3], weight * grungeValue);
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export function createToonShader(ramp: Ramp): Three.ShaderMaterial {
  const grungeTextures = ramp.getGrungeTextures();
  const grungeEnabled = grungeTextures.map(texture => texture !== null);
  const grungeColors = ramp.getGrungeColors().map(color => color || new Three.Color(0x0A1005)); // Fallback color

  return new Three.ShaderMaterial({
    uniforms: {
      rampTexture: { value: ramp.getTexture() },
      grungeTextures: { value: grungeTextures },
      grungeEnabled: { value: grungeEnabled },
      grungeColors: { value: grungeColors },
      grungeStrength: { value: 1.0 },
      grungeScale: { value: new Three.Vector2(1.0, 1.0) },
      numDirectionalLights: { value: 0 },
      directionalLightDirections: { value: [
        new Three.Vector3(),
        new Three.Vector3(),
        new Three.Vector3(),
        new Three.Vector3()
      ] },
      directionalLightColors: { value: [
        new Three.Color(1, 1, 1),
        new Three.Color(1, 1, 1),
        new Three.Color(1, 1, 1),
        new Three.Color(1, 1, 1)
      ] },
      numPointLights: { value: 0 },
      pointLightPositions: { value: [
        new Three.Vector3(),
        new Three.Vector3(),
        new Three.Vector3(),
        new Three.Vector3()
      ] },
      pointLightColors: { value: [
        new Three.Color(1, 1, 1),
        new Three.Color(1, 1, 1),
        new Three.Color(1, 1, 1),
        new Three.Color(1, 1, 1)
      ] },
      ambientLightColor: { value: new Three.Color(0, 0, 0) },
      ambientIntensity: { value: 0.0 }
    },
    vertexShader,
    fragmentShader
  });
}