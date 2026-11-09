// 滑鼠／觸控位置
import * as THREE from 'three';

/* ---------- pointer ---------- */
export const mouse = { x: 0, y: 0, sx: 0, sy: 0, active: false, moved: false, world: new THREE.Vector3(), last: new THREE.Vector3(0, -50, 0) };
export const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane();
function onPointer(e) {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  mouse.active = true; mouse.moved = true;
}
addEventListener('pointermove', onPointer, { passive: true });
addEventListener('pointerdown', onPointer, { passive: true });
addEventListener('pointerleave', () => { mouse.active = false; });
document.addEventListener('mouseleave', () => { mouse.active = false; });
