/**
 * @file Supervisor.ts
 */

import { Player } from './Player';
import { Stage } from './Stage';
import { GameContext } from './Types';

export class Supervisor {
  player = new Player();
  stage = new Stage();
  input = new Set<string>();
  mouse = { x: 0, y: 0 };

  constructor() {
    window.addEventListener('keydown', (e) => this.input.add(e.key));
    window.addEventListener('keyup', (e) => this.input.delete(e.key));
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    this.stage.addObject(this.player);
    this.stage.setCameraFollow(this.player);
    this.run();
  }

  run() {
    let lastTime = performance.now();
    const loop = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;
      const context: GameContext = { deltaTime, input: this.input, mouse: this.mouse };
      this.stage.update(context);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}


