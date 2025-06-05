/**
 * @file Types.ts
 * @author Thomas Z.
 * 2025/04/17
 * wrote it
 */

import * as Three from 'three';
import { GameContext } from "./GameContext.ts"

export interface ICollision {
  normal: Three.Vector3;
  depth: number;
}

// Use observer design method
export interface ICollisionHandler {
  willCollide(position: Three.Vector3): ICollision[];
  // getCollisionNormal(position: Three.Vector3): Three.Vector3; // normal vector
}

// Create our virtual base class so we can handle 4D objects like the player
// Methods will be overridden by the player and stuff
export class RenderableObject<T extends Three.Object3D = Three.Object3D> {
  protected mesh: T;

  constructor(mesh: T) {
    this.mesh = mesh;
  }

  update(context: GameContext): void {}

  getMesh(): T {
    return this.mesh;
  }

  getPosition(): Three.Vector3 {
    return this.mesh.position.clone();
  }

  getRotation(): Three.Vector3 {
    return this.mesh.rotation.toVector3();
  }

  setPosition(x: number, y: number, z: number): void {
    this.mesh.position.set(x, y, z);
  }
}

// export class Container implements RenderableObject<Three.Group> {
//   private group: Three.Group;

//   constructor() {
//     this.group = new Three.Group();
//     // Add children to the group as needed
//   }

//   update(context: GameContext): void {
//     // Update logic
//   }

//   getMesh(): Three.Group {
//     return this.group;
//   }

//   getPosition(): Three.Vector3 {
//     return this.group.position.clone();
//   }

//   getRotation(): Three.Vector3 {
//     return this.group.rotation.toVector3();
//   }

//   setPosition(x: number, y: number, z: number): void {
//     this.group.position.set(x, y, z);
//   }
// }

// For static objects
// 2025/05/17: Added compatability with 3js's provided meshes that are Object3D
// export class StaticMesh implements RenderableObject {
//   protected mesh: Three.Object3D;

//   constructor(mesh: Three.Object3D) {
//     this.mesh = mesh;
//   }

//   static fromGeometry(geometry: Three.BufferGeometry, material: Three.Material): StaticMesh {
//     const mesh = new Three.Mesh(geometry, material);
//     return new StaticMesh(mesh);
//   }

//   setPosition(x: number, y: number, z: number) : void {
//     this.mesh.position.set(x, y, z);
//   }

//   getPosition(): Three.Vector3 {
//     return this.mesh.position;
//   }

//   getRotation(): Three.Vector3 {
//     return new Three.Vector3(0, 0, 0);
//   }

//   // getDirection(): Three.Vector3 {
//   //   return new Three.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
//   // }

//   // No update needed for static objects
//   update(context: GameContext): void {
//   }

//   getMesh(): Three.Object3D {
//     if (!this.mesh) throw new Error("Mesh not initialized");
//     return this.mesh;
//   }
// }