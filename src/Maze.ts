/**
 * @file Maze.ts
 * @brief Contains the maze mesh generator
 * @author Thomas Z.
 * Date: 2025/04/17
 * 
 * Revision History:
 * 
 * 2025/04/17
 * Wrote wireframe maze generation with hunt and kill algo - Thomas
 * 
 * 2025/05/14
 * Introduce wall thickness--very much broken in design - Thomas
 * 
 * 2025/05/16
 * Corrected to properly generate thin walls in 3D
 * Referenced maze generation program in C on github reference - Thomas
 * 
 * 2025/05/18
 * Corrected UV scaling issues for grunge textures - Thomas
 * 
 * 2025/05/23
 * Add box colliders to all maze segments - Thomas
 * 
 * 2025/05/25
 * Introduced 2D maze segment lookup system for fast collision detection - Thomas
 * 
 * 2025/06/05
 * Add Pacman-style pellets and lookup system for fast collection - Thomas
 * 
 * 2025/06/06
 * Complete pellet removal - Thomas
 */

import * as Three from 'three';
import { Direction, dx, dy as dz, opposite } from "./Directions.ts";
import { RenderableObject } from "./Types.ts";
import { Ramp, createToonShader } from "./ToonShader.ts"

export type Grid = number[][];

export class Point2 {
  constructor(public x: number, public z: number) {}
}

export class WallSegment {
  constructor(public p1: Point2, public p2: Point2) {}

  static fromCoords(x1: number, z1: number, x2: number, z2: number): WallSegment {
    return new WallSegment(new Point2(x1, z1), new Point2(x2, z2));
  }
}

export class Maze extends RenderableObject {
  private width: number;
  private height: number;
  private cellSize: number;
  private wallHeight: number;
  private wallSegments: WallSegment[] = [];
  private wallBoxes: Three.Box3[] = []; // Array to store wall colliders
  private wallLists: Three.Box3[][][] = []; // Wall spatial lookup
  private grid: Grid;
  private pelletGroup: Three.Group;
  private pelletLists: Three.Mesh[][][];

  constructor(width: number, height: number, cellSize: number, wallHeight: number) {
    super(new Three.Group);
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.wallHeight = wallHeight;
    this.grid = Array.from(Array(height), _ => Array(width).fill(0));
    this.pelletGroup = new Three.Group();
    this.mesh.add(this.pelletGroup);
    this.pelletLists = Array.from(Array(this.height), _ => Array.from(Array(this.width), _ => []));
    this.generateMazeMesh();
  }

  getPelletGroup() : Three.Group {
    return this.pelletGroup;
  }

  private carvePassagesFrom(x: number, z: number): void {
    const directions = [Direction.North, Direction.South, Direction.East, Direction.West]
      .sort(() => Math.random() - 0.5);

    for (const dir of directions) {
      const nx = x + dx(dir);
      const nz = z + dz(dir);

      if (nx >= 0 && nx < this.width && nz >= 0 && nz < this.height && this.grid[nz][nx] === 0) {
        this.grid[z][x] |= dir;
        this.grid[nz][nx] |= opposite(dir);
        this.carvePassagesFrom(nx, nz);
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

    const ramp = new Ramp(
      new Three.Color(0x273214),
      new Three.Color(0x586C15),
      new Three.Color(0x7E9223),
      new Three.Color(0xADC040)
    );

    const material = createToonShader(ramp);
    const wallThickness = this.cellSize * 0.1;
    const group = this.getMesh() as Three.Group;
    const uvScale = 1.0 / this.cellSize;
  
    for (const segment of this.wallSegments) {
      const p1 = segment.p1;
      const p2 = segment.p2;
  
      let geometry: Three.BoxGeometry;
      let position: Three.Vector3;
  
      // Vertical wall
      if (p1.x === p2.x) {
        const x = p1.x * this.cellSize;
        const z1 = Math.min(p1.z, p2.z) * this.cellSize;
        const z2 = Math.max(p1.z, p2.z) * this.cellSize;
  
        const xMin = x - wallThickness / 2;
        const xMax = x + wallThickness / 2;
        const zMin = z1 - wallThickness / 2;
        const zMax = z2 + wallThickness / 2;
  
        const width = xMax - xMin;
        const height = this.wallHeight;
        const depth = zMax - zMin;
  
        geometry = new Three.BoxGeometry(width, height, depth);
        position = new Three.Vector3(
          (xMin + xMax) / 2,
          this.wallHeight / 2,
          (zMin + zMax) / 2
        );
        this.adjustBoxUVs(geometry, width, height, depth, uvScale);
      } 
      
      // Horizontal wall
      else {
        const z = p1.z * this.cellSize;
        const x1 = Math.min(p1.x, p2.x) * this.cellSize;
        const x2 = Math.max(p1.x, p2.x) * this.cellSize;
  
        const zMin = z - wallThickness / 2;
        const zMax = z + wallThickness / 2;
        const xMin = x1 - wallThickness / 2;
        const xMax = x2 + wallThickness / 2;
  
        const width = xMax - xMin;
        const height = this.wallHeight;
        const depth = zMax - zMin;
  
        geometry = new Three.BoxGeometry(width, height, depth);
        position = new Three.Vector3(
          (xMin + xMax) / 2,
          this.wallHeight / 2,
          (zMin + zMax) / 2
        );
        this.adjustBoxUVs(geometry, width, height, depth, uvScale);
      }
  
      geometry.computeVertexNormals();
      const wallMesh = new Three.Mesh(geometry, material);
      wallMesh.position.set(position.x, position.y, position.z);

      const wallBox = new Three.Box3().setFromObject(wallMesh);
      wallMesh.userData.collider = wallBox;
      this.wallBoxes.push(wallBox); // Store the collider
      group.add(wallMesh);
    }

    // Populate the spatial lookup after creating all wall meshes
    this.populateWallLists();
  }

  adjustBoxUVs(geometry: Three.BoxGeometry, width: number, height: number, depth: number, uvScale: number): void {
    const uvAttribute = geometry.attributes.uv;
    const uvsPerFace: Three.Vector2[][] = [];

    for (let i = 0; i < 6; ++i) {
      uvsPerFace.push([
      new Three.Vector2(0, 0),
      new Three.Vector2(width * uvScale, 0),
      new Three.Vector2(0, height * uvScale),
      new Three.Vector2(width * uvScale, height * uvScale)
      ]);
    }

    for (let face = 0; face < 6; face++) {
      const faceUvs = uvsPerFace[face];
      const vertexIndices = [face * 4, face * 4 + 1, face * 4 + 2, face * 4 + 3];
      vertexIndices.forEach((index, i) => {
        uvAttribute.setXY(index, faceUvs[i].x, faceUvs[i].y);
      });
    }
    uvAttribute.needsUpdate = true;
  }

  // Populate the spatial lookup structure
  private populateWallLists(): void {
    this.wallLists = Array.from(Array(this.height), _ => Array.from(Array(this.width), _ => []));

    for (let idx = 0; idx < this.wallSegments.length; idx++) {
      const segment = this.wallSegments[idx];
      const wallBox = this.wallBoxes[idx];

      // East-West wall
      if (segment.p1.x === segment.p2.x) {
        const i = segment.p1.x;
        const start = Math.min(segment.p1.z, segment.p2.z);
        const end = Math.max(segment.p1.z, segment.p2.z);

        // Limit to the wall height (y)
        for (let k = start; k < end; k++) {
          if (i > 0 && k >= 0 && k < this.height) {
            // East wall for cell (i-1, k)
            this.wallLists[k][i - 1].push(wallBox);
          }
          if (i < this.width && k >= 0 && k < this.height) {
            // West wall for cell (i, k)
            this.wallLists[k][i].push(wallBox);
          }
        }
      } 
      
      // North-South wall
      else if (segment.p1.z === segment.p2.z) {
        const j = segment.p1.z;
        const start = Math.min(segment.p1.x, segment.p2.x);
        const end = Math.max(segment.p1.x, segment.p2.x);

        // Limit to the wall height (y)
        for (let k = start; k < end; k++) {
          if (j > 0 && k >= 0 && k < this.width) {
            // South wall for cell (k, j-1)
            this.wallLists[j - 1][k].push(wallBox);
          }
          if (j < this.height && k >= 0 && k < this.width) {
            // North wall for cell (k, j)
            this.wallLists[j][k].push(wallBox);
          }
        }
      }
    }
  }

  // Get nearby wall colliders for a player's position
  public getNearbyWallColliders(playerPos: Three.Vector3, playerSize: number = this.cellSize): Three.Box3[] {
    // Create box collider
    const halfSize = playerSize / 2;
    const minX = playerPos.x - halfSize;
    const maxX = playerPos.x + halfSize;
    const minZ = playerPos.z - halfSize;
    const maxZ = playerPos.z + halfSize;

    const minGridX = Math.max(0, Math.floor(minX / this.cellSize));
    const maxGridX = Math.min(this.width - 1, Math.floor(maxX / this.cellSize));
    const minGridZ = Math.max(0, Math.floor(minZ / this.cellSize));
    const maxGridZ = Math.min(this.height - 1, Math.floor(maxZ / this.cellSize));

    const wallSet = new Array<Three.Box3>();

    for (let gridZ = minGridZ; gridZ <= maxGridZ; gridZ++) {
      for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
        const colliders = this.wallLists[gridZ][gridX];
        for (const collider of colliders) {
          wallSet.push(collider);
        }
      }
    }

    return wallSet;
  }

  public spawnPellets(): void {
    while (this.pelletGroup.children.length > 0)
      this.pelletGroup.remove(this.pelletGroup.children[0]);

    for (const row of this.pelletLists) {
      for (const cell of row) {
        cell.length = 0;
      }
    }

    const pelletRadius = 0.05 * this.cellSize;
    const pelletGeometry = new Three.SphereGeometry(pelletRadius, 8, 8);
    const pelletMaterial = new Three.MeshBasicMaterial({ color: 0xffff00 });

    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        const x = (i + 0.5) * this.cellSize;
        const z = (j + 0.5) * this.cellSize;
        const pos = new Three.Vector3(x, 0, z);
        const gridX = i; // Since x = (i + 0.5) * cellSize, gridX = i
        const gridZ = j;
        const pelletMesh = new Three.Mesh(pelletGeometry, pelletMaterial);
        pelletMesh.position.copy(pos);
        // Store sphere collider in userData
        const sphere = new Three.Sphere(pos.clone(), pelletRadius);
        pelletMesh.userData.sphere = sphere;
        this.pelletGroup.add(pelletMesh);
        this.pelletLists[gridZ][gridX].push(pelletMesh);
      }
    }
  }

  public getNearbyPellets(playerPos: Three.Vector3, playerSize: number = this.cellSize): 
    { sphere: Three.Sphere; mesh: Three.Mesh }[] {
    const halfSize = playerSize / 2;
    const minX = playerPos.x - halfSize;
    const maxX = playerPos.x + halfSize;
    const minZ = playerPos.z - halfSize;
    const maxZ = playerPos.z + halfSize;

    const minGridX = Math.max(0, Math.floor(minX / this.cellSize));
    const maxGridX = Math.min(this.width - 1, Math.floor(maxX / this.cellSize));
    const minGridZ = Math.max(0, Math.floor(minZ / this.cellSize));
    const maxGridZ = Math.min(this.height - 1, Math.floor(maxZ / this.cellSize));

    const pelletColliders: { sphere: Three.Sphere; mesh: Three.Mesh }[] = [];
    for (let gridZ = minGridZ; gridZ <= maxGridZ; gridZ++) {
      for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
        const pellets = this.pelletLists[gridZ][gridX];
        for (const pellet of pellets) {
          const sphere = pellet.userData.sphere;
          if (sphere) {
            pelletColliders.push({ sphere, mesh: pellet });
          }
        }
      }
    }
    return pelletColliders;
  }

  public removePellet(mesh: Three.Mesh): void {
    this.pelletGroup.remove(mesh);
    const gridX = Math.floor(mesh.position.x / this.cellSize);
    const gridZ = Math.floor(mesh.position.z / this.cellSize);
    const cellPellets = this.pelletLists[gridZ][gridX];
    const index = cellPellets.indexOf(mesh);
    if (index !== -1) cellPellets.splice(index, 1);
  }
}