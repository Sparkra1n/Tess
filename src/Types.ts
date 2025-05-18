/**
 * @file Types.ts
 */

import * as Three from 'three';

export interface GameContext {
  deltaTime: number;
  input: Set<string>;
  mouse: { x: number; y: number; movementX: number; movementY: number };
}

export interface RenderableObject {
  update(context: GameContext): void;
  getMesh(): Three.Object3D;
  getDirection(): Three.Vector3;
  getPosition(): Three.Vector3;
  getRotation(): Three.Vector3;
}

export class StaticMesh implements RenderableObject{
  private mesh: Three.Object3D;

  constructor(mesh: Three.Object3D) {
    this.mesh = mesh;
  }
  getPosition() {
    return this.mesh.position;
  }

  getRotation() {
    return new Three.Vector3(0, 0, 0);
  }

  getDirection() {
    return new Three.Vector3(0, 0, 0);
  }

  update(context: GameContext): void {
    // No update needed for static maze
  }

  getMesh(): Three.Object3D {
    if (!this.mesh) {
      throw new Error("Mesh not initialized");
    }
    return this.mesh;
  }
}

export type Axis = 'x' | 'y' | 'z' | 'w';
export type Plane = [Axis, Axis];
