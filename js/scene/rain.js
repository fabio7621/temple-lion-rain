// 雨（完全在 GPU 上計算）
import * as THREE from 'three';
import { isNarrow, scene } from '../core/stage.js';
import { rainFrag, rainVert } from '../shaders/environment.js';

/* ---------- rain (fully on the GPU) ---------- */
const DROPS = isNarrow() ? 1500 : 3000;
const rainGeo = new THREE.BufferGeometry();
const rPos = new Float32Array(DROPS * 6), rSeed = new Float32Array(DROPS * 8), rEnd = new Float32Array(DROPS * 2);
for (let i = 0; i < DROPS; i++) {
  const s = [Math.random(), Math.random(), Math.random(), Math.random()];
  for (let k = 0; k < 2; k++) { rSeed.set(s, (i * 2 + k) * 4); rEnd[i * 2 + k] = k; }
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
rainGeo.setAttribute('aSeed', new THREE.BufferAttribute(rSeed, 4));
rainGeo.setAttribute('aEnd', new THREE.BufferAttribute(rEnd, 1));
export const rainUniforms = { uTime: { value: 0 }, uWind: { value: 0.12 }, uDensity: { value: 1 } };
const rain = new THREE.LineSegments(rainGeo, new THREE.ShaderMaterial({
  uniforms: rainUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: rainVert,
  fragmentShader: rainFrag
}));
rain.frustumCulled = false;
scene.add(rain);
