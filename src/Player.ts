/**
 * @file Player.ts
 * @brief Contains the the implementation of the maze player.
 * Date: 2025/05/08
 */

import * as Three from 'three';
import { RenderableObject } from './Types';
import { GameContext } from "./GameContext.ts"
import { Supervisor } from './Supervisor.ts';

type Axis = 'x' | 'y' | 'z' | 'w';
type Plane = [Axis, Axis];

export class Player implements RenderableObject {
  private position = new Three.Vector3(0, 0, 0);
  private velocity = new Three.Vector3(0, 0, 0);
  private direction = new Three.Vector3(0, 0, 1);
  private rotation = new Three.Vector3(0, 0, 0);
  private w = 0;
  private speed = 0.2;
  private jumpSpeed = 0.2;
  private gravity = -0.01;
  private mesh = new Three.Group();
  private vertices4D = this.generateTesseractVertices4D();
  private wireframe: Three.LineSegments;
  private size: number;
  private supervisor: Supervisor;

  constructor(size: number = 3, supervisor: Supervisor) {
    this.size = size;
    this.supervisor = supervisor;
    const initialProjected = this.vertices4D.map(v => this.projectPerspective4Dto3D(v));
    const edges = Player.generateTesseractEdges(this.vertices4D);
    this.wireframe = this.createWireframe(initialProjected, edges);
    this.mesh.add(this.wireframe);
    this.mesh.position.copy(this.position);
  }

  generateTesseractVertices4D(): Three.Vector4[] {
    const half = this.size / 2;
    const vertices: Three.Vector4[] = [];
    for (let x of [-half, half])
      for (let y of [-half, half])
        for (let z of [-half, half])
          for (let w of [-half, half])
            vertices.push(new Three.Vector4(x, y, z, w));
    return vertices;
  }

  static generateTesseractEdges(vertices4D: Three.Vector4[]): number[] {
    const edges: number[] = [];
    for (let i = 0; i < vertices4D.length; i++) {
      for (let j = i + 1; j < vertices4D.length; j++) {
        let diffCount = 0;
        for (const coord of ['x', 'y', 'z', 'w'] as const) {
          if (vertices4D[i][coord] !== vertices4D[j][coord]) diffCount++;
        }
        if (diffCount === 1) edges.push(i, j);
      }
    }
    return edges;
  }

  static rotate4D(v: Three.Vector4, plane: Plane, angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const [a, b] = plane;
    const tempA = v[a];
    const tempB = v[b];
    v[a] = cos * tempA - sin * tempB;
    v[b] = sin * tempA + cos * tempB;
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
    console.log("Box: ", min, ", ", max);
    return new Three.Box3(min, max);
  }

  projectPerspective4Dto3D(v4: Three.Vector4) {
    const perspectiveD = 3;
    const w = Math.max(-1, Math.min(1, v4.w + this.w));
    const factor = 1 / (perspectiveD - w) || 1;
    return new Three.Vector3(v4.x * factor, v4.y * factor, v4.z * factor);
  }

  createWireframe(vertices3D: Three.Vector3[], edges: number[]): Three.LineSegments {
    const geometry = new Three.BufferGeometry();
    const positions = vertices3D.map(v => v.toArray()).flat();
    geometry.setAttribute('position', new Three.Float32BufferAttribute(positions, 3));
    geometry.setIndex(edges);
    return new Three.LineSegments(geometry, new Three.LineBasicMaterial({ color: 0x00ffcc }));
  }

  update(context: GameContext): void {
    // Compute intended horizontal movement vector D
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
    let penetrationCorrection = new Three.Vector3(0, 0, 0);
    
    for (let i = 0; i < maxIterations && movement.lengthSq() > 0; i++) {
      const potentialPosition = currentPosition.clone().add(movement);
      const collisionInfo = this.supervisor.willCollide(potentialPosition);
      
      if (!collisionInfo.collides) {
        currentPosition.copy(potentialPosition);
        break;
      }
      
      // Collect penetration corrections and slide movement
      let remainingMovement = movement.clone();
      for (const { normal, depth } of collisionInfo.collisions) {
        if (normal.y === 1)
          continue; // Skip ground for horizontal movement
        // Slide: Remove movement component along normal
        remainingMovement.sub(normal.clone().multiplyScalar(remainingMovement.dot(normal)));
        // Accumulate correction: Push out along normal by depth
        penetrationCorrection.add(normal.clone().multiplyScalar(depth));
      }
      
      if (remainingMovement.lengthSq() < 0.0001) {
        break;
      }
      
      movement = remainingMovement;
    }

    // Apply movement and penetration correction
    currentPosition.add(movement);
    currentPosition.add(penetrationCorrection.multiplyScalar(0.2));
    this.position.copy(currentPosition);

    // Handle vertical movement
    const potentialVerticalPosition = this.position.clone();
    if (context.input.has(' ')) {
      this.velocity.y = this.jumpSpeed;
    }
    this.velocity.y += this.gravity;
    potentialVerticalPosition.y += this.velocity.y;
    
    const verticalCollisionInfo = this.supervisor.willCollide(potentialVerticalPosition);
    if (!verticalCollisionInfo.collides) {
      this.position.y = potentialVerticalPosition.y;
    } else {
      // Apply vertical penetration correction (for ground)
      let yCorrection = 0;
      for (const { normal, depth } of verticalCollisionInfo.collisions) {
        if (normal.y === 1) {
          yCorrection = Math.max(yCorrection, depth);
        }
      }
      this.position.y += yCorrection;
      this.velocity.y = 0;
    }

    // Update direction based on rotation
    this.direction = new Three.Vector3(Math.sin(this.rotation.y), 0, Math.cos(this.rotation.y)).normalize();

    // Update mesh position
    this.mesh.position.copy(this.position);
    /*
    const projected = this.vertices4D.map(v => this.projectPerspective4Dto3D(v));
    const positions = projected.map(v => v.toArray()).flat();
    const geometry = this.wireframe.geometry as Three.BufferGeometry;
    geometry.setAttribute('position', new Three.Float32BufferAttribute(positions, 3));
    geometry.attributes.position.needsUpdate = true;
    this.mesh.rotation.y = this.rotation.y;
    for (const v of this.vertices4D) {
      Player.rotate4D(v, ['x', 'y'], 0.01);
      Player.rotate4D(v, ['y', 'z'], 0.008);
      Player.rotate4D(v, ['x', 'z'], 0.005);
    }
    */
  }
  getMesh(): Three.Object3D {
    return this.mesh;
  }

  moveWForward() { this.w += this.speed; }
  moveWBackward() { this.w -= this.speed; }
}
