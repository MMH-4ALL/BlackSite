import * as THREE from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';

// Shared low-cost bot presentation from the existing CC0 rifle. Player weapons
// retain their full materials, moving parts, recordings and gameplay statistics.
export function prepareBotWeapon(source) {
  source.updateMatrixWorld(true); const parts = [];
  source.traverse(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld); const color = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).color || new THREE.Color(0x39443d);
    const old = geometry.getAttribute('color'), colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length / 3; i++) { colors[i * 3] = color.r * (old ? old.getX(i) : 1); colors[i * 3 + 1] = color.g * (old ? old.getY(i) : 1); colors[i * 3 + 2] = color.b * (old ? old.getZ(i) : 1); }
    for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal'].includes(name)) geometry.deleteAttribute(name);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); parts.push(geometry);
  });
  const geometry = mergeGeometries(parts, false); parts.forEach(g => g.dispose());
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.86,metalness:.3}));
  mesh.userData.asset = true; mesh.castShadow = true; mesh.name = 'Shared bot rifle'; return mesh;
}

// Render batching leaves the original meshes available to authoritative raycasts.
export function batchWorld(root) {
  root.updateMatrixWorld(true); const groups = new Map(); let before = 0;
  root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.visible || mesh.isSkinnedMesh || Array.isArray(mesh.material)) return;
    for (let p = mesh; p && p !== root; p = p.parent) if (p.userData.door || p.userData.destructible || p.userData.interactive) return;
    if (mesh.userData.ownMaterial || mesh.geometry.morphAttributes.position) return;
    const layout = Object.entries(mesh.geometry.attributes).map(([k, a]) => `${k}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).sort().join('|');
    const key = mesh.material.uuid + ':' + layout; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(mesh); before++;
  });
  let saved = 0;
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map(mesh => { const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone(); geometry.applyMatrix4(mesh.matrixWorld); return geometry; });
    const geometry = mergeGeometries(parts, false); parts.forEach(g => g.dispose()); if (!geometry) continue;
    const combined = new THREE.Mesh(geometry, meshes[0].material); combined.name = 'Batched static world'; combined.receiveShadow = meshes.some(m => m.receiveShadow); combined.castShadow = meshes.some(m => m.castShadow);
    combined.userData.batched = true; root.add(combined); meshes.forEach(mesh => { mesh.visible = false; mesh.updateMatrix(); mesh.matrixAutoUpdate = false; }); saved += meshes.length - 1;
  }
  return { before, after: before - saved, saved };
}
