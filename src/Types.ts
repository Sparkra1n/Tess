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