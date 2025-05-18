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
    const pointLight = new Three.PointLight(0xffffff, 100, 100);
    pointLight.position.set(5, 5, 5);

    const directionalLight = new Three.DirectionalLight(0xdedede, 1);
    directionalLight.position.set(0.0, 1.0, 0.0).normalize();


    const directionalLight2 = new Three.DirectionalLight(0x00ff00, 1);
    directionalLight2.position.set(0.0, 1.0, 0.0).normalize();
    const ambientLight = new Three.AmbientLight(0xdedede, 0.8);

    this.scene.add(pointLight, ambientLight);

    this.addSpaceSkydome();
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);
    this.camera.rotation.order = 'YXZ';
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Ensure pointer lock is maintained
    this.renderer.domElement.addEventListener('click', (e) => {
      if (this.cameraMode === 'first-person') {
        this.renderer.domElement.requestPointerLock();
      }
    });
  }

  addObject(obj: RenderableObject) {
    this.objects.push(obj);
    this.scene.add(obj.getMesh());
  }

  private updateUniforms(): void {
    // Get the camera's view matrix
    const viewMatrix = this.camera.matrixWorldInverse;
    const rotationMatrix = new Three.Matrix3().setFromMatrix4(viewMatrix);
  
    // Collect lights from the scene
    const directionalLights = this.scene.children.filter(
      child => child instanceof Three.DirectionalLight
    ) as Three.DirectionalLight[];
    const pointLights = this.scene.children.filter(
      child => child instanceof Three.PointLight
    ) as Three.PointLight[];
  
    // Limit to 4 lights per type (matches shader arrays)
    const maxLights = 4;
    const numDirLights = Math.min(directionalLights.length, maxLights);
    const numPointLights = Math.min(pointLights.length, maxLights);
  
    // Transform directional light directions to view space
    const dirLightDirsView = directionalLights.slice(0, maxLights).map(light => {
      const dirWorld = new Three.Vector3();
      light.getWorldDirection(dirWorld);  // Direction in world space
      return dirWorld.applyMatrix3(rotationMatrix).normalize();
    });
  
    // Transform point light positions to view space
    const pointLightPosView = pointLights.slice(0, maxLights).map(light => {
      return light.position.clone().applyMatrix4(viewMatrix);
    });
  
    // Update uniforms for all objects
    this.objects.forEach(obj => {
      const object3D = obj.getMesh();
      const updateMaterial = (material: Three.ShaderMaterial) => {
        if (material.uniforms.numDirectionalLights) {
          material.uniforms.numDirectionalLights.value = numDirLights;
          dirLightDirsView.forEach((dir, i) => {
            material.uniforms.directionalLightDirections.value[i].copy(dir);
          });
          material.uniforms.numPointLights.value = numPointLights;
          pointLightPosView.forEach((pos, i) => {
            material.uniforms.pointLightPositions.value[i].copy(pos);
          });
        }
      };
  
      if (object3D instanceof Three.Mesh && object3D.material instanceof Three.ShaderMaterial) {
        updateMaterial(object3D.material);
      }
  
      // Handle any meshes that have children (from the planet's moon logic)
      object3D.traverse(child => {
        if (child instanceof Three.Mesh && child.material instanceof Three.ShaderMaterial) {
          updateMaterial(child.material);
        }
      });
    });
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
    const { deltaTime, mouse } = context;

    if (this.cameraMode === 'first-person') {
      // Only process mouse input if pointer is locked
      if (document.pointerLockElement === this.renderer.domElement) {
        const sensitivity = 0.002;
        const rotationY = this.cameraTarget.getRotation().y - mouse.dx * sensitivity;
        this.cameraTarget.getRotation().y = rotationY;
        this.cameraPitch -= mouse.dy * sensitivity;
        this.cameraPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraPitch));
      }
      // Update camera position and rotation
      this.camera.position.copy(this.cameraTarget.getPosition());
      this.camera.position.y += 3; // Eye height
      this.camera.rotation.y = this.cameraTarget.getRotation().y;
      this.camera.rotation.x = this.cameraPitch;
    } else if (this.cameraMode === 'third-person') {
      const targetPosition = this.cameraTarget.getMesh().position;
      const direction = this.cameraTarget.getDirection();
      const offset = direction.clone().multiplyScalar(-this.cameraOffset.z);
      offset.y = this.cameraOffset.y;
      const desiredPosition = targetPosition.clone().add(offset);
      const alpha = 1 - Math.pow(1 - this.lerpFactor, deltaTime);
      this.camera.position.lerp(desiredPosition, alpha);
      this.camera.lookAt(targetPosition);
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
      this.updateUniforms();
    }
    this.updateCamera(context);
    this.renderer.render(this.scene, this.camera);
  }

  addSpaceSkydome() {
    const radius = 500; // Radius of the skydome, large enough to encompass the scene
    const numStars = 200; // Number of stars to generate
    const positions = new Float32Array(numStars * 3); // Array to hold x, y, z coordinates
  
    // Generate random star positions on the sphere's surface
    for (let i = 0; i < numStars; i++) {
      const u = Math.random(); // Random value between 0 and 1
      const v = Math.random(); // Random value between 0 and 1
      const theta = 2 * Math.PI * u; // Azimuth angle
      const phi = Math.acos(2 * v - 1); // Inclination angle
  
      // Convert spherical coordinates to Cartesian coordinates
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
  
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
  
    // Create geometry and set the positions
    const geometry = new Three.BufferGeometry();
    geometry.setAttribute('position', new Three.BufferAttribute(positions, 3));
  
    // Create material for the stars
    const material = new Three.PointsMaterial({
      color: 0xffffff, // White stars
      size: 3, // Size of each star (adjustable)
    });
  
    // Create the Points object and add it to the scene
    const stars = new Three.Points(geometry, material);
    this.scene.add(stars);
  }
}