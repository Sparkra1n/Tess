/**
 * @file Supervisor.ts
 * @brief Contains the maze enemy AI
 * @author Thomas Z.
 * Date: 2025/06/05
 * 
 * Revision History:
 * 2025/06/05 wrote it (ported from my old C++ tile game) - Thomas
 */

import * as Three from "three";
import { createToonShader, Ramp } from "./ToonShader";
import { RenderableObject } from "./Types";
import { Maze, Point2 } from "./Maze";
import { GameContext } from "./GameContext";

class AStarNode {
  constructor(
    public tile: Point2,
    public parent: AStarNode | null,
    public g: number,
    public h: number
  ) {}

  // Total cost (f = g + h)
  get f(): number {
    return this.g + this.h;
  }
}

export class MazeRunner extends RenderableObject {
  private maze: Maze;
  private speed: number;
  private size: number;
  private target: RenderableObject | null;
  private path: Point2[] = [];
  private currentTargetIndex: number = 0;

  constructor(maze: Maze, speed: number, size: number, target: RenderableObject | null = null) {
    super(new Three.Mesh());
    this.maze = maze;
    this.speed = speed;
    this.size = size;
    this.target = target;

    // const lines = new Three.TextureLoader().load('lines.png');
    // lines.wrapS = Three.RepeatWrapping;
    // lines.wrapT = Three.RepeatWrapping;

    // const dot2 = new Three.TextureLoader().load('dot2.png');
    // dot2.wrapS = Three.RepeatWrapping;
    // dot2.wrapT = Three.RepeatWrapping;

    // const dot3 = new Three.TextureLoader().load('dot3.png');
    // dot3.wrapS = Three.RepeatWrapping;
    // dot3.wrapT = Three.RepeatWrapping;

    // const scratch3 = new Three.TextureLoader().load('scratch3.jpeg');
    // scratch3.wrapS = Three.RepeatWrapping;
    // scratch3.wrapT = Three.RepeatWrapping;
        
    // const ramp = new Ramp(
    //   new Three.Color(0x090A18), // Shadow
    //   new Three.Color(0x353C59), // Base
    //   new Three.Color(0x94A0BF), // Intermediate
    //   new Three.Color(0x94A0BF), // Highlight
    //   //[4, 30, 33, 33], // no shadow
    //   [5, 29, 33, 33],
    //   [lines, null, null, null], // Grunge textures
    //   [new Three.Color(0x050801), null, null, null] // Grunge colors
    // );

    const material = new Three.MeshPhongMaterial({ 
      color: 0x00FF00, 
      shininess: 100,
      emissive: new Three.Color(0x00FF00),
      emissiveIntensity: 0.8 
    });

    this.mesh = new Three.Mesh(
      new Three.SphereGeometry(this.size, 24, 24),
       material
    );
  }

  // Heuristic function using Manhattan distance
  private heuristic(start: Point2, goal: Point2): number {
    return Math.abs(start.x - goal.x) + Math.abs(start.z - goal.z);
  }

  // Reconstruct the path from the goal node
  private reversePath(node: AStarNode | null): Point2[] {
    const path: Point2[] = [];
    let current: AStarNode | null = node;
    while (current) {
      path.push(current.tile);
      current = current.parent;
    }
    return path.reverse();
  }

  // A-star pathfinding to find path to goal
  private getPathToTile(start: Point2, goal: Point2): Point2[] {
    if (!start || !goal) return [];

    // Priority queue for open list, sorted by f-value (g + h)
    const openList: AStarNode[] = [];
    const allNodes: Map<string, AStarNode> = new Map();
    const closedList: Set<string> = new Set();

    const startNode = new AStarNode(start, null, 0, this.heuristic(start, goal));
    openList.push(startNode);
    allNodes.set(`${start.x},${start.z}`, startNode);

    while (openList.length > 0) {
      // Find node with lowest f-value
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;
      closedList.add(`${current.tile.x},${current.tile.z}`);

      // Goal reached
      if (current.tile.x === goal.x && current.tile.z === goal.z) {
        return this.reversePath(current);
      }

      // Get neighbors using Maze's getNeighbors
      const neighbors = this.maze.getNeighbors(current.tile.x, current.tile.z);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.z}`;
        if (closedList.has(neighborKey)) continue;

        const tentativeG = current.g + 1; // Uniform cost of 1 per move
        const hCost = this.heuristic(neighbor, goal);
        const neighborNode = new AStarNode(neighbor, current, tentativeG, hCost);

        const existingNode = allNodes.get(neighborKey);
        if (!existingNode || tentativeG < existingNode.g) {
          allNodes.set(neighborKey, neighborNode);
          openList.push(neighborNode);
        }
      }
    }

    return []; // No path found
  }

  update(context: GameContext) {
    if (!this.target)
      return;

    // Get current and target grid positions
    const currentPos = this.getPosition();
    const targetPos = this.target.getPosition();
    const mazeCellSize = this.maze.getCellSize();

    const gridZ = Math.floor(currentPos.z / mazeCellSize);
    const gridX = Math.floor(currentPos.x / mazeCellSize);
    const targetGridX = Math.floor(targetPos.x / mazeCellSize);
    const targetGridZ = Math.floor(targetPos.z / mazeCellSize);

    // If path is empty or target has moved significantly, recompute path
    if (
      this.path.length === 0 ||
      this.currentTargetIndex >= this.path.length ||
      this.path[this.path.length - 1].x !== targetGridX ||
      this.path[this.path.length - 1].z !== targetGridZ
    ) {
      this.path = this.getPathToTile(
        new Point2(gridX, gridZ),
        new Point2(targetGridX, targetGridZ)
      );
      this.currentTargetIndex = 0;
    }

    // Move toward the next point in the path
    if (this.currentTargetIndex < this.path.length) {
      const nextPoint = this.path[this.currentTargetIndex];
      const targetWorldPos = new Three.Vector3(
        (nextPoint.x + 0.5) * this.maze.getCellSize(),
        currentPos.y,
        (nextPoint.z + 0.5) * this.maze.getCellSize()
      );

      // Calculate direction and movement
      const direction = targetWorldPos.clone().sub(currentPos).normalize();
      const distanceToMove = this.speed * context.deltaTime;
      const newPos = currentPos.clone().add(direction.multiplyScalar(distanceToMove));

      // Check if close enough to the next point
      const distanceToTarget = currentPos.distanceTo(targetWorldPos);
      if (distanceToMove >= distanceToTarget) {
        this.currentTargetIndex++;
        this.mesh.position.copy(targetWorldPos);
      } else {
        this.mesh.position.copy(newPos);
      }
    }
  }
}