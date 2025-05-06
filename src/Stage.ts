/**
 * @file Stage.ts
 */

import * as Three from 'three';
import { RenderableObject, GameContext } from './Types';

export class Stage {
  private scene = new Three.Scene();
  private camera = new Three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  private renderer = new Three.WebGLRenderer();
  private objects: RenderableObject[] = [];
  private cameraOffset = new Three.Vector3(0, 3, -6);
  private cameraTarget: RenderableObject | null = null;
  private lerpFactor = 0.95;

  constructor() {
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Add grid helper to the scene
    const gridHelper = new Three.GridHelper(20, 20);
    this.scene.add(gridHelper);
  }

  addObject(obj: RenderableObject) {
    this.objects.push(obj);
    this.scene.add(obj.getMesh());
  }

  setCameraFollow(target: RenderableObject) {
    this.cameraTarget = target;
  }

  updateCamera(context: GameContext): void {
    if (!this.cameraTarget) return;

    const { deltaTime } = context;

    // Get the target's mesh and its position
    const targetMesh = this.cameraTarget.getMesh();
    const targetPosition = targetMesh.position;

    let direction = new Three.Vector3(0, 0, -1);
    direction = (this.cameraTarget as any).direction.clone();
    const targetRotationY = targetMesh.rotation.y;
    direction = new Three.Vector3(Math.sin(targetRotationY), 0, -Math.cos(targetRotationY)).normalize();

    // Calculate camera offset: behind the player
    const offset = direction.clone().multiplyScalar(-this.cameraOffset.z);
    offset.y = this.cameraOffset.y;

    const desiredPosition = targetPosition.clone().add(offset);

    // Smoothly interpolate camera position with deltaTime
    const alpha = 1 - Math.pow(1 - this.lerpFactor, deltaTime); // Exponential decay
    this.camera.position.lerp(desiredPosition, alpha);

    // Ensure camera looks at the target's position
    this.camera.lookAt(targetPosition);
  }

  update(context: GameContext): void {
    for (const obj of this.objects) obj.update(context);
    this.updateCamera(context);
    this.renderer.render(this.scene, this.camera);
  }
}

