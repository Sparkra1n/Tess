/**
 * @file Supervisor.js
 * @brief Contains the Game manager class
 * @author Thomas Z.
 * Date: 2025/05/08
 */

import * as Three from "three";
import { Player } from './Player.js';
import { Stage } from './Stage.js';
import { Maze } from './Maze.js';
import { GameState} from "./Types.js";
import { MazeRunner } from "./MazeRunner.js";
import { Timer } from "./Timer.js";

export class Supervisor {

  constructor() {
    this.player = new Player(1, this);
    this.stage = new Stage();
    this.input = new Set();
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0 };
    this.mazeWidth = 20;
    this.mazeHeight = 20;
    this.cellSize = 5;
    this.maze = new Maze(this.mazeWidth, this.mazeHeight, this.cellSize, 3);
    this.score = 0;
    this.ghosts = [];
    this.state = GameState.Start;
    this.scoreToWin = 1000; // Default to easy
    this.pickupSound = new Audio('public/pick_up.wav');
    this.victorySound = new Audio('public/victory.wav');
    this.loseSound = new Audio('public/lose.wav');
    this.upgradeSound = new Audio('public/upgrade.wav');

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

    // Spawn ghosts
    const playerPosition = this.player.getPosition();
    let ghostCount = 0;
    while (ghostCount < 10) {
      const randX = Math.random() * (this.mazeWidth - 1) * this.cellSize + this.cellSize / 2;
      const randZ = Math.random() * (this.mazeHeight - 1) * this.cellSize + this.cellSize / 2;
      if (Math.sqrt(Math.pow(playerPosition.x - randX, 2) + Math.pow(playerPosition.z - randZ, 2)) < 5 * this.cellSize)
        continue;
      const ghost = new MazeRunner(this.maze, 10, 1.5, this.player);
      ghost.setPosition(randX, 1, randZ);
      ++ghostCount;
      this.stage.addObject(ghost);
      this.ghosts.push(ghost);
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

    const startButton = document.getElementById('startButton');
    console.log('Start button element:', startButton);
    if (startButton) {
      startButton.addEventListener('click', () => {
        console.log('Start button clicked');
        const startScreen = document.getElementById('startScreen');
        const difficultyScreen = document.getElementById('difficultyScreen');
        console.log('Start screen:', startScreen);
        console.log('Difficulty screen:', difficultyScreen);
        if (startScreen && difficultyScreen) {
          startScreen.style.display = 'none';
          difficultyScreen.style.display = 'flex';
        }
      });
    }

    const easyButton = document.getElementById('easyButton');
    console.log('Easy button element:', easyButton);
    if (easyButton) {
      easyButton.addEventListener('click', () => {
        console.log('Easy button clicked');
        this.scoreToWin = 1000;
        this.startGame();
      });
    }

    const mediumButton = document.getElementById('mediumButton');
    if (mediumButton) {
      mediumButton.addEventListener('click', () => {
        this.scoreToWin = 3000;
        this.startGame();
      });
    }

    const impossibleButton = document.getElementById('impossibleButton');
    if (impossibleButton) {
      impossibleButton.addEventListener('click', () => {
        this.scoreToWin = 10000;
        this.startGame();
      });
    }

    const restartButton = document.getElementById('restartButton');
    if (restartButton) {
      restartButton.addEventListener('click', () => {
        location.reload();
      });
    }

    this.run();
  }

  startGame() {
    const difficultyScreen = document.getElementById('difficultyScreen');
    const gameScreen = document.getElementById('gameScreen');
    if (difficultyScreen && gameScreen) {
      difficultyScreen.style.display = 'none';
      gameScreen.style.display = 'block';
      this.state = GameState.Playing;
    }
  }

  /**
   * 
   * @param position 
   * @returns ICollision[] (empty if no collisions)
   */
  willCollide(position) {
    const playerBox = this.player.getBoundingBoxAt(position);
    const collisions = [];

    // Ground collision
    if (playerBox.min.y < 0) {
      collisions.push({ normal: new Three.Vector3(0, 1, 0), depth: -playerBox.min.y });
    }

    // Wall collisions
    const wallsNearby = this.maze.getNearbyWallColliders(
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

        let normal;
        let depth;
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

  checkGhostIntersections(position){
    const playerBox = this.player.getBoundingBoxAt(position);
    
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const ghost = this.ghosts[i];
      if (playerBox.intersectsBox(ghost.getBoundingBox())) {
        if (this.canEatGhosts) {
          this.score += 500;
          console.log("eaten");
          this.stage.removeObject(ghost);
          this.ghosts.splice(i, 1);
          this.player.increaseSize(0.15); // Increase size when eating a ghost
          this.upgradeSound.currentTime = 0;
          this.upgradeSound.play();
        }
        else {
          this.endGame(GameState.Lost);
        }
      }
    }
  }

  checkPelletIntersection(position){
    const playerBox = this.player.getBoundingBoxAt(position);
    const pellets = this.maze.getNearbyPellets(this.player.getPosition());

    for (const { sphere, mesh } of pellets) {
      if (playerBox.intersectsSphere(sphere)) {
        this.maze.removePellet(mesh);
        this.score += 10;
        this.player.triggerMouthAnimation();
        this.pickupSound.currentTime = 0;
        this.pickupSound.play();
      }
    }
  }

  endGame(finalState) {
    this.state = finalState;
    document.exitPointerLock();
    const gameScreen = document.getElementById('gameScreen');
    const endScreen = document.getElementById('endScreen');
    const endMessage = document.getElementById('endMessage');
    if (gameScreen && endScreen && endMessage) {
      gameScreen.style.display = 'none';
      endScreen.style.display = 'block';
      endMessage.textContent = finalState === GameState.Won ? 'You Win!' : 'You Lose!';
    }
    if (finalState === GameState.Won) {
      this.victorySound.currentTime = 0;
      this.victorySound.play();
    } else {
      this.loseSound.currentTime = 0;
      this.loseSound.play();
    }
  }


  run() {
    let lastTime = performance.now();

    const loop = (time) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;
      if (this.state === GameState.Playing) {
        this.stage.update({
          deltaTime: deltaTime,
          input: this.input,
          mouse: this.mouse,
          canEatGhosts: this.canEatGhosts
        });
        this.mouse.dy = 0;
        this.mouse.dx = 0;
        this.timer.update(deltaTime);
        const pelletCounterElement = document.getElementById('pelletCounter');
        if (pelletCounterElement)
          pelletCounterElement.textContent = `Score: ${this.score}`;
        if (this.score >= this.scoreToWin) {
          this.endGame(GameState.Won);
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
