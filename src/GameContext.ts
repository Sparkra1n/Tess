/**
 * @file GameContext.ts
 * @brief Contains the game state data
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
 * 
 * 2025/04/17
 * Removed player position since it can be passed to MazeRunner - Thomas
 */

import * as Three from "three";

export interface GameContext {
  deltaTime: number;
  input: Set<string>;
  mouse: {
    x: number;
    y: number;
    dx: number;
    dy: number;
  };
  canEatGhosts: boolean;
}
