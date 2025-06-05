/**
 * @file Maze.ts
 * @brief Contains the maze mesh generator
 * @author Thomas Z.
 * Date: 2025/04/17
 * 
 * Revision History:
 * 
 * 2025/04/17
 * Wrote it - Thomas
 * 
 * 2025/04/17
 * Add in player position for enemy pathfinding - Thomas
 */

import * as Three from "three";

export interface GameContext {
  deltaTime: number;
  input: Set<string>;
  mouse: { 
    x: number;
    y: number; 
    dx: number; 
    dy: number
  };
  playerPosition: Three.Vector3;
}
