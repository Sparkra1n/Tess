/**
 * @file Types.ts
 */

import * as Three from 'three';
import { GameContext } from "./GameContext.ts"

export interface RenderableObject {
  update(context: GameContext): void;
  getMesh(): Three.Object3D;
  getDirection(): Three.Vector3;
  getPosition(): Three.Vector3;
  getRotation(): Three.Vector3;
  setPosition(x: number, y: number, z: number): void;
}

export class StaticMesh implements RenderableObject {
  protected mesh: Three.Object3D;

  constructor(mesh: Three.Object3D) {
    this.mesh = mesh;
  }

  static fromGeometry(geometry: Three.BufferGeometry, material: Three.Material): StaticMesh {
    const mesh = new Three.Mesh(geometry, material);
    return new StaticMesh(mesh);
  }

  setPosition(x: number, y: number, z: number) : void {
    this.mesh.position.set(x, y, z);
  }

  getPosition(): Three.Vector3 {
    return this.mesh.position;
  }

  getRotation(): Three.Vector3 {
    return new Three.Vector3(0, 0, 0);
  }

  getDirection(): Three.Vector3 {
    return new Three.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
  }

  update(context: GameContext): void {
    // No update needed for static objects
  }

  getMesh(): Three.Object3D {
    if (!this.mesh) {
      throw new Error("Mesh not initialized");
    }
    return this.mesh;
  }
}