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
  private cameraMode: 'third-person' | 'first-person' | 'top-down' = 'third-person';
  private cameraPitch: number = 0;
  private lastCState: boolean = false;

  constructor() {
    const pointLight = new Three.PointLight(0xffffff, 100, 100);
    pointLight.position.set(5, 5, 5);

    const directionalLight = new Three.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0.5, 0.0, 1.0).normalize();

    const ambientLight = new Three.AmbientLight(0xffffff);

    this.scene.add(pointLight, directionalLight, ambientLight);

    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);
    this.camera.rotation.order = 'YXZ'; // Set rotation order for FPS controls
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Mouse movement listener for first-person mode
    document.addEventListener('mousemove', (event) => {
      if (this.cameraMode === 'first-person' && document.pointerLockElement === this.renderer.domElement) {
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        const sensitivity = 0.002;
        if (this.cameraTarget)
          this.cameraTarget.getRotation().y -= movementX * sensitivity;
        this.cameraPitch -= movementY * sensitivity;
        this.cameraPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraPitch));
      }
    });
  }

  addObject(obj: RenderableObject) {
    this.objects.push(obj);
    this.scene.add(obj.getMesh());
  }

  setCameraFollow(target: RenderableObject) {
    this.cameraTarget = target;
  }

  toggleCameraMode() {
    const modes: ('third-person' | 'first-person' | 'top-down')[] = ['third-person', 'first-person', 'top-down'];
    const currentIndex = modes.indexOf(this.cameraMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.cameraMode = modes[nextIndex];

    if (this.cameraMode === 'first-person') {
      this.renderer.domElement.requestPointerLock();
    } else {
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock();
      }
    }
  }

  updateCamera(context: GameContext): void {
    if (!this.cameraTarget) return;
    const { deltaTime } = context;

    if (this.cameraMode === 'third-person') {
      const targetPosition = this.cameraTarget.getMesh().position;
      const direction = this.cameraTarget.getDirection();
      const offset = direction.clone().multiplyScalar(-this.cameraOffset.z);
      offset.y = this.cameraOffset.y;
      const desiredPosition = targetPosition.clone().add(offset);
      const alpha = 1 - Math.pow(1 - this.lerpFactor, deltaTime);
      this.camera.position.lerp(desiredPosition, alpha);
      this.camera.lookAt(targetPosition);
    } else if (this.cameraMode === 'first-person') {
      this.camera.position.copy(this.cameraTarget.getPosition());
      this.camera.rotation.y = this.cameraTarget.getRotation().y;
      this.camera.rotation.x = this.cameraPitch;
      this.camera.position.y = this.camera.position.y + 3;
    } else if (this.cameraMode === 'top-down') {
      const targetPosition = this.cameraTarget.getMesh().position;
      const desiredPosition = new Three.Vector3(targetPosition.x, 25, targetPosition.z);
      const alpha = 1 - Math.pow(1 - this.lerpFactor, deltaTime);
      this.camera.position.lerp(desiredPosition, alpha);
      this.camera.lookAt(targetPosition.x, 0, targetPosition.z);
    }
  }

  update(context: GameContext): void {
    const cPressed = context.input.has('c');
    if (cPressed && !this.lastCState) {
      this.toggleCameraMode();
    }
    this.lastCState = cPressed;

    for (const obj of this.objects) {
      if (obj === null) continue;
      obj.update(context);
    }
    this.updateCamera(context);
    this.renderer.render(this.scene, this.camera);
  }
}