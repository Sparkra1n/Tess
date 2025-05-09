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

export type Grid = number[][];

export class Point2 {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class WallSegment {
  public p1: Point2;
  public p2: Point2;

  constructor(p1: Point2, p2: Point2) {
    this.p1 = p1;
    this.p2 = p2;
  }
}
