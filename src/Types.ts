/**
 * @file Types.ts
 */

import * as Three from 'three';
import { GameContext } from "./GameContext.ts"

// Use observer design method
export interface ICollisionHandler {
  willCollide(position: Three.Vector3): { collides: boolean, collisions: { normal: Three.Vector3, depth: number }[] } ;
  // getCollisionNormal(position: Three.Vector3): Three.Vector3; // normal vector
}

// Create our virtual base class so we can handle 4D objects like the player
// Methods will be overridden by the player and stuff
export interface RenderableObject
{
  // Our beautiful virtual functions
  update(context: GameContext): void;
  getMesh(): Three.Object3D;
  // getDirection(): Three.Vector3;
  getPosition(): Three.Vector3;
  getRotation(): Three.Vector3;
  setPosition(x: number, y: number, z: number): void;
}

// For static objects
// 2025/05/17: Added compatability with 3js's provided meshes that are Object3D
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

  // getDirection(): Three.Vector3 {
  //   return new Three.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
  // }

  // No update needed for static objects
  update(context: GameContext): void {
  }

  getMesh(): Three.Object3D {
    if (!this.mesh) throw new Error("Mesh not initialized");
    return this.mesh;
  }
}