export enum Direction {
  North = 1,
  South = 2,
  East = 4,
  West = 8
}

export function dx(direction: Direction): number {
  switch (direction) {
    case Direction.East:
      return 1;
    case Direction.West:
      return -1;
    default:
      return 0;
  }
}

export function dz(direction: Direction): number {
  switch (direction) {
    case Direction.North:
      return -1;
    case Direction.South:
      return 1;
    default:
      return 0;
  }
}

export function opposite(direction: Direction): Direction {
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
