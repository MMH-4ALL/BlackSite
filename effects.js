import * as THREE from 'three';

// Presentation only: these props never participate in actor collision or navigation.
export function createDestructibles(root, map, groundHeight, hitWalls) {
  const positions = map.id === 'zero' ? [[-16, -10], [16, -10], [-5, 22], [5, 22]] : [[-22, 6], [22, 6], [-22, -8], [22, -8]];
  return positions.map(([x, z], i) => {
    const lamp = i % 2 === 0, group = new THREE.Group(); group.position.set(x, groundHeight(x, z), z);
    group.userData.destructible = true; root.add(group);
    const material = new THREE.MeshStandardMaterial({ color: lamp ? 0xb9bda1 : 0x56635c, roughness: .7, emissive: lamp ? 0x7c805c : 0x000000, emissiveIntensity: .35 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(lamp ? .18 : .42, lamp ? .28 : .38, .18), material);
    mesh.position.y = lamp ? 2.4 : .75; mesh.castShadow = false; mesh.userData.ownMaterial = true; group.add(mesh);
    const mount = new THREE.Mesh(new THREE.BoxGeometry(lamp ? .045 : .24, lamp ? 2.3 : .55, .08), new THREE.MeshStandardMaterial({color:0x4e5a53,roughness:1})); mount.position.y=lamp?1.15:.275;mount.userData.ownMaterial=true;group.add(mount);
    const item = { group, mesh, lamp, health: lamp ? 1 : 2, broken: false };
    mesh.userData.destructible = item; hitWalls.push(mesh); return item;
  });
}
export function resetDestructibles(items, hitWalls) {
  for (const item of items) {
    item.broken = false; item.health = item.lamp ? 1 : 2; item.mesh.visible = true;
    item.mesh.material.emissiveIntensity = .35; item.mesh.material.color.set(item.lamp ? 0xb9bda1 : 0x56635c);
    if (!hitWalls.includes(item.mesh)) hitWalls.push(item.mesh);
  }
}
export function damageDestructible(item, hitWalls, debris, position) {
  if (!item || item.broken || --item.health > 0) return false;
  item.broken = true; const index = hitWalls.indexOf(item.mesh); if (index >= 0) hitWalls.splice(index, 1);
  if (item.lamp) { item.mesh.material.emissiveIntensity = 0; item.mesh.material.color.set(0x3b423f); }
  else item.mesh.visible = false;
  debris.spawn(position); return true;
}
export class Debris {
  constructor(scene, quality) { this.scene = scene; this.quality = quality; this.items = []; this.material = new THREE.MeshStandardMaterial({ color: 0x616d62, roughness: 1 }); }
  setQuality(quality) { this.quality = quality; if (quality === 'low') this.clear(); }
  spawn(position) {
    const cap = this.quality === 'low' ? 0 : this.quality === 'high' ? 16 : 8;
    for (let i = 0; i < 3 && cap > 0; i++) {
      while (this.items.length >= cap) this.remove(this.items[0]);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(.055, .05, .035), this.material); mesh.position.copy(position); this.scene.add(mesh);
      this.items.push({ mesh, life: 3, velocity: new THREE.Vector3((Math.random() - .5) * 2, 1 + Math.random(), (Math.random() - .5) * 2) });
    }
  }
  remove(item) { this.scene.remove(item.mesh); item.mesh.geometry.dispose(); const i = this.items.indexOf(item); if (i >= 0) this.items.splice(i, 1); }
  update(dt, floor) {
    for (const item of [...this.items]) {
      item.life -= dt; item.velocity.y -= 9 * dt; item.mesh.position.addScaledVector(item.velocity, dt);
      if (item.mesh.position.y < floor(item.mesh.position.x, item.mesh.position.z) + .03) { item.mesh.position.y = floor(item.mesh.position.x, item.mesh.position.z) + .03; item.velocity.multiplyScalar(.1); }
      item.mesh.rotation.x += dt * 2; if (item.life <= 0) this.remove(item);
    }
  }
  clear() { for (const item of [...this.items]) this.remove(item); }
  dispose() { this.clear(); this.material.dispose(); }
}
export function createAtmosphere(scene, map, quality) {
  const rain = map.id === 'ironwood', dust = map.id === 'helix';
  const count = quality === 'low' ? 0 : rain ? (quality === 'high' ? 120 : 48) : dust ? (quality === 'high' ? 48 : 24) : 0;
  const positions = new Float32Array(count * 3); for (let i = 0; i < count; i++) { positions[i * 3] = (Math.random() - .5) * 48; positions[i * 3 + 1] = .5 + Math.random() * 8; positions[i * 3 + 2] = (Math.random() - .5) * 60; }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: rain ? 0xb3c0c0 : 0xcab994, size: rain ? .055 : .065, transparent: true, opacity: rain ? .24 : .18, depthWrite: false });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false; points.visible = count > 0; scene.add(points);
  return { count, points, update(dt) { if (!count || dt <= 0) return; for (let i = 0; i < count; i++) { positions[i * 3] += dt * (rain ? .4 : .55); positions[i * 3 + 1] -= dt * (rain ? 7 : .07); if (positions[i * 3] > 24) positions[i * 3] = -24; if (positions[i * 3 + 1] < .2) positions[i * 3 + 1] = 8; } geometry.attributes.position.needsUpdate = true; }, dispose() { scene.remove(points); geometry.dispose(); material.dispose(); } };
}
