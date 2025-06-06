/**
 * @file Player.ts
 * @brief Contains the implementation of the maze player.
 * @author Thomas Z.
 * Date: 2025/05/08
 * 
 * Revision History:
 * 2025/05/08
 * wrote it - Thomas
 * 
 * 2025/05/25
 * Add collision checking by implementing the Supervisor class as the observer - Thomas
 * 
 * 2025/06/05
 * Christopher: Change player sprite to resemble pacman
 */

import * as Three from 'three';
import { RenderableObject } from './Types';
import { GameContext } from "./GameContext.ts"
import { Supervisor } from './Supervisor.ts';

export class Player extends RenderableObject {
  private position = new Three.Vector3(0, 0, 0);
  private velocity = new Three.Vector3(0, 0, 0);
  private direction = new Three.Vector3(0, 0, 1);
  private rotation = new Three.Vector3(0, 0, 0);
  private speed = 0.2;
  private jumpSpeed = 0.2;
  private gravity = -0.01;
  private size: number;
  private supervisor: Supervisor;
  private mouthAnimating = true;
  private mouthAnimationTime = 0;
  private mouthAnimationDuration = 0.3; // seconds
  private mouthClosed = false;
  private mouthOpenAngle = Math.PI / 4;
  private mouthClosedAngle = Math.PI / 32;

  constructor(size: number = 3, supervisor: Supervisor) {
    super(new Three.Mesh);
    this.size = size;
    this.supervisor = supervisor;

    // Pac-Man: a yellow sphere with a wedge cut out for the mouth
    const radius = this.size / 2;
    const mouthOpen = Math.PI / 4; // 45 degree mouth
    const geometry = new Three.SphereGeometry(
      radius, // radius
      32,     // width segments
      32,     // height segments
      mouthOpen, // phiStart (start angle)
      2 * Math.PI - 2 * mouthOpen, // phiLength (angle of mouth opening)
      0,      // thetaStart
      Math.PI // thetaLength (full sphere)
    );
    const material = new Three.MeshPhongMaterial({ 
      color: 0xFFFF00, 
      shininess: 100,
      emissive: new Three.Color(0xFF0000),
      emissiveIntensity: 0.8 
    });
    this.mesh = new Three.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.rotation.y = -Math.PI / 2;
    this.mesh.add(this.mesh);
    this.mesh.position.copy(this.position);
  }

  public triggerMouthAnimation() {
    this.mouthAnimating = true;
    this.mouthAnimationTime = 0;
    this.mouthClosed = false;
  }

  getDirection() {
    return this.direction;
  }

  setPosition(x: number, y: number, z: number) : void {
    this.mesh.position.set(x, y, z);
    this.position = new Three.Vector3(x, y, z);
  }

  getPosition() {
    return this.position;
  }

  getRotation() {
    return this.rotation;
  }

  getSize() {
    return this.size;
  }

  getBoundingBoxAt(position: Three.Vector3) {
    const p = position.clone();
    const min = p.clone().add(new Three.Vector3(-this.size/2, -this.size/2, -this.size/2));
    const max = p.clone().add(new Three.Vector3(this.size/2, this.size/2, this.size/2));
    return new Three.Box3(min, max);
  }

  update(context: GameContext): void {
    let D = new Three.Vector3(0, 0, 0);
    if (context.input.has('w')) {
      D.add(this.direction.clone().multiplyScalar(-this.speed));
    }
    if (context.input.has('s')) {
      D.add(this.direction.clone().multiplyScalar(this.speed));
    }
    if (context.input.has('a')) {
      const left = new Three.Vector3().crossVectors(new Three.Vector3(0, 1, 0), this.direction).normalize();
      D.add(left.multiplyScalar(-this.speed));
    }
    if (context.input.has('d')) {
      const right = new Three.Vector3().crossVectors(this.direction, new Three.Vector3(0, 1, 0)).normalize();
      D.add(right.multiplyScalar(-this.speed));
    }

    // Handle horizontal movement with sliding and penetration correction
    let currentPosition = this.position.clone();
    let movement = D.clone();
    const maxIterations = 3;
    let wallPenetrationCorrection = new Three.Vector3(0, 0, 0);

    for (let i = 0; i < maxIterations && movement.lengthSq() > 0; i++) {
      const potentialPosition = currentPosition.clone().add(movement);
      const collisions = this.supervisor.willCollide(potentialPosition);

      if (collisions.length === 0) {
        currentPosition.copy(potentialPosition);
        break;
      }

      let remainingMovement = movement.clone();
      for (const { normal, depth } of collisions) {
        if (normal.y === 1) continue;
        remainingMovement.sub(normal.clone().multiplyScalar(remainingMovement.dot(normal)));
        wallPenetrationCorrection.add(normal.clone().multiplyScalar(depth));
      }

      if (remainingMovement.lengthSq() < 0.0001) {
        break;
      }

      movement = remainingMovement;
    }

    currentPosition.add(movement);
    currentPosition.add(wallPenetrationCorrection.multiplyScalar(0.2));
    this.position.copy(currentPosition);

    // Handle vertical movement
    const potentialVerticalPosition = this.position.clone();
    if (context.input.has(' ')) {
      this.velocity.y = this.jumpSpeed;
    }
    this.velocity.y += this.gravity;
    potentialVerticalPosition.y += this.velocity.y;

    const verticalCollisionInfo = this.supervisor.willCollide(potentialVerticalPosition);
    if (verticalCollisionInfo.length === 0) {
      this.position.y = potentialVerticalPosition.y;
    } else {
      let yCorrection = 0;
      for (const { normal, depth } of verticalCollisionInfo) {
        if (normal.y === 1) {
          yCorrection = Math.max(yCorrection, depth);
        }
      }
      this.velocity.y = 0;
    }

    // Update direction based on rotation
    this.direction = new Three.Vector3(Math.sin(this.rotation.y), 0, Math.cos(this.rotation.y)).normalize();
    this.supervisor.checkPelletIntersection(this.position);

    // Update mesh position and rotation
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation.y;

    // Animate mouth if needed
    if (this.mouthAnimating) {
      this.mouthAnimationTime += context.deltaTime;
      let t = this.mouthAnimationTime / (this.mouthAnimationDuration / 2);
      if (!this.mouthClosed) {
        // Closing
        const angle = this.mouthOpenAngle * (1 - t) + this.mouthClosedAngle * t;
        this.setMouthAngle(angle);
        if (t >= 1) {
          this.mouthClosed = true;
          this.mouthAnimationTime = 0;
        }
      } else {
        // Opening
        const angle = this.mouthClosedAngle * (1 - t) + this.mouthOpenAngle * t;
        this.setMouthAngle(angle);
        if (t >= 1) {
          this.mouthAnimating = false;
          this.setMouthAngle(this.mouthOpenAngle);
        }
      }
    }
  }

  getMesh(): Three.Object3D {
    return this.mesh;
  }

  private setMouthAngle(angle: number) {
    const radius = this.size / 2;
    // Replace geometry with new mouth angle
    const geometry = new Three.SphereGeometry(
      radius,
      32,
      32,
      angle,
      2 * Math.PI - 2 * angle,
      0,
      Math.PI
    );
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
  }
}