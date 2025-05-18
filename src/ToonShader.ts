import * as Three from 'three';

export class Ramp {
  private texture: Three.DataTexture;
  private grungeTextures: (Three.Texture | null)[];
  private grungeColors: (Three.Color | null)[];

  constructor(
    shadowColor: Three.Color = new Three.Color(0x333333),
    baseColor: Three.Color = new Three.Color(0x6666cc),
    intermediateColor: Three.Color = new Three.Color(0x9999ff),
    highlightColor: Three.Color = new Three.Color(0xffffff),
    grungeTextures: (Three.Texture | null)[] = [null, null, null, null],
    grungeColors: (Three.Color | null)[] = [null, null, null, null],
    width: number = 512
  ) {
    const data = new Uint8Array(width * 4);
    const colors = [shadowColor, baseColor, intermediateColor, highlightColor];
    const segmentWidth = width / 4;

    for (let i = 0; i < width; i++) {
      const segment = Math.min(Math.floor(i / segmentWidth), 3);
      const color = colors[segment];
      // Apply inverse gamma correction to compensate for darkening (hack)
      const adjustedR = Math.pow(color.r, 1.0 / 2.2);
      const adjustedG = Math.pow(color.g, 1.0 / 2.2);
      const adjustedB = Math.pow(color.b, 1.0 / 2.2);
      data[i * 4] = Math.floor(adjustedR * 255);
      data[i * 4 + 1] = Math.floor(adjustedG * 255);
      data[i * 4 + 2] = Math.floor(adjustedB * 255);
      data[i * 4 + 3] = 255;
    }

    this.texture = new Three.DataTexture(data, width, 1, Three.RGBAFormat);
    this.texture.encoding = Three.sRGBEncoding;
    this.texture.minFilter = Three.NearestFilter;
    this.texture.magFilter = Three.NearestFilter;
    this.texture.needsUpdate = true;
    this.grungeTextures = grungeTextures;
    this.grungeColors = grungeColors;

    for (let i = 0; i < width; i += 64) {
      const segment = Math.min(Math.floor(i / segmentWidth), 3);
      console.log(`Segment ${segment}: R=${data[i * 4]}, G=${data[i * 4 + 1]}, B=${data[i * 4 + 2]} (Adjusted)`);
    }
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
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const fragmentShader = `
uniform sampler2D rampTexture;
uniform sampler2D grungeTextures[4];
uniform bool grungeEnabled[4];
uniform vec3 grungeColors[4];
uniform float grungeStrength;
uniform vec2 grungeScale;
uniform int numDirectionalLights;
uniform vec3 directionalLightDirections[4];
uniform int numPointLights;
uniform vec3 pointLightPositions[4];

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  float totalIntensity = 0.0;

  for (int i = 0; i < numDirectionalLights; i++) {
    vec3 lightDir = normalize(directionalLightDirections[i]);
    float NdotL = dot(normal, lightDir);
    totalIntensity += max(NdotL, 0.0);
  }
  for (int i = 0; i < numPointLights; i++) {
    vec3 lightDir = normalize(pointLightPositions[i] - vViewPosition);
    float NdotL = dot(normal, lightDir);
    totalIntensity += max(NdotL, 0.0);
  }
  totalIntensity = min(totalIntensity, 1.0);

  // Calculate segment (0 to 3)
  float segmentFloat = totalIntensity * 4.0;
  int segment = int(floor(segmentFloat));
  segment = clamp(segment, 0, 3);

  // Get base color from ramp texture
  vec3 baseColor = texture2D(rampTexture, vec2(totalIntensity, 0.5)).rgb;

  vec3 finalColor = baseColor;
  float weight = grungeStrength * (1.0 - totalIntensity);
  vec2 scaledUv = vUv * grungeScale;

  // Explicitly check each segment to avoid dynamic sampler indexing
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
      numPointLights: { value: 0 },
      pointLightPositions: { value: [
        new Three.Vector3(),
        new Three.Vector3(),
        new Three.Vector3(),
        new Three.Vector3()
      ] }
    },
    vertexShader,
    fragmentShader
  });
}