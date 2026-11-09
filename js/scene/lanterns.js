// 廟埕上空的紅燈籠
import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { LANTERNS, LZ } from '../config.js';
import { lanternFrag, lanternVert } from '../shaders/environment.js';

/* ---------- red lanterns strung across the courtyard ---------- */
export const lanternXs = [];
export const lanternMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uDim: { value: 1 } },
  vertexShader: lanternVert,
  fragmentShader: lanternFrag
});
const lanternGeo = new THREE.SphereGeometry(1, 20, 14);
const capGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12);
const capMat = new THREE.MeshBasicMaterial({ color: 0x3a1408, fog: false });
export const lanterns = [];
for (let i = 0; i < LANTERNS; i++) {
  const u = i / (LANTERNS - 1), x = -8.5 + u * 17;
  const y = 6.25 - Math.sin(u * Math.PI) * 0.8;
  lanternXs.push(x);
  const g = new THREE.Group();
  const body = new THREE.Mesh(lanternGeo, lanternMat);
  body.scale.set(0.3, 0.36, 0.3);
  const top = new THREE.Mesh(capGeo, capMat); top.position.y = 0.36;
  const bot = new THREE.Mesh(capGeo, capMat); bot.position.y = -0.36;
  g.add(body, top, bot);
  g.position.set(x, y, LZ + Math.sin(i * 2.1) * 0.6);
  g.userData.ph = Math.random() * 6.28;
  scene.add(g); lanterns.push(g);
}
// the string they hang on
{
  const pts = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(new THREE.Vector3(-9.6 + u * 19.2, 6.77 - Math.sin(u * Math.PI) * 0.85, LZ)); }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a1410 }));
  scene.add(line);
}
