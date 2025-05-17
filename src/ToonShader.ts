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

// Vertex and fragment shaders (imported or defined as strings)
export const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform vec3 lightDirection; // world space light direction
  varying vec3 vlightDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    // vLightDir = normalize(viewMatrix * vec4(lightDirection, 0.0)).xyz;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fragmentShader = `
  uniform vec3 lightDirection;
  uniform sampler2D rampTexture;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vLightDir;

  void main() {
    vec3 normal = normalize(vNormal);
    // vec3 lightDir = normalize(vLightDir);
    // float NdotL = dot(normal, lightDir);
    vec3 lightDir = normalize(lightDirection);
    float NdotL = dot(normal, lightDir);
    float intensity = clamp(NdotL * 0.5 + 0.5, 0.0, 1.0);
    float quantized = floor(intensity * 4.0) / 4.0 + 0.125;
    // vec3 color = texture2D(rampTexture, vec2(quantized, 0.5)).rgb;
    // // vec3 color = texture2D(rampTexture, vec2(intensity, 0.5)).rgb;
    // gl_FragColor = vec4(color, 1.0);
    
    vec3 color = texture2D(rampTexture, vec2(0.5, 0.5)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;