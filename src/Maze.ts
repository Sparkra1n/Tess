/**
 * @file Maze.ts
 * @brief Implementation of a recursive backtracking maze generation algorithm in TypeScript with 3D wall extrusion
 * Date: 2025/05/16
 */

import * as Three from 'three';
import { Direction, dx, dy, opposite } from "./Directions.ts";
import { GameContext, RenderableObject } from "./Types.ts";
import { Ramp, vertexShader, fragmentShader } from "./ToonShader.ts"

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

export class Maze implements RenderableObject {
  private width: number;
  private height: number;
  private cellSize: number;
  private wallHeight: number;
  private wallSegments: WallSegment[] = [];
  private mesh: Three.Object3D | null = null;
  private grid: Grid;

  constructor(width: number, height: number, cellSize: number, wallHeight: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.wallHeight = wallHeight;

    this.grid = Array.from(Array(height), _ => Array(width).fill(0));
    this.generateMazeMesh();
  }

  getPosition() {
    return new Three.Vector3(0, 0, 0);
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

  private carvePassagesFrom(x: number, y: number): void {
    const directions = [Direction.North, Direction.South, Direction.East, Direction.West]
      .sort(() => Math.random() - 0.5);

    for (const dir of directions) {
      const nx = x + dx(dir);
      const ny = y + dy(dir);
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && this.grid[ny][nx] === 0) {
        this.grid[y][x] |= dir;
        this.grid[ny][nx] |= opposite(dir);
        this.carvePassagesFrom(nx, ny);
      }
    }
  }

  generateMaze(): void {
    this.carvePassagesFrom(0, 0);
  }

  createWallSegments(): void {
    const w = this.grid[0].length;
    const h = this.grid.length;
    this.wallSegments = [];

    // Add boundary walls at grid edges
    this.wallSegments.push(WallSegment.fromCoords(0, 0, 0, h)); // Left wall
    this.wallSegments.push(WallSegment.fromCoords(w, 0, w, h)); // Right wall
    this.wallSegments.push(WallSegment.fromCoords(0, 0, w, 0)); // Top wall
    this.wallSegments.push(WallSegment.fromCoords(0, h, w, h)); // Bottom wall

    // Internal vertical walls (between columns)
    for (let i = 1; i < w; i++) {
      let start: number | null = null;
      for (let j = 0; j <= h; j++) {
        const leftHasEast = j < h && (this.grid[j][i - 1] & Direction.East) !== 0;
        const rightHasWest = j < h && (this.grid[j][i] & Direction.West) !== 0;
        const hasPassage = leftHasEast || rightHasWest;

        if (!hasPassage) {
          if (start === null) start = j;
        } else if (start !== null) {
          this.wallSegments.push(WallSegment.fromCoords(i, start, i, j));
          start = null;
        }
      }
      if (start !== null) {
        this.wallSegments.push(WallSegment.fromCoords(i, start, i, h));
      }
    }

    // Internal horizontal walls (between rows)
    for (let j = 1; j < h; j++) {
      let start: number | null = null;
      for (let i = 0; i <= w; i++) {
        const aboveHasSouth = i < w && (this.grid[j - 1][i] & Direction.South) !== 0;
        const belowHasNorth = i < w && (this.grid[j][i] & Direction.North) !== 0;
        const hasPassage = aboveHasSouth || belowHasNorth;

        if (!hasPassage) {
          if (start === null) start = i;
        } else if (start !== null) {
          this.wallSegments.push(WallSegment.fromCoords(start, j, i, j));
          start = null;
        }
      }
      if (start !== null) {
        this.wallSegments.push(WallSegment.fromCoords(start, j, w, j));
      }
    }
  }

  generateMazeMesh(): void {
    this.generateMaze();
    this.createWallSegments();

    const ramp = new Ramp(
      new Three.Color(0x333333), // Shadow
      new Three.Color(0x6666cc), // Base
      new Three.Color(0x9999ff), // Intermediate
      new Three.Color(0xffffff)  // Highlight
    );

    // Create material
    const material = new Three.ShaderMaterial({
      uniforms: {
        lightDirection: { value: new Three.Vector3(1, 1, 1).normalize() },
        rampTexture: { value: ramp.getTexture() }
      },
      vertexShader,
      fragmentShader
    });

    const wallThickness = this.cellSize * 0.1; // Thin walls to ensure passages are wide
    // const material = new Three.MeshPhongMaterial({ color: 0x00ffcc });
    const group = new Three.Group();

    for (const segment of this.wallSegments) {
      const p1 = segment.p1;
      const p2 = segment.p2;

      if (p1.x === p2.x) {
        // Vertical wall (constant x, runs along z)
        const x = p1.x * this.cellSize;
        const z1 = Math.min(p1.y, p2.y) * this.cellSize;
        const z2 = Math.max(p1.y, p2.y) * this.cellSize;

        // Center the wall on the grid line
        const xMin = x - wallThickness / 2;
        const xMax = x + wallThickness / 2;

        const width = xMax - xMin; // Thickness in x
        const height = this.wallHeight; // Height in y
        const depth = z2 - z1; // Length in z

        const geometry = new Three.BoxGeometry(width, height, depth);
        const position = new Three.Vector3(
          (xMin + xMax) / 2, // Center in x
          this.wallHeight / 2, // Center in y
          (z1 + z2) / 2 // Center in z
        );

        const wallMesh = new Three.Mesh(geometry, material);
        wallMesh.position.set(position.x, position.y, position.z);
        group.add(wallMesh);
      } else if (p1.y === p2.y) {
        // Horizontal wall (constant z, runs along x)
        const z = p1.y * this.cellSize;
        const x1 = Math.min(p1.x, p2.x) * this.cellSize;
        const x2 = Math.max(p1.x, p2.x) * this.cellSize;

        // Center the wall on the grid line
        const zMin = z - wallThickness / 2;
        const zMax = z + wallThickness / 2;

        const width = x2 - x1; // Length in x
        const height = this.wallHeight; // Height in y
        const depth = zMax - zMin; // Thickness in z

        const geometry = new Three.BoxGeometry(width, height, depth);
        const position = new Three.Vector3(
          (x1 + x2) / 2, // Center in x
          this.wallHeight / 2, // Center in y
          (zMin + zMax) / 2 // Center in z
        );

        const wallMesh = new Three.Mesh(geometry, material);
        wallMesh.position.set(position.x, position.y, position.z);
        group.add(wallMesh);
      }
    }

    this.mesh = group;
  }
}