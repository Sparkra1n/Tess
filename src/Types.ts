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
  constructor(public x: number, public y: number) { }

  static of(x: number, y: number): Point2 {
    return new Point2(x, y);
  }
}

export class WallSegment {
  constructor(public p1: Point2, public p2: Point2) { }

  static fromCoords(x1: number, y1: number, x2: number, y2: number): WallSegment {
    return new WallSegment(new Point2(x1, y1), new Point2(x2, y2));
  }
}

