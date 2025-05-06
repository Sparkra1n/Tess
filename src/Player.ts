import * as Three from 'three';
import { GameContext, RenderableObject, Plane } from './Types';

export class Player implements RenderableObject {
  position = new Three.Vector3(0, 0, 0);
  velocity = new Three.Vector3(0, 0, 0);
  direction = new Three.Vector3(0, 0, -1);
  rotationY = 0;
  w = 0;
  speed = 0.1;
  jumpSpeed = 0.2;
  gravity = -0.01;
  grounded = true;
  mesh = new Three.Group();
  vertices4D = Player.generateTesseractVertices4D(4);
  wireframe: Three.LineSegments;

  constructor() {
    this.wireframe = this.renderTesseract();
    this.mesh.add(this.wireframe);
    this.mesh.position.copy(this.position);
  }

  static generateTesseractVertices4D(size: number): Three.Vector4[] {
    const half = size / 2;
    const vertices: Three.Vector4[] = [];
    for (let x of [-half, half])
      for (let y of [-half, half])
        for (let z of [-half, half])
          for (let w of [-half, half])
            vertices.push(new Three.Vector4(x, y, z, w));
    return vertices;
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

  projectPerspective4Dto3D(v4: Three.Vector4) {
    const perspectiveD = 3;
    const w = Math.max(-1, Math.min(1, v4.w + this.w));
    const factor = 1 / (perspectiveD - w) || 1;
    return new Three.Vector3(v4.x * factor, v4.y * factor, v4.z * factor).add(this.position);
  }

  createWireframe(vertices3D: Three.Vector3[]): Three.LineSegments {
    const geometry = new Three.BufferGeometry();
    const edges = [];
    const positions = vertices3D.map(v => v.toArray()).flat();
    geometry.setAttribute('position', new Three.Float32BufferAttribute(positions, 3));

    // Tesseract edges for size=1 (distance between adjacent vertices = 1)
    const threshold = 1.01; // Slightly above 1 to account for float precision
    for (let i = 0; i < vertices3D.length; i++) {
      for (let j = i + 1; j < vertices3D.length; j++) {
        const diff = vertices3D[i].clone().sub(vertices3D[j]);
        if (Math.abs(diff.length() - 1) < threshold) edges.push(i, j);
      }
    }

    geometry.setIndex(edges);
    const wireframe = new Three.LineSegments(geometry, new Three.LineBasicMaterial({ color: 0x00ffcc }));

    // Center the wireframe geometry
    geometry.computeBoundingBox();
    const center = new Three.Vector3();
    geometry.boundingBox!.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    return wireframe;
  }

  renderTesseract(): Three.LineSegments {
    const projected = this.vertices4D.map(v => this.projectPerspective4Dto3D(v));
    console.log('Projected vertices:', projected.map(v => v.toArray()));
    return this.createWireframe(projected);
  }

  update(context: GameContext): void {
    for (const key of context.input) {
      switch (key) {
        case 'w':
          this.position.add(this.direction.clone().multiplyScalar(this.speed));
          break;
        case 's':
          this.position.add(this.direction.clone().multiplyScalar(-this.speed));
          break;
        case 'a':
          const left = new Three.Vector3().crossVectors(new Three.Vector3(0, 1, 0), this.direction).normalize();
          this.position.add(left.multiplyScalar(this.speed));
          break;
        case 'd':
          const right = new Three.Vector3().crossVectors(this.direction, new Three.Vector3(0, 1, 0)).normalize();
          this.position.add(right.multiplyScalar(this.speed));
          break;
        case ' ':
          if (this.grounded) {
            this.velocity.y = this.jumpSpeed;
            this.grounded = false;
          }
          break;
      }
    }

    this.direction = new Three.Vector3(Math.sin(this.rotationY), 0, Math.cos(this.rotationY)).normalize();

    this.velocity.y += this.gravity;
    this.position.add(this.velocity);
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.grounded = true;
    }

    //TODO: Don't do this redraw inefficiency nonsense
    this.mesh.remove(this.wireframe);
    this.wireframe = this.renderTesseract();
    this.mesh.add(this.wireframe);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotationY;

    for (const v of this.vertices4D) {
      Player.rotate4D(v, ['x', 'y'], 0.01);
      Player.rotate4D(v, ['y', 'z'], 0.008);
      Player.rotate4D(v, ['x', 'z'], 0.005);
    }
  }

  getMesh(): Three.Object3D {
    return this.mesh;
  }
  //TODO: Add back w implementation
  moveWForward() { this.w += this.speed; }
  moveWBackward() { this.w -= this.speed; }
}
