/**
 * @file Directions.js
 * @brief Contains the game direction conventions
 * @author Thomas Z.
 * Date: 2025/04/17
 * 
 * Revision History:
 * 
 * 2025/06/06
 * Rename dy to dz and update sign convention to agree with A-star algo - Thomas
 */

export const Direction = {
  North: 1,
  South: 2,
  East: 4,
  West: 8
};

export function dx(direction){
  switch (direction) {
    case Direction.East:
      return 1;
    case Direction.West:
      return -1;
    default:
      return 0;
  }
}

export function dz(direction){
  switch (direction) {
    case Direction.North:
      return -1;
    case Direction.South:
      return 1;
    default:
      return 0;
  }
}

export function opposite(direction){
  switch (direction) {
    case Direction.North:
      return Direction.South;
    case Direction.South:
      return Direction.North;
    case Direction.West:
      return Direction.East;
    case Direction.East:
      return Direction.West;
  }
}
