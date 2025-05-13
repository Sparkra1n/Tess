/**
 * @file Maze.ts
 * @brief Implementation of the Hunt and Kill maze generation algorithm in Typescript
 * Date : 2025/05/08
 */

import { Direction, dx, dy, opposite } from "./Directions.ts"
import { Grid, Point2, WallSegment } from "./Types.ts"

function walk(grid: Grid, point: Point2): Point2 | null {
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
      && yp < grid.length
      && xp < grid[yp].length
      && grid[yp][xp] === 0
    ) {
      grid[point.y][point.x] |= direction;
      grid[yp][xp] |= opposite(direction);
      return new Point2(xp, yp);
    }
  }
  return null;
}

function hunt(grid: Grid): Point2 | null {
  for (let y = 0; y < grid.length; ++y) {
    for (let x = 0; x < grid[y].length; ++x) {
      if (grid[y][x] !== 0) continue;

      const neighbors: Direction[] = [];
      if (y + 1 < grid.length && grid[y + 1][x] !== 0) neighbors.push(Direction.North);
      if (y > 0 && grid[y - 1][x] !== 0) neighbors.push(Direction.South);
      if (x + 1 < grid[y].length && grid[y][x + 1] !== 0) neighbors.push(Direction.East);
      if (x > 0 && grid[y][x - 1] !== 0) neighbors.push(Direction.West);

      if (neighbors.length > 0) {
        const direction = neighbors[Math.floor(Math.random() * neighbors.length)];
        const xp = x + dx(direction);
        const yp = y + dy(direction);
        // Ensure the target cell is within bounds
        if (yp >= 0 && yp < grid.length && xp >= 0 && xp < grid[yp].length) {
          grid[y][x] |= direction;
          grid[yp][xp] |= opposite(direction);
          return new Point2(x, y);
        } else {
          console.warn(`Skipped out-of-bounds access: yp=${yp}, xp=${xp}, direction=${direction}`);
        }
      }
    }
  }
  return null;
}

function generateMaze(size: Point2): Grid {
  const grid: Grid = Array.from(Array(size.y),
    _ => Array(size.x).fill(0));

  let node = new Point2(
    Math.floor(Math.random() * size.x),
    Math.floor(Math.random() * size.y)
  );

  while (true) {
    const walkResult = walk(grid, node);
    if (walkResult) {
      node.x = walkResult.x;
      node.y = walkResult.y;
    }
    else {
      const huntResult = hunt(grid);
      if (huntResult) {
        node.x = huntResult.x;
        node.y = huntResult.y;
      }
      else
        break;
    }
  }
  return grid;
}

function createWallSegments(grid: Grid): WallSegment[] {
  const segments: WallSegment[] = [];
  const w = grid[0].length;
  const h = grid.length;

  // Add boundary walls
  segments.push(WallSegment.fromCoords(0, 0, 0, h)); // Left wall
  segments.push(WallSegment.fromCoords(w, 0, w, h)); // Right wall
  segments.push(WallSegment.fromCoords(0, 0, w, 0)); // Top wall
  segments.push(WallSegment.fromCoords(0, h, w, h)); // Bottom wall

  // Internal vertical walls (between columns)
  for (let i = 1; i < w; i++) {
    let start: number | null = null;
    for (let j = 0; j <= h; j++) {
      if (j < h && (grid[j][i - 1] & Direction.East) === 0) {
        if (start === null)
          start = j;
      }
      else if (start !== null) {
        segments.push(WallSegment.fromCoords(i, start, i, j));
        start = null;
      }
    }
  }

  // Internal horizontal walls (between rows)
  for (let k = 1; k < h; k++) {
    let start: number | null = null;
    for (let i = 0; i <= w; i++) {
      if (i < w && (grid[k - 1][i] & Direction.South) === 0) {
        if (start === null)
          start = i;
      }
      else if (start !== null) {
        segments.push(WallSegment.fromCoords(start, k, i, k));
        start = null;
      }
    }
  }

  return segments;
}

// Generates vertices as a flat array for rendering
export function generateMazeVertices(width: number, height: number): Point2[] {
  const dimensions = new Point2(width, height);
  const grid = generateMaze(dimensions);
  const wallSegments = createWallSegments(grid);
  return wallSegments.flatMap(segment => [segment.p1, segment.p2]);
}
