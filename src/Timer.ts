/**
 * @file Timer.ts
 * @brief Contains the game timer for timing and state-related contexts
 * @author Thomas Z.
 * Date: 2025/06/06
 * 
 * Revision History:
 * 
 * 2025/06/06
 * Wrote it - Thomas
 */

interface ITimerElem {
  remaining: number;
  interval: number;
  callback: () => void;
  repeat: boolean;
}

export class Timer {
  private timers: Map<number, ITimerElem>;
  private nextId: number;

  constructor() {
    this.timers = new Map();
    this.nextId = 0;
  }

  /**
   * Adds a timer with a specified interval and callback.
   * @param interval Time in seconds until the callback is called.
   * @param callback Function to call when the timer expires.
   * @param repeat If true, the timer repeats; if false, it runs once.
   * @returns The timer's unique ID.
   */
  addTimer(interval: number, callback: () => void, repeat: boolean = false): number {
    const id = this.nextId++;
    this.timers.set(id, { remaining: interval, interval, callback, repeat });
    return id;
  }

  /**
   * Removes a timer by its ID.
   * @param id The ID of the timer to remove.
   */
  removeTimer(id: number): void {
    this.timers.delete(id);
  }

  /**
   * Updates all timers based on elapsed time.
   * @param deltaTime Time elapsed since the last frame, in seconds.
   */
  update(deltaTime: number): void {
    for (const [id, timer] of this.timers) {
      timer.remaining -= deltaTime;
      if (timer.remaining <= 0) {
        timer.callback();
        if (timer.repeat) {
          timer.remaining += timer.interval;
        } else {
          this.timers.delete(id);
        }
      }
    }
  }
}