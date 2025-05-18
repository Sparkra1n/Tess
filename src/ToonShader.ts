import * as Three from 'three';

export class Ramp {
  private texture: Three.DataTexture;

  constructor(
    shadowColor: Three.Color = new Three.Color(0x333333), // Dark gray
    baseColor: Three.Color = new Three.Color(0x6666cc),   // Blue-ish
    intermediateColor: Three.Color = new Three.Color(0x9999ff), // Lighter blue
    highlightColor: Three.Color = new Three.Color(0xffffff), // White
    width: number = 256 // Texture width
  ) {
    // Create a 1D array for RGBA values
    const data = new Uint8Array(width * 4);
    const colors = [shadowColor, baseColor, intermediateColor, highlightColor];
    const segmentWidth = width / 4;

    for (let i = 0; i < width; i++) {
      // Determine which color segment we're in
      const segment = Math.min(Math.floor(i / segmentWidth), 3);
      const color = colors[segment];

      // Set RGBA values (convert 0-1 to 0-255)
      data[i * 4] = Math.floor(color.r * 255);
      data[i * 4 + 1] = Math.floor(color.g * 255);
      data[i * 4 + 2] = Math.floor(color.b * 255);
      data[i * 4 + 3] = 255; // Full alpha
    }

    // Create 1D texture
    this.texture = new Three.DataTexture(data, width, 1, Three.RGBAFormat);
    this.texture.minFilter = Three.NearestFilter; // Sharp transitions
    this.texture.magFilter = Three.NearestFilter;
    this.texture.needsUpdate = true;
  }

  public getTexture(): Three.DataTexture {
    return this.texture;
  }

  public dispose(): void {
    this.texture.dispose();
  }
}

// Vertex Shader
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

// Fragment Shader
const fragmentShader = `
uniform sampler2D rampTexture;
uniform sampler2D grungeTexture;
uniform vec3 grungeColor;
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

  vec3 baseColor = texture2D(rampTexture, vec2(totalIntensity, 0.5)).rgb;
  float weight = grungeStrength * (1.0 - totalIntensity);
  vec2 scaledUv = vUv * grungeScale;
  float grungeValue = texture2D(grungeTexture, scaledUv).r;
  vec3 finalColor = mix(baseColor, grungeColor, weight * grungeValue);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export function createToonShader(ramp: Ramp): Three.ShaderMaterial {
  // Load grunge texture (e.g., paper or scratch PNG)
  const grungeTexture = new Three.TextureLoader().load(
    'lines.png',
    () => console.log('Grunge texture loaded'),
    undefined,
    (err) => console.error('Error loading grunge texture:', err)
  );
  grungeTexture.wrapS = Three.RepeatWrapping;
  grungeTexture.wrapT = Three.RepeatWrapping;
  
  // Assuming ramp is an object providing the ramp texture
  return new Three.ShaderMaterial({
    uniforms: {
      rampTexture: { value: ramp.getTexture() },
      grungeTexture: { value: grungeTexture },
      grungeColor: { value: new Three.Color(0x0A1005) },  // Dark gray
      grungeStrength: { value: 1.0 },  // Adjust grunge intensity
      grungeScale: { value: new Three.Vector2(1.0, 1.0) },  // Adjust texture tiling
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