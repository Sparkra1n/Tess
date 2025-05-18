import * as Three from 'three';
import { Direction, dx, dy, opposite } from "./Directions.ts";
import { StaticMesh } from "./Types.ts";
import { Ramp, createToonShader } from "./ToonShader.ts"
import { GameContext } from "./GameContext.ts"

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

export class Maze extends StaticMesh {
  private width: number;
  private height: number;
  private cellSize: number;
  private wallHeight: number;
  private wallSegments: WallSegment[] = [];
  private grid: Grid;

  constructor(width: number, height: number, cellSize: number, wallHeight: number) {
    const group = new Three.Group();
    super(group);
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.wallHeight = wallHeight;
    this.grid = Array.from(Array(height), _ => Array(width).fill(0));
    this.generateMazeMesh();

    const floorGeometry = new Three.BoxGeometry(
      this.width * this.cellSize,
      1, // height (thickness of the floor)
      this.height * this.cellSize
    );
    const floorMaterial = new Three.MeshStandardMaterial({ color: 0x888888 }); // or your toon shader material
    const floorMesh = new Three.Mesh(floorGeometry, floorMaterial);
    
    // Position it at y = 0 (or slightly under your walls)
    floorMesh.position.set(
      (this.width * this.cellSize) / 2,
      -0.5, // Adjust as needed
      (this.height * this.cellSize) / 2
    );
    
    this.mesh.add(floorMesh);
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

    this.wallSegments.push(WallSegment.fromCoords(0, 0, 0, h));
    this.wallSegments.push(WallSegment.fromCoords(w, 0, w, h));
    this.wallSegments.push(WallSegment.fromCoords(0, 0, w, 0));
    this.wallSegments.push(WallSegment.fromCoords(0, h, w, h));

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

    const material = new Three.MeshStandardMaterial({color: 0x888888});
    const wallThickness = this.cellSize * 0.1;
    const group = this.getMesh() as Three.Group;
    const uvScale = 1.0 / this.cellSize;
  
    for (const segment of this.wallSegments) {
      const p1 = segment.p1;
      const p2 = segment.p2;
  
      let geometry: Three.BoxGeometry;
      let position: Three.Vector3;
  
      if (p1.x === p2.x) {
        // Vertical wall (constant x, spans z)
        const x = p1.x * this.cellSize;
        const z1 = Math.min(p1.y, p2.y) * this.cellSize;
        const z2 = Math.max(p1.y, p2.y) * this.cellSize;
  
        const xMin = x - wallThickness / 2;
        const xMax = x + wallThickness / 2;
        // Extend z extents by wallThickness/2 on each end
        const zMin = z1 - wallThickness / 2;
        const zMax = z2 + wallThickness / 2;
  
        const width = xMax - xMin; // Thickness in x
        const height = this.wallHeight;
        const depth = zMax - zMin; // Extended length in z
  
        geometry = new Three.BoxGeometry(width, height, depth);
        position = new Three.Vector3(
          (xMin + xMax) / 2,      // Center in x
          this.wallHeight / 2,    // Center in y
          (zMin + zMax) / 2       // Center in z
        );
        this.adjustBoxUVs(geometry, width, height, depth, uvScale);
      } else {
        // Horizontal wall (constant z, spans x)
        const z = p1.y * this.cellSize;
        const x1 = Math.min(p1.x, p2.x) * this.cellSize;
        const x2 = Math.max(p1.x, p2.x) * this.cellSize;
  
        const zMin = z - wallThickness / 2;
        const zMax = z + wallThickness / 2;
        // Extend x extents by wallThickness/2 on each end
        const xMin = x1 - wallThickness / 2;
        const xMax = x2 + wallThickness / 2;
  
        const width = xMax - xMin; // Extended length in x
        const height = this.wallHeight;
        const depth = zMax - zMin; // Thickness in z
  
        geometry = new Three.BoxGeometry(width, height, depth);
        position = new Three.Vector3(
          (xMin + xMax) / 2,      // Center in x
          this.wallHeight / 2,    // Center in y
          (zMin + zMax) / 2       // Center in z
        );
        this.adjustBoxUVs(geometry, width, height, depth, uvScale);
      }
  
      geometry.computeVertexNormals();
      const wallMesh = new Three.Mesh(geometry, material);
      wallMesh.position.set(position.x, position.y, position.z);
      group.add(wallMesh);
    }
  }

  adjustBoxUVs(
    geometry: Three.BoxGeometry,
    width: number,
    height: number,
    depth: number,
    uvScale: number
  ): void {
    const uvAttribute = geometry.attributes.uv;
    const uvsPerFace = [
      [
        new Three.Vector2(0, 0),
        new Three.Vector2(depth * uvScale, 0),
        new Three.Vector2(0, height * uvScale),
        new Three.Vector2(depth * uvScale, height * uvScale)
      ],
      [
        new Three.Vector2(0, 0),
        new Three.Vector2(depth * uvScale, 0),
        new Three.Vector2(0, height * uvScale),
        new Three.Vector2(depth * uvScale, height * uvScale)
      ],
      [
        new Three.Vector2(0, 0),
        new Three.Vector2(width * uvScale, 0),
        new Three.Vector2(0, depth * uvScale),
        new Three.Vector2(width * uvScale, depth * uvScale)
      ],
      [
        new Three.Vector2(0, 0),
        new Three.Vector2(width * uvScale, 0),
        new Three.Vector2(0, depth * uvScale),
        new Three.Vector2(width * uvScale, depth * uvScale)
      ],
      [
        new Three.Vector2(0, 0),
        new Three.Vector2(width * uvScale, 0),
        new Three.Vector2(0, height * uvScale),
        new Three.Vector2(width * uvScale, height * uvScale)
      ],
      [
        new Three.Vector2(0, 0),
        new Three.Vector2(width * uvScale, 0),
        new Three.Vector2(0, height * uvScale),
        new Three.Vector2(width * uvScale, height * uvScale)
      ]
    ];

    for (let face = 0; face < 6; face++) {
      const faceUvs = uvsPerFace[face];
      const vertexIndices = [face * 4, face * 4 + 1, face * 4 + 2, face * 4 + 3];
      vertexIndices.forEach((index, i) => {
        uvAttribute.setXY(index, faceUvs[i].x, faceUvs[i].y);
      });
    }
    uvAttribute.needsUpdate = true;
  }
}