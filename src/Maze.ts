/**
 * @file Maze.ts
 * @brief Implementation of a recursive backtracking maze generation algorithm in TypeScript with 3D wall extrusion
 * Based on the original concept: https://github.com/Cukowski/Breadth-First-Search-maze-solver-Recursive-Backtracking-maze-generator/tree/main
 * Date: 2025/05/16
 */

import * as Three from 'three';
import { Direction, dx, dy, opposite } from "./Directions.ts";
import { GameContext, RenderableObject } from "./Types.ts";
import { Ramp, createToonShader } from "./ToonShader.ts"

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
      new Three.Color(0x273214), // Shadow
      new Three.Color(0x586C15), // Base
      new Three.Color(0x7E9223), // Intermediate
      new Three.Color(0xADC040),  // Highlight
    );
  
    const material = createToonShader(ramp);
    const wallThickness = this.cellSize * 0.1;
    const group = new Three.Group();
  
    // Define UV scale (e.g., 1 texture repeat per cellSize units)
    const uvScale = 1.0 / this.cellSize; // Adjust as needed for texture density
  
    for (const segment of this.wallSegments) {
      const p1 = segment.p1;
      const p2 = segment.p2;
  
      let geometry: Three.BoxGeometry;
      let position: Three.Vector3;
  
      if (p1.x === p2.x) {
        // Vertical wall (constant x, runs along z)
        const x = p1.x * this.cellSize;
        const z1 = Math.min(p1.y, p2.y) * this.cellSize;
        const z2 = Math.max(p1.y, p2.y) * this.cellSize;
  
        const xMin = x - wallThickness / 2;
        const xMax = x + wallThickness / 2;
  
        const width = xMax - xMin; // Thickness in x
        const height = this.wallHeight; // Height in y
        const depth = z2 - z1; // Length in z
  
        geometry = new Three.BoxGeometry(width, height, depth);
        position = new Three.Vector3(
          (xMin + xMax) / 2,
          this.wallHeight / 2,
          (z1 + z2) / 2
        );
  
        // Adjust UVs
        this.adjustBoxUVs(geometry, width, height, depth, uvScale);
  
      } else if (p1.y === p2.y) {
        // Horizontal wall (constant z, runs along x)
        const z = p1.y * this.cellSize;
        const x1 = Math.min(p1.x, p2.x) * this.cellSize;
        const x2 = Math.max(p1.x, p2.x) * this.cellSize;
  
        const zMin = z - wallThickness / 2;
        const zMax = z + wallThickness / 2;
  
        const width = x2 - x1; // Length in x
        const height = this.wallHeight; // Height in y
        const depth = zMax - zMin; // Thickness in z
  
        geometry = new Three.BoxGeometry(width, height, depth);
        position = new Three.Vector3(
          (x1 + x2) / 2,
          this.wallHeight / 2,
          (zMin + zMax) / 2
        );
  
        // Adjust UVs
        this.adjustBoxUVs(geometry, width, height, depth, uvScale);
      }
  
      geometry.computeVertexNormals();
      const wallMesh = new Three.Mesh(geometry, material);
      wallMesh.position.set(position.x, position.y, position.z);
      group.add(wallMesh);
    }
  
    this.mesh = group;
  }
  
  /** Adjusts UVs for BoxGeometry to prevent texture stretching */
  adjustBoxUVs(
    geometry: Three.BoxGeometry,
    width: number,
    height: number,
    depth: number,
    uvScale: number
  ): void {
    const uvAttribute = geometry.attributes.uv;
  
    // BoxGeometry faces: +x, -x, +y, -y, +z, -z
    // Each face has 4 vertices (2 triangles)
    const uvsPerFace = [
      // +x (right)
      [
        new Three.Vector2(0, 0),
        new Three.Vector2(depth * uvScale, 0),
        new Three.Vector2(0, height * uvScale),
        new Three.Vector2(depth * uvScale, height * uvScale)
      ],
      // -x (left)
      [
        new Three.Vector2(0, 0),
        new Three.Vector2(depth * uvScale, 0),
        new Three.Vector2(0, height * uvScale),
        new Three.Vector2(depth * uvScale, height * uvScale)
      ],
      // +y (top)
      [
        new Three.Vector2(0, 0),
        new Three.Vector2(width * uvScale, 0),
        new Three.Vector2(0, depth * uvScale),
        new Three.Vector2(width * uvScale, depth * uvScale)
      ],
      // -y (bottom)
      [
        new Three.Vector2(0, 0),
        new Three.Vector2(width * uvScale, 0),
        new Three.Vector2(0, depth * uvScale),
        new Three.Vector2(width * uvScale, depth * uvScale)
      ],
      // +z (front)
      [
        new Three.Vector2(0, 0),
        new Three.Vector2(width * uvScale, 0),
        new Three.Vector2(0, height * uvScale),
        new Three.Vector2(width * uvScale, height * uvScale)
      ],
      // -z (back)
      [
        new Three.Vector2(0, 0),
        new Three.Vector2(width * uvScale, 0),
        new Three.Vector2(0, height * uvScale),
        new Three.Vector2(width * uvScale, height * uvScale)
      ]
    ];
  
    // Update UVs
    for (let face = 0; face < 6; face++) {
      const faceUvs = uvsPerFace[face];
      // Each face has 4 vertices (quad, split into 2 triangles)
      const vertexIndices = [face * 4, face * 4 + 1, face * 4 + 2, face * 4 + 3];
  
      vertexIndices.forEach((index, i) => {
        uvAttribute.setXY(index, faceUvs[i].x, faceUvs[i].y);
      });
    }
  
    uvAttribute.needsUpdate = true;
  }
}