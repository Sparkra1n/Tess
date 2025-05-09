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
      && yp <= grid.length
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
      // Skip established nodes
      if (grid[y][x] !== 0)
        continue;

      const neighbors: Direction[] = [];
      if (y > 0 && grid[y - 1][x] !== 0)
        neighbors.push(Direction.North)
      if (x > 0 && grid[y][x - 1] !== 0)
        neighbors.push(Direction.West);
      if (x + 1 < grid[y].length && grid[y][x + 1] !== 0)
        neighbors.push(Direction.East);
      if (y + 1 < grid.length && grid[y + 1][x] !== 0)
        neighbors.push(Direction.South);

      if (neighbors.length > 0) {
        // Choose random node
        const direction = neighbors[Math.floor(Math.random() * neighbors.length)];
        const xp = x + dx(direction);
        const yp = y + dy(direction);
        grid[y][x] |= direction;
        grid[yp][xp] |= opposite(direction);
        return new Point2(x, y);
      }
    }
  }
  return null;
}

function generate(size: Point2): Grid {
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


