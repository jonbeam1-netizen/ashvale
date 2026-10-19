// OSRS-style orbit camera: arrow keys / middle-drag rotate, wheel zooms, compass resets north.

import * as THREE from 'three';

export class CameraController {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.yaw = 0;            // 0 = looking north
    this.pitch = 0.82;       // radians above horizontal
    this.dist = 15;
    this.targetDist = 15;
    this.minDist = 5; this.maxDist = 30;
    this.minPitch = 0.32; this.maxPitch = 1.38;
    this.target = new THREE.Vector3();
    this.keys = new Set();
    this.dragging = false;
    this.last = [0, 0];

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.startsWith('Arrow')) { this.keys.add(e.key); e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key));
    window.addEventListener('blur', () => this.keys.clear());
    dom.addEventListener('mousedown', (e) => {
      if (e.button === 1) { this.dragging = true; this.last = [e.clientX, e.clientY]; e.preventDefault(); }
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 1) this.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.last[0], dy = e.clientY - this.last[1];
      this.last = [e.clientX, e.clientY];
      this.yaw -= dx * 0.008;
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.006, this.minPitch, this.maxPitch);
    });
    dom.addEventListener('wheel', (e) => {
      this.targetDist = THREE.MathUtils.clamp(this.targetDist * (e.deltaY > 0 ? 1.12 : 0.89), this.minDist, this.maxDist);
      e.preventDefault();
    }, { passive: false });
  }

  resetNorth() { this.yaw = 0; }

  update(dt, focus) {
    const rs = 2.2 * dt;
    if (this.keys.has('ArrowLeft')) this.yaw -= rs;
    if (this.keys.has('ArrowRight')) this.yaw += rs;
    if (this.keys.has('ArrowUp')) this.pitch = Math.min(this.maxPitch, this.pitch + rs * 0.6);
    if (this.keys.has('ArrowDown')) this.pitch = Math.max(this.minPitch, this.pitch - rs * 0.6);
    this.dist += (this.targetDist - this.dist) * Math.min(1, dt * 10);
    this.target.lerp(focus, Math.min(1, dt * 14));
    const t = this.target;
    const cp = Math.cos(this.pitch);
    // camera sits "south" of the target when yaw = 0 (+Z), looking north (-Z)
    this.camera.position.set(
      t.x + Math.sin(this.yaw) * cp * this.dist,
      t.y + Math.sin(this.pitch) * this.dist,
      t.z + Math.cos(this.yaw) * cp * this.dist,
    );
    this.camera.lookAt(t.x, t.y, t.z);
  }
}
