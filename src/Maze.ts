/**
 * @file Maze.ts
 * @brief Implementation of the Hunt and Kill maze generation algorithm in Typescript
 * Date : 2025/05/08
 */

import * as Three from 'three';
import { Direction, dx, dy, opposite } from "./Directions.ts"
import { Grid, Point2, WallSegment, GameContext, RenderableObject } from "./Types.ts"

export class Maze implements RenderableObject {
  private width: number;
  private height: number;
  private cellSize: number;
  private wallHeight: number;
  private wallSegments: WallSegment[] = [];
  private lineSegments: Three.LineSegments | null = null;
  private grid: Grid;

  constructor(width: number, height: number, cellSize: number, wallHeight: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.wallHeight = wallHeight;

    this.grid = Array.from(Array(height), _ => Array(width).fill(0));
    this.generateMazeLineSegments();
  }

  update(context: GameContext): void {

  }

  getMesh(): Three.Object3D {
    return this.lineSegments;
  }

  walk(point: Point2): Point2 | null {
    // Scramble the directions
    const directions = [
      Direction.North,
      Direction.South,
      Direction.East,
      Direction.West
    ].sort(() => Math.random() - 0.5);

    for (const direction of directions) {
      // Calculate new node
      const xp = point.x + dx(direction);
      const yp = point.y + dy(direction);

      // Make sure it's still in the grid and not traversed
      if (xp >= 0 && yp >= 0
        && yp < this.grid.length
        && xp < this.grid[yp].length
        && this.grid[yp][xp] === 0
      ) {
        this.grid[point.y][point.x] |= direction;
        this.grid[yp][xp] |= opposite(direction);
        return new Point2(xp, yp);
      }
    }
    return null;
  }

  hunt(): Point2 | null {
    for (let y = 0; y < this.grid.length; ++y) {
      for (let x = 0; x < this.grid[y].length; ++x) {
        if (this.grid[y][x] !== 0) continue;

        const neighbors: Direction[] = [];
        if (y + 1 < this.grid.length && this.grid[y + 1][x] !== 0) neighbors.push(Direction.North);
        if (y > 0 && this.grid[y - 1][x] !== 0) neighbors.push(Direction.South);
        if (x + 1 < this.grid[y].length && this.grid[y][x + 1] !== 0) neighbors.push(Direction.East);
        if (x > 0 && this.grid[y][x - 1] !== 0) neighbors.push(Direction.West);

        if (neighbors.length > 0) {
          const direction = neighbors[Math.floor(Math.random() * neighbors.length)];
          const xp = x + dx(direction);
          const yp = y + dy(direction);
          // Ensure the target cell is within bounds
          if (yp >= 0 && yp < this.grid.length && xp >= 0 && xp < this.grid[yp].length) {
            this.grid[y][x] |= direction;
            this.grid[yp][xp] |= opposite(direction);
            return new Point2(x, y);
          } else {
            console.warn(`Skipped out-of-bounds access: yp=${yp}, xp=${xp}, direction=${direction}`);
          }
        }
      }
    }
    return null;
  }

  generateMaze(): void {
    let node = new Point2(
      Math.floor(Math.random() * this.width),
      Math.floor(Math.random() * this.height)
    );

    while (true) {
      const walkResult = this.walk(node);
      if (walkResult) {
        node.x = walkResult.x;
        node.y = walkResult.y;
      }
      else {
        const huntResult = this.hunt();
        if (huntResult) {
          node.x = huntResult.x;
          node.y = huntResult.y;
        }
        else
          break;
      }
    }
  }

  createWallSegments(): void {
    const w = this.grid[0].length;
    const h = this.grid.length;

    // Add boundary walls
    this.wallSegments.push(WallSegment.fromCoords(0, 0, 0, h)); // Left wall
    this.wallSegments.push(WallSegment.fromCoords(w, 0, w, h)); // Right wall
    this.wallSegments.push(WallSegment.fromCoords(0, 0, w, 0)); // Top wall
    this.wallSegments.push(WallSegment.fromCoords(0, h, w, h)); // Bottom wall

    // Internal vertical walls (between columns)
    for (let i = 1; i < w; i++) {
      let start: number | null = null;
      for (let j = 0; j <= h; j++) {
        if (j < h && (this.grid[j][i - 1] & Direction.East) === 0) {
          if (start === null)
            start = j;
        }
        else if (start !== null) {
          this.wallSegments.push(WallSegment.fromCoords(i, start, i, j));
          start = null;
        }
      }
    }

    // Internal horizontal walls (between rows)
    for (let k = 1; k < h; k++) {
      let start: number | null = null;
      for (let i = 0; i <= w; i++) {
        if (i < w && (this.grid[k - 1][i] & Direction.South) === 0) {
          if (start === null)
            start = i;
        }
        else if (start !== null) {
          this.wallSegments.push(WallSegment.fromCoords(start, k, i, k));
          start = null;
        }
      }
    }
  }

  /**
   * Generates a Three.js LineSegments object representing the maze walls.
   * @param width - Number of cells wide
   * @param height - Number of cells tall
   * @param cellSize - Width of each maze passage in 3D units
   * @param wallHeight - Height to extrude walls in 3D units
   * @returns THREE.LineSegments object for the maze
   */
  generateMazeLineSegments(): void {
    this.generateMaze();
    this.createWallSegments();

    const positions: number[] = [];

    for (const segment of this.wallSegments) {
      const p1 = segment.p1;
      const p2 = segment.p2;
      const x1 = p1.x * this.cellSize;
      const y1 = p1.y * this.cellSize;
      const x2 = p2.x * this.cellSize;
      const y2 = p2.y * this.cellSize;

      //FIXME: Why is the y-axis the up axis now??
      //FIXME: I thought 3js uses z-up. I flipped things here but we need to figure this out

      // Bottom line (z = 0)
      positions.push(x1, 0, y1, x2, 0, y2);

      // Top line (z = wallHeight)
      positions.push(x1, this.wallHeight, y1, x2, this.wallHeight, y2);

      // Vertical line at p1
      positions.push(x1, 0, y1, x1, this.wallHeight, y1);

      // Vertical line at p2
      positions.push(x2, 0, y2, x2, this.wallHeight, y2);
    }

    const geometry = new Three.BufferGeometry();
    geometry.setAttribute('position', new Three.Float32BufferAttribute(positions, 3));

    const material = new Three.LineBasicMaterial({ color: 0x00ffcc });

    this.lineSegments = new Three.LineSegments(geometry, material);
  }
}
