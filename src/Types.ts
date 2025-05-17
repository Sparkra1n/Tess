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

export type Axis = 'x' | 'y' | 'z' | 'w';
export type Plane = [Axis, Axis];
