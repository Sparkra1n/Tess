import * as Three from "three";
import { Player } from './Player';
import { Stage } from './Stage';
import { Maze } from './Maze';
import { StaticMesh } from "./Types";
import { createToonShader, Ramp } from "./ToonShader";

export class Supervisor {
  private player = new Player();
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

    const ramp = new Ramp(
      new Three.Color(0x273214),
      new Three.Color(0x586C15),
      new Three.Color(0x7E9223),
      new Three.Color(0xADC040)
    );

    const sphere = StaticMesh.fromGeometry(new Three.SphereGeometry(3,16,16), createToonShader(ramp));
    sphere.setPosition(-3, 0, -3);
    this.stage.addObject(sphere);
    this.stage.setCameraFollow(this.player);
    this.run();
  }

  run() {
    let lastTime = performance.now();
    const loop = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;
      this.stage.update({
        deltaTime: deltaTime,
        input: this.input,
        mouse: { ...this.mouse }
      });
      this.mouse.dx = 0;
      this.mouse.dy = 0;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}