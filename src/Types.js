/**
 * @file Types.js
 * @author Thomas Z.
 * 2025/04/17
 * wrote it
 */

import * as Three from 'three';

export const GameState = {
  Start: "start",
  Playing: "playing",
  Won: "won",
  Lost: "lost"
}

// Create our virtual base class so we can handle 4D objects like the player
// Methods will be overridden by the player and stuff
export class RenderableObject {

  constructor(mesh) {
    this.mesh = mesh;
  }

  update(context){}

  getMesh() {
    return this.mesh;
  }

  getPosition() {
    return this.mesh.position.clone();
  }

  getRotation() {
    return this.mesh.rotation.toVector3();
  }

  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
  }

  getBoundingBox() {
    // Compute the bounding box of the mesh
    const boundingBox = new Three.Box3().setFromObject(this.mesh);
    return boundingBox;
  }
}