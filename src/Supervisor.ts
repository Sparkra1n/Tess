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
import { createToonShader, Ramp } from "./ToonShader";

export class Supervisor implements ICollisionHandler
{
  private player = new Player(3, this);
  private stage = new Stage();
  private input = new Set<string>();
  private mouse = { x: 0, y: 0, dx: 0, dy: 0 };
  private maze: Maze = new Maze(50, 50, 5, 2);
  private pelletsEaten: number = 0;

  constructor()
  {
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
    this.player.setPosition(3, 100, 3);
    
    const lines = new Three.TextureLoader().load('lines.png');
    lines.wrapS = Three.RepeatWrapping;
    lines.wrapT = Three.RepeatWrapping;

    const dot2 = new Three.TextureLoader().load('dot2.png');
    dot2.wrapS = Three.RepeatWrapping;
    dot2.wrapT = Three.RepeatWrapping;

    const dot3 = new Three.TextureLoader().load('dot3.png');
    dot3.wrapS = Three.RepeatWrapping;
    dot3.wrapT = Three.RepeatWrapping;

    const scratch3 = new Three.TextureLoader().load('scratch3.jpeg');
    scratch3.wrapS = Three.RepeatWrapping;
    scratch3.wrapT = Three.RepeatWrapping;
    
    
    // const ramp = new Ramp(
    //   new Three.Color(0xD51F2C),
    //   new Three.Color(0xD51F2C),
    //   new Three.Color(0xFE4A49),
    //   new Three.Color(0xFE7974),
    //   [lines, null, null, dot3],
    //   [new Three.Color(0x6A0006), null, null, new Three.Color(0xFFC9C7)]
    // );
// const ramp = new Ramp(
//   new Three.Color(0x273214), // Shadow
//   new Three.Color(0x586C15), // Base
//   new Three.Color(0x7E9223), // Intermediate
//   new Three.Color(0xADC040), // Highlight
//   //[4, 30, 33, 33], // no shadow
//   [5, 29, 33, 33], // 50% shadow
//   [lines, null, null, null], // Grunge textures
//   [new Three.Color(0x050801), null, null, null] // Grunge colors
// );

// const s = new StaticMesh(new Three.Mesh(
//   new Three.SphereGeometry(5, 32, 32),
//   createToonShader(ramp)
// ));
  // this.stage.addObject(s);

  
    // this.floor = new Three.Box3(
    //   new Three.Vector3(0, -1, 0),
    //   new Three.Vector3(50, 0, 50),
    // );
    this.stage.setCameraFollow(this.player);
    this.run();
  }

  /**
   * 
   * @param position 
   * @returns ICollision[] (empty if no collisions)
   */
  willCollide(position: Three.Vector3): ICollision[]
  {
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
    
    for (const {sphere, mesh} of pellets) {
      if (playerBox.intersectsSphere(sphere)) {
        this.maze.removePellet(mesh);
        ++this.pelletsEaten;
        const pelletCounterElement = document.getElementById('pelletCounter');
        if (pelletCounterElement)
          pelletCounterElement.textContent = `Pellets: ${this.pelletsEaten}`;
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
        mouse: this.mouse
      });
      this.mouse.dx = 0;
      this.mouse.dy = 0;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}