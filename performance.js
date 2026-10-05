import * as THREE from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';

// Render batching leaves the original meshes available to authoritative raycasts.
export function batchWorld(root) {
  root.updateMatrixWorld(true); const groups = new Map(); let before = 0;
  root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.visible || mesh.isSkinnedMesh || Array.isArray(mesh.material)) return;
    for (let p = mesh; p && p !== root; p = p.parent) if (p.userData.door || p.userData.destructible) return;
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
