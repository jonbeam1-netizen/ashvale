// Particle effects and projectiles. Triggered via game.spawnEffect(kind, at, opts):
//   'levelup'    fireworks around an entity
//   'sparkle'    small burst {color}
//   'splash'     magic splash (blue) on a target
//   'teleport'   rising column {color}
//   'projectile' flying orb/arrow: at = source entity, opts {to: target entity, color, ms, size, arc}

import * as THREE from 'three';

const GEO = new THREE.IcosahedronGeometry(1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3();

export class Effects {
  constructor(rm) {
    this.rm = rm;
    this.group = new THREE.Group();
    rm.scene.add(this.group);
    this.particles = [];
    this.projectiles = [];
    rm.game.events.on('effect', (e) => this.spawn(e.kind, e.at, e));
  }

  posOf(at, out) {
    if (!at) return out.set(0, 0, 0);
    const v = at.uid != null ? this.rm.viewFor(at) : null;
    if (v) return out.copy(v.pos).add(new THREE.Vector3(0, v.rig.height * 0.6, 0));
    const w = this.rm.game.world;
    return out.set(at.x + 0.5, w.tileCenterHeight(at.x, at.y) + 0.5, at.y + 0.5);
  }

  particle(pos, vel, color, life, size, gravity = -3) {
    const m = new THREE.Mesh(GEO, new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.position.copy(pos);
    m.scale.setScalar(size);
    this.group.add(m);
    this.particles.push({ m, vel, life, max: life, gravity, size });
  }

  spawn(kind, at, o = {}) {
    const p = this.posOf(at, new THREE.Vector3());
    switch (kind) {
      case 'levelup': {
        const cols = [0xffd040, 0xff5050, 0x50ff80, 0x60a0ff, 0xff80ff];
        for (let burst = 0; burst < 3; burst++) {
          setTimeout(() => {
            const c = this.posOf(at, new THREE.Vector3()).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.4 + Math.random(), (Math.random() - 0.5) * 1.5));
            for (let i = 0; i < 24; i++) {
              const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(1.5 + Math.random() * 1.5);
              this.particle(c, d, cols[(burst + i) % cols.length], 1.1, 0.05, -2);
            }
          }, burst * 350);
        }
        break;
      }
      case 'sparkle':
        for (let i = 0; i < 14; i++) this.particle(p, new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2), o.color ?? 0xffffff, 0.7, 0.04);
        break;
      case 'splash':
        for (let i = 0; i < 16; i++) this.particle(p, new THREE.Vector3((Math.random() - 0.5) * 2.5, Math.random() * 2.5, (Math.random() - 0.5) * 2.5), o.color ?? 0x4a8aff, 0.6, 0.05);
        break;
      case 'teleport':
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI * 2;
          this.particle(p.clone().add(new THREE.Vector3(Math.cos(a) * 0.5, -0.5, Math.sin(a) * 0.5)), new THREE.Vector3(0, 1.5 + Math.random() * 2, 0), o.color ?? 0xb080ff, 1.2, 0.05, 0);
        }
        break;
      case 'projectile': {
        const m = new THREE.Mesh(GEO, new THREE.MeshBasicMaterial({ color: o.color ?? 0xffffff }));
        m.scale.setScalar(o.size ?? 0.09);
        this.group.add(m);
        this.projectiles.push({ m, from: at, to: o.to, t: 0, ms: o.ms ?? 600, arc: o.arc ?? 0.6, color: o.color ?? 0xffffff });
        break;
      }
      default: break;
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.group.remove(p.m); p.m.material.dispose(); this.particles.splice(i, 1); continue; }
      p.vel.y += p.gravity * dt;
      p.m.position.addScaledVector(p.vel, dt);
      p.m.material.opacity = Math.min(1, p.life / p.max * 1.5);
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.t += (dt * 1000) / pr.ms;
      if (pr.t >= 1) { this.group.remove(pr.m); pr.m.material.dispose(); this.projectiles.splice(i, 1); continue; }
      this.posOf(pr.from, _a); this.posOf(pr.to, _b);
      pr.m.position.lerpVectors(_a, _b, pr.t);
      pr.m.position.y += Math.sin(pr.t * Math.PI) * pr.arc;
      if (Math.random() < 0.5) this.particle(pr.m.position, new THREE.Vector3(0, 0.2, 0), pr.color, 0.25, 0.03, 0);
    }
  }
}
