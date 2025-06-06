/**
 * @file Supervisor.ts
 * @brief Contains the Game manager class
 * @author Thomas Z.
 * Date: 2025/05/08
 */

import * as Three from "three";
import { Player } from './Player';
import { Stage } from './Stage';
import { Maze } from './Maze';
import { ICollision, ICollisionHandler } from "./Types";
import { MazeRunner } from "./MazeRunner";
import { Timer } from "./Timer";

export class Supervisor implements ICollisionHandler {
  private player = new Player(2, this);
  private stage = new Stage();
  private input = new Set<string>();
  private mouse = { x: 0, y: 0, dx: 0, dy: 0 };
  private mazeWidth: number = 20;
  private mazeHeight: number = 20;
  private cellSize: number = 5;
  private maze: Maze = new Maze(this.mazeWidth, this.mazeHeight, this.cellSize, 3);
  private score: number = 0;
  private timer: Timer;
  private ghosts: MazeRunner[] = [];
  private canEatGhosts: boolean;

  constructor() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.dx = e.movementX || 0;
      this.mouse.dy = e.movementY || 0;
    });

    window.addEventListener('keydown', (e) => {
      this.input.add(e.key)
    });

    window.addEventListener('keyup', (e) => {
      this.input.delete(e.key)
    });

    this.maze.spawnPellets();
    this.stage.addObject(this.maze);
    this.stage.addObject(this.player);

    this.player.setPosition(
      this.mazeWidth * this.cellSize / 2 + this.cellSize / 2,
      1,
      this.mazeHeight * this.cellSize / 2 + this.cellSize / 2
    );

    // Spawn 5 ghosts
    const playerPosition = this.player.getPosition();
    let ghostCount = 0;
    while (ghostCount < 5) {
      const randX = Math.random() * (this.mazeWidth - 1) * this.cellSize + this.cellSize / 2;
      const randZ = Math.random() * (this.mazeHeight - 1) * this.cellSize + this.cellSize / 2;
      if (Math.sqrt(Math.pow(playerPosition.x - randX, 2) + Math.pow(playerPosition.z - randZ, 2)) < 5 * this.cellSize)
        continue;
      const ghost = new MazeRunner(this.maze, 5, 1.5, this.player);
      ghost.setPosition(randX, 1, randZ);
      ++ghostCount;
      this.ghosts.push(ghost);
      this.stage.addObject(ghost);
    }

    this.stage.setCameraFollow(this.player);

    this.timer = new Timer();
    this.canEatGhosts = false;

    // Set up the repeating 15-second timer
    this.timer.addTimer(10, () => {
      this.canEatGhosts = true;
      // Add a one-shot 5-second timer to disable ghost-eating
      this.timer.addTimer(5, () => {
        this.canEatGhosts = false;
      }, false);
    }, true);

    this.run();
  }

  /**
   * 
   * @param position 
   * @returns ICollision[] (empty if no collisions)
   */
  willCollide(position: Three.Vector3): ICollision[] {
    const playerBox = this.player.getBoundingBoxAt(position);
    const collisions: ICollision[] = [];

    // Ground collision
    if (playerBox.min.y < 0) {
      collisions.push({ normal: new Three.Vector3(0, 1, 0), depth: -playerBox.min.y });
    }

    // Wall collisions
    const wallsNearby: Three.Box3[] = this.maze.getNearbyWallColliders(
      this.player.getPosition(),
      this.player.getSize()
    );

    const playerCenter = new Three.Vector3();
    playerBox.getCenter(playerCenter);

    for (const wall of wallsNearby) {
      if (playerBox.intersectsBox(wall)) {
        const wallCenter = new Three.Vector3();
        wall.getCenter(wallCenter);
        // Calculate overlap along x and z axes
        const overlapX = Math.min(playerBox.max.x, wall.max.x) - Math.max(playerBox.min.x, wall.min.x);
        const overlapZ = Math.min(playerBox.max.z, wall.max.z) - Math.max(playerBox.min.z, wall.min.z);

        let normal: Three.Vector3;
        let depth: number;
        if (overlapX < overlapZ) {
          // Collision primarily along x-axis
          const direction = playerCenter.x < wallCenter.x ? -1 : 1;
          normal = new Three.Vector3(direction, 0, 0);
          depth = overlapX;
        }
        else {
          // Collision primarily along z-axis
          const direction = playerCenter.z < wallCenter.z ? -1 : 1;
          normal = new Three.Vector3(0, 0, direction);
          depth = overlapZ;
        }
        collisions.push({ normal, depth });
      }
    }
    return collisions;
  }

  checkPelletIntersection(position: Three.Vector3): void {
    const playerBox = this.player.getBoundingBoxAt(position);
    const pellets = this.maze.getNearbyPellets(this.player.getPosition());

    for (const { sphere, mesh } of pellets) {
      if (playerBox.intersectsSphere(sphere)) {
        this.maze.removePellet(mesh);
        this.score += 10;
        this.player.triggerMouthAnimation();
        const pelletCounterElement = document.getElementById('pelletCounter');
        if (pelletCounterElement)
          pelletCounterElement.textContent = `Score: ${this.score}`;
      }
    }
  }

  run() {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      this.stage.update({
        deltaTime: deltaTime,
        input: this.input,
        mouse: this.mouse,
        canEatGhosts: this.canEatGhosts
      });
      this.mouse.dy = 0;
      this.mouse.dx = 0;
      this.timer.update(deltaTime);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
