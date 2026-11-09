// 石獅：幾何、倒影、溶解粒子
import * as THREE from 'three';
import { DPR, isNarrow, scene } from '../core/stage.js';
import { TRAIL } from '../config.js';
import { lionFrag, lionVert, powderFrag, powderVert } from '../shaders/lion.js';

/* ---------- touch trail (statue-local) ---------- */
export const trail = Array.from({ length: TRAIL }, () => new THREE.Vector4(0, -50, 0, 0));

/* ---------- the lion ---------- */
export const lionUniforms = {
  uTime: { value: 0 }, uReveal: { value: 0 }, uTrail: { value: trail },
  uViewDirL: { value: new THREE.Vector3(0, 0, -1) }, uTouchR: { value: 0.6 },
  uKeyPos: { value: new THREE.Vector3(1.2, 10.0, 1.6) },
  uFocus: { value: new THREE.Vector3(0, -50, 0) }, uFocusR: { value: 0.5 }, uScan: { value: 0 }, uPearlGlow: { value: 0 },
};
const lionMat = new THREE.ShaderMaterial({ uniforms: lionUniforms, vertexShader: lionVert(true), fragmentShader: lionFrag(false), side: THREE.DoubleSide });
const lionMirrorMat = new THREE.ShaderMaterial({ uniforms: lionUniforms, vertexShader: lionVert(false), fragmentShader: lionFrag(true), side: THREE.BackSide });
const powderMat = new THREE.ShaderMaterial({
  uniforms: { ...lionUniforms, uPR: { value: DPR } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: powderVert,
  fragmentShader: powderFrag,
});
export const lion = new THREE.Group();
scene.add(lion);
export let lionReady = false;

export function buildLion(gltf) {
  gltf.scene.updateMatrixWorld(true);
  const meshes = [];
  gltf.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  let tris = 0;
  meshes.forEach(m => { tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
  const V = tris * 3;
  const pos = new Float32Array(V * 3), nor = new Float32Array(V * 3), cen = new Float32Array(V * 3), seed = new Float32Array(V * 4), misc = new Float32Array(V * 2);
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  let o = 0;
  for (const m of meshes) {
    const g = m.geometry, P = g.attributes.position, Nn = g.attributes.normal, C = g.attributes.color, I = g.index;
    const isPearl = /pearl/i.test(m.name) ? 1 : 0;
    nm.getNormalMatrix(m.matrixWorld);
    const tp = new Float32Array(P.count * 3), tn = new Float32Array(P.count * 3), ta = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); tp[i*3] = v.x; tp[i*3+1] = v.y; tp[i*3+2] = v.z;
      v.fromBufferAttribute(Nn, i).applyMatrix3(nm).normalize(); tn[i*3] = v.x; tn[i*3+1] = v.y; tn[i*3+2] = v.z;
      ta[i] = C ? C.getX(i) : 0.7;
    }
    const n = I ? I.count : P.count;
    for (let t = 0; t < n; t += 3) {
      const a = I ? I.getX(t) : t, b = I ? I.getX(t+1) : t+1, c = I ? I.getX(t+2) : t+2;
      const cx = (tp[a*3] + tp[b*3] + tp[c*3]) / 3, cy = (tp[a*3+1] + tp[b*3+1] + tp[c*3+1]) / 3, cz = (tp[a*3+2] + tp[b*3+2] + tp[c*3+2]) / 3;
      const s0 = Math.random(), s1 = Math.random(), s2 = Math.random(), s3 = Math.random();
      for (const k of [a, b, c]) {
        pos[o*3] = tp[k*3]; pos[o*3+1] = tp[k*3+1]; pos[o*3+2] = tp[k*3+2];
        nor[o*3] = tn[k*3]; nor[o*3+1] = tn[k*3+1]; nor[o*3+2] = tn[k*3+2];
        cen[o*3] = cx; cen[o*3+1] = cy; cen[o*3+2] = cz;
        seed[o*4] = s0; seed[o*4+1] = s1; seed[o*4+2] = s2; seed[o*4+3] = s3;
        misc[o*2] = ta[k]; misc[o*2+1] = isPearl;
        o++;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('aCen', new THREE.BufferAttribute(cen, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  geo.setAttribute('aMisc', new THREE.BufferAttribute(misc, 2));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2.1, 0), 4);
  const body = new THREE.Mesh(geo, lionMat), mirror = new THREE.Mesh(geo, lionMirrorMat);
  body.frustumCulled = mirror.frustumCulled = false;
  mirror.renderOrder = 0; body.renderOrder = 2;
  lion.add(mirror, body);

  // powder: one grain per surface triangle (every other one on phones), only drawn while the pointer stirs it
  const every = isNarrow() ? 2 : 1, G = Math.floor(o / 3 / every);
  const gp = new Float32Array(G * 3), gn = new Float32Array(G * 3), gs = new Float32Array(G * 4), ga = new Float32Array(G);
  for (let j = 0; j < G; j++) {
    const vi = j * every * 3;
    gp.set(cen.subarray(vi * 3, vi * 3 + 3), j * 3);
    const nx = nor[vi*3] + nor[vi*3+3] + nor[vi*3+6], ny = nor[vi*3+1] + nor[vi*3+4] + nor[vi*3+7], nz = nor[vi*3+2] + nor[vi*3+5] + nor[vi*3+8];
    const nl = Math.hypot(nx, ny, nz) || 1;
    gn[j*3] = nx / nl; gn[j*3+1] = ny / nl; gn[j*3+2] = nz / nl;
    gs[j*4] = Math.random(); gs[j*4+1] = Math.random(); gs[j*4+2] = Math.random(); gs[j*4+3] = seed[vi*4];
    ga[j] = (misc[vi*2] + misc[vi*2+2] + misc[vi*2+4]) / 3;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(gp, 3));
  pg.setAttribute('aNor', new THREE.BufferAttribute(gn, 3));
  pg.setAttribute('aSeed', new THREE.BufferAttribute(gs, 4));
  pg.setAttribute('aAO', new THREE.BufferAttribute(ga, 1));
  const powder = new THREE.Points(pg, powderMat);
  powder.frustumCulled = false; powder.renderOrder = 3;
  lion.add(powder);
  lionReady = true;
}
