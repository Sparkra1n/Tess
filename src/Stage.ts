/**
 * @file Stage.ts
 * @brief Contains the scene manager and star background.
 * @author Thomas Z.
 * Date: 2025/05/08
 */

import * as Three from 'three';
import { RenderableObject } from './Types';
import { GameContext } from "./GameContext.ts"

export class Stage {
  private scene = new Three.Scene();
  private camera = new Three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  private renderer = new Three.WebGLRenderer();
  private objects: RenderableObject[] = [];
  private cameraOffset = new Three.Vector3(0, 3, -6);
  private cameraTarget: RenderableObject | null = null;
  private lerpFactor = 0.95;
  private cameraMode: 'third-person' | 'first-person' | 'top-down' = 'third-person';
  private cameraPitch: number = 0;
  private lastCState: boolean = false;

  constructor() {
    const pointLight = new Three.PointLight(0xffffff, 1.0, 100);
    pointLight.position.set(10, 10, 10);
    this.scene.add(pointLight);

    const ambientLight = new Three.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    this.addSpaceSkydome();
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);
    this.camera.rotation.order = 'YXZ';
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = Three.NoToneMapping;
    this.renderer.outputColorSpace = Three.LinearSRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('click', () => {
      if (this.cameraMode === 'first-person') {
        this.renderer.domElement.requestPointerLock();
      }
    });
  }

  addObject(obj: RenderableObject) {
    this.objects.push(obj);
    this.scene.add(obj.getMesh());
  }

  private computeWorldSpaceLights<T extends Three.Light>(
    lights: T[],
    maxLights: number
  ): { vectors: Three.Vector3[], colors: Three.Color[], numLights: number } {
    const numLights = Math.min(lights.length, maxLights);
    const vectors = new Array<Three.Vector3>(maxLights).fill(new Three.Vector3(0, 0, 0));
    const colors = new Array<Three.Color>(maxLights).fill(new Three.Color(1, 1, 1));
    lights.slice(0, maxLights).forEach((light, i) => {
      // Use world-space position directly, not view space
      // view space causes issues with flickering when the player moves
      const vector = light.position.clone()
      vectors[i] = vector;
      colors[i] = light.color.clone();
    });
    return { vectors, colors, numLights };
  }
  
  private updateUniforms(): void {
    const maxLights = 4;
  
    const pointLights = this.scene.children.filter(child => child instanceof Three.PointLight) as Three.PointLight[];
    const directionalLights = this.scene.children.filter(child => child instanceof Three.DirectionalLight) as Three.DirectionalLight[];
    const ambientLights = this.scene.children.filter(child => child instanceof Three.AmbientLight) as Three.AmbientLight[];
  
    const pointLightData = this.computeWorldSpaceLights(pointLights, maxLights);
    const directionalLightData = this.computeWorldSpaceLights(directionalLights, maxLights);
  
    let ambientColor = new Three.Color(0, 0, 0);
    let ambientIntensity = 0.0;
    ambientLights.forEach(light => {
      ambientColor.add(light.color.clone().multiplyScalar(light.intensity));
      ambientIntensity += light.intensity;
    });
    ambientIntensity = Math.min(ambientIntensity, 1.0);
  
    for (const obj of this.objects) {
      obj.getMesh().traverse(child => {
        if (!(child instanceof Three.Mesh) || !(child.material instanceof Three.ShaderMaterial)) return;
        const material = child.material;
        if (!material.uniforms.numPointLights) return;
  
        // Point lights (world space)
        material.uniforms.numPointLights.value = pointLightData.numLights;
        pointLightData.vectors.forEach((pos, i) => {
          material.uniforms.pointLightPositions.value[i].copy(pos);
          material.uniforms.pointLightColors.value[i].copy(pointLightData.colors[i]);
        });
        // Directional lights (world space, if any)
        material.uniforms.numDirectionalLights.value = directionalLightData.numLights;
        directionalLightData.vectors.forEach((dir, i) => {
          material.uniforms.directionalLightDirections.value[i].copy(dir);
          material.uniforms.directionalLightColors.value[i].copy(directionalLightData.colors[i]);
        });
  
        // Ambient lights
        material.uniforms.ambientLightColor.value.copy(ambientColor);
        material.uniforms.ambientIntensity.value = ambientIntensity;
      });
    }
  }

  setCameraFollow(target: RenderableObject) {
    this.cameraTarget = target;
  }

  toggleCameraMode() {
    const modes: ('third-person' | 'first-person' | 'top-down')[] = ['third-person', 'first-person', 'top-down'];
    this.cameraMode = modes[(modes.indexOf(this.cameraMode) + 1) % modes.length];

    if (this.cameraMode === 'first-person') {
      this.renderer.domElement.requestPointerLock();
    } else if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
  }

  updateCamera(context: GameContext): void {
    if (!this.cameraTarget) return;
    const { deltaTime, mouse } = context;

    if (this.cameraMode === 'first-person') {
      if (document.pointerLockElement === this.renderer.domElement) {
        const sensitivity = 0.002;
        const rotation = this.cameraTarget.getRotation();
        rotation.y -= mouse.dx * sensitivity;
        this.cameraPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraPitch - mouse.dy * sensitivity));
      }
      this.camera.position.copy(this.cameraTarget.getPosition()).add(new Three.Vector3(0, 3, 0));
      this.camera.rotation.set(this.cameraPitch, this.cameraTarget.getRotation().y, 0);
    }
    
    else if (this.cameraMode === 'third-person') {
      const targetPosition = this.cameraTarget.getMesh().position;
      const direction = new Three.Vector3(0, 0, 1);
      const offset = direction.clone().multiplyScalar(-this.cameraOffset.z).setY(this.cameraOffset.y);
      const desiredPosition = targetPosition.clone().add(offset);
      const alpha = 1 - Math.pow(1 - this.lerpFactor, deltaTime);
      this.camera.position.lerp(desiredPosition, alpha);
      this.camera.lookAt(targetPosition);
    } 
    
    else if (this.cameraMode === 'top-down') {
      const targetPosition = this.cameraTarget.getMesh().position;
      const desiredPosition = new Three.Vector3(targetPosition.x, 25, targetPosition.z);
      const alpha = 1 - Math.pow(1 - this.lerpFactor, deltaTime);
      this.camera.position.lerp(desiredPosition, alpha);
      this.camera.lookAt(targetPosition);
    }
  }

  update(context: GameContext): void {
    const cPressed = context.input.has('c');
    if (cPressed && !this.lastCState) this.toggleCameraMode();
    this.lastCState = cPressed;

    this.updateUniforms();
    for (const obj of this.objects) {
      if (!obj) continue;
      obj.update(context);
    }
    this.updateCamera(context);
    this.renderer.render(this.scene, this.camera);
  }

  addSpaceSkydome() {
    const radius = 500;
    const numStars = 200;
    const positions = new Float32Array(numStars * 3);

    for (let i = 0; i < numStars; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    const geometry = new Three.BufferGeometry();
    geometry.setAttribute('position', new Three.BufferAttribute(positions, 3));
    const material = new Three.PointsMaterial({ color: 0xffffff, size: 3 });
    this.scene.add(new Three.Points(geometry, material));
  }
}