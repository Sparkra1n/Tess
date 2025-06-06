/**
 * @file MazeRunner.ts
 * @brief Contains the ghost enemy pathfinding logic
 * @author Thomas Z.
 * Date: 2025/06/05
 * 
 * Revision History:
 * 2025/06/05
 * Wrote it - Thomas
 * Ported from my own TilePuzzle repo in C++
 * 
 * 2025/06/06 
 * Added debug trails - Thomas
 * Removed debug trails - Thomas
 */

import * as Three from "three";
import { RenderableObject } from "./Types";
import { Maze, Point2 } from "./Maze";
import { GameContext } from "./GameContext";
import { Ramp, createToonShader } from "./ToonShader";

class AStarNode {
  constructor(
    public tile: Point2,
    public parent: AStarNode | null,
    public g: number,
    public f: number
  ) {}
}

export class MazeRunner extends RenderableObject<Three.Mesh> {
  private maze: Maze;
  private speed: number;
  private size: number;
  private target: RenderableObject | null;
  private path: Point2[] = [];
  private currentTargetIndex: number = 0;
  private static normalMaterial: Three.ShaderMaterial;
  private static canBeEatenMaterial: Three.ShaderMaterial;
  private isEatable: boolean;


  constructor(maze: Maze, speed: number, size: number, target: RenderableObject | null = null) {
    const material = new Three.MeshPhongMaterial({ 
      color: 0x00FF00, 
      shininess: 100,
      emissive: new Three.Color(0x00FF00),
      emissiveIntensity: 0.8 
    });
    super(new Three.Mesh());
    this.maze = maze;
    this.speed = speed;
    this.size = size;
    this.target = target;
    this.isEatable = false; 

    let ramp = new Ramp(
      new Three.Color(0xFD8902),
      new Three.Color(0xFFC501),
      new Three.Color(0xFFED5B),
      new Three.Color(0xFEFE7C)
    );

    MazeRunner.normalMaterial = createToonShader(ramp);

    ramp = new Ramp(
      new Three.Color(0x586B1B),
      new Three.Color(0xABBE42),
      new Three.Color(0xABBE42),
      new Three.Color(0xABBE42)
    );
    MazeRunner.canBeEatenMaterial = createToonShader(ramp);

    this.mesh = new Three.Mesh(
      new Three.SphereGeometry(this.size, 24, 24),
      MazeRunner.normalMaterial
    );
  }

  private heuristic(start: Point2, goal: Point2): number {
    return Math.abs(start.x - goal.x) + Math.abs(start.z - goal.z);
  }

  private reversePath(node: AStarNode | null): Point2[] {
    const path: Point2[] = [];
    let current: AStarNode | null = node;
    while (current) {
      path.push(current.tile);
      current = current.parent;
    }
    return path.reverse();
  }

  private getPathToTile(start: Point2, goal: Point2): Point2[] | null {
    const openList: AStarNode[] = [];
    const closedList: Set<string> = new Set();
    const allNodes: Map<string, AStarNode> = new Map();

    const startNode = new AStarNode(start, null, 0, this.heuristic(start, goal));
    const startKey = `${start.x},${start.z}`;
    openList.push(startNode);
    allNodes.set(startKey, startNode);

    while (openList.length > 0) {
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;
      const currentKey = `${current.tile.x},${current.tile.z}`;

      if (current.tile.x === goal.x && current.tile.z === goal.z) {
        return this.reversePath(current);
      }

      closedList.add(currentKey);
      const neighbors = this.maze.getNeighbors(current.tile.x, current.tile.z);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.z}`;
        if (closedList.has(neighborKey)) continue;

        const tentativeG = current.g + 1;
        const hCost = this.heuristic(neighbor, goal);
        const neighborNode = new AStarNode(neighbor, current, tentativeG, hCost);

        const existingNode = allNodes.get(neighborKey);
        if (!existingNode || tentativeG < existingNode.g) {
          allNodes.set(neighborKey, neighborNode);
          openList.push(neighborNode);
        }
      }
    }

    return null; // No path found
  }
  
  getEatableState() {
    return this.isEatable;
  }

  setEatableState(isEatable: boolean) {
    this.isEatable = isEatable;
  }

  update(context: GameContext) {
    if (!this.target) return;

    // errors
    if (context.canEatGhosts)
      this.mesh.material = MazeRunner.canBeEatenMaterial;
    else
      this.mesh.material = MazeRunner.normalMaterial;

    const currentPos = this.getPosition();
    const targetPos = this.target.getPosition();
    const mazeCellSize = this.maze.getCellSize();

    const gridX = Math.floor(currentPos.x / mazeCellSize);
    const gridZ = Math.floor(currentPos.z / mazeCellSize);
    const targetGridX = Math.floor(targetPos.x / mazeCellSize);
    const targetGridZ = Math.floor(targetPos.z / mazeCellSize);

    if (
      this.path.length === 0 ||
      this.currentTargetIndex >= this.path.length ||
      this.path[this.path.length - 1].x !== targetGridX ||
      this.path[this.path.length - 1].z !== targetGridZ
    ) {
      this.path = this.getPathToTile(new Point2(gridX, gridZ), new Point2(targetGridX, targetGridZ)) || [];
      this.currentTargetIndex = 0;
    }

    if (this.currentTargetIndex < this.path.length) {
      const nextPoint = this.path[this.currentTargetIndex];
      const targetWorldPos = new Three.Vector3(
        (nextPoint.x + 0.5) * mazeCellSize,
        currentPos.y,
        (nextPoint.z + 0.5) * mazeCellSize
      );

      const direction = targetWorldPos.clone().sub(currentPos).normalize();
      const distanceToMove = this.speed * context.deltaTime;
      const newPos = currentPos.clone().add(direction.multiplyScalar(distanceToMove));

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