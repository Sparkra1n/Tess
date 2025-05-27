import * as Three from "three";
import { Player } from './Player';
import { Stage } from './Stage';
import { Maze } from './Maze';
import { ICollisionHandler, StaticMesh } from "./Types";
import { createToonShader, Ramp } from "./ToonShader";

export class Supervisor implements ICollisionHandler {
  private player = new Player(3, this);
  private stage = new Stage();
  private input = new Set<string>();
  private mouse = { x: 0, y: 0, dx: 0, dy: 0 };
  private maze: Maze = new Maze(50, 50, 5, 2);

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

    this.stage.addObject(this.maze);
    this.stage.addObject(this.player);

    
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
const ramp = new Ramp(
  new Three.Color(0x273214), // Shadow
  new Three.Color(0x586C15), // Base
  new Three.Color(0x7E9223), // Intermediate
  new Three.Color(0xADC040), // Highlight
  //[4, 30, 33, 33], // no shadow
  [5, 29, 33, 33], // 50% shadow
  [null, null, null, null], // Grunge textures
  [new Three.Color(0x050801), null, null, null] // Grunge colors
);

    this.stage.setCameraFollow(this.player);
    this.run();
  }

  willCollide(position: Three.Vector3): boolean {
    const wallsNearby: Three.Box3[] = this.maze.getNearbyWallColliders(this.player.getPosition(), this.player.getSize());
    const playerPotentialPositionBoundingBox: Three.Box3 = this.player.getBoundingBoxAt(position);
    for (const wall of wallsNearby) {
      if (playerPotentialPositionBoundingBox.intersectsBox(wall))
        return true;
    }
    return false;
  }

  getCollisionNormal(position: Three.Vector3): Three.Vector3 {
    // You could base this on nearest open space or predefined normal map
    return new Three.Vector3(0, 0, 1); // Example: wall facing backward
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