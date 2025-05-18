import { Player } from './Player';
import { Stage } from './Stage';
import { Maze } from './Maze';

export class Supervisor {
  private player = new Player();
  private stage = new Stage();
  private input = new Set<string>();
  private mouse = { x: 0, y: 0, movementX: 0, movementY: 0 };
  private maze: Maze = new Maze(50, 50, 5, 2);

  constructor() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.movementX = e.movementX || 0;
      this.mouse.movementY = e.movementY || 0;
    });
    
    window.addEventListener('keydown', (e) => {
      this.input.add(e.key)
    });

    window.addEventListener('keyup', (e) => {
      this.input.delete(e.key)
    });

    this.stage.addObject(this.player);
    this.stage.addObject(this.maze);
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
      this.mouse.movementX = 0;
      this.mouse.movementY = 0;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}