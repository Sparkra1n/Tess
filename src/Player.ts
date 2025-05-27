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
  private grounded = true;
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
    const min = position.clone().add(new Three.Vector3(-this.size/2, -this.size/2, -this.size/2));
    const max = position.clone().add(new Three.Vector3(this.size/2, this.size/2, this.size/2));
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
    let p = this.position;
    for (const key of context.input) {
      switch (key) {
        case 'w':
          p.add(this.direction.clone().multiplyScalar(-this.speed));
          break;
        case 's':
          p.add(this.direction.clone().multiplyScalar(this.speed));
          break;
        case 'a':
          const left = new Three.Vector3().crossVectors(new Three.Vector3(0, 1, 0), this.direction).normalize();
          p.add(left.multiplyScalar(-this.speed));
          break;
        case 'd':
          const right = new Three.Vector3().crossVectors(this.direction, new Three.Vector3(0, 1, 0)).normalize();
          p.add(right.multiplyScalar(-this.speed));
          break;
        case ' ':
          if (this.grounded) {
            this.velocity.y = this.jumpSpeed;
            this.grounded = false;
          }
          break;
      }
      // Why is this line causing
    }
    if (this.supervisor.willCollide(p))
    {
      console.log("collided");
    }
    else
    {
      this.position = p;
      console.log("didn't collide");
    }

    this.direction = new Three.Vector3(Math.sin(this.rotation.y), 0, Math.cos(this.rotation.y)).normalize();

    this.velocity.y += this.gravity;
    this.position.add(this.velocity);
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.grounded = true;
    }

    // Update tesseract projection
    const projected = this.vertices4D.map(v => this.projectPerspective4Dto3D(v));
    const positions = projected.map(v => v.toArray()).flat();
    const geometry = this.wireframe.geometry as Three.BufferGeometry;
    geometry.setAttribute('position', new Three.Float32BufferAttribute(positions, 3));
    geometry.attributes.position.needsUpdate = true;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation.y;

    for (const v of this.vertices4D) {
      Player.rotate4D(v, ['x', 'y'], 0.01);
      Player.rotate4D(v, ['y', 'z'], 0.008);
      Player.rotate4D(v, ['x', 'z'], 0.005);
    }
  }
  getMesh(): Three.Object3D {
    return this.mesh;
  }

  moveWForward() { this.w += this.speed; }
  moveWBackward() { this.w -= this.speed; }
}
