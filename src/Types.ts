/**
 * @file Types.ts
 */

import * as Three from 'three';

export interface GameContext {
  deltaTime: number;
  input: Set<string>;
  mouse: { x: number; y: number };
}

export interface RenderableObject {
  update(context: GameContext): void;
  getMesh(): Three.Object3D;
}

export type Axis = 'x' | 'y' | 'z' | 'w';
export type Plane = [Axis, Axis];
