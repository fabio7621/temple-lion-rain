// 打在石獅上的光錐與香塵
import * as THREE from 'three';
import { DPR, scene } from '../core/stage.js';
import { CONE_TOP } from '../config.js';
import { coneFrag, coneVert, dustFrag, dustVert } from '../shaders/environment.js';

/* ---------- volumetric spotlight cone + incense dust ---------- */
export const coneMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: coneVert,
  fragmentShader: coneFrag
});
const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 2.9, CONE_TOP, 56, 1, true), coneMat);
cone.position.set(0, CONE_TOP / 2, -0.1);
scene.add(cone);

const DUST = 700;
const dustGeo = new THREE.BufferGeometry();
const dSeed = new Float32Array(DUST * 4); for (let i = 0; i < dSeed.length; i++) dSeed[i] = Math.random();
dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 4));
export const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uPR: { value: DPR } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: dustVert,
  fragmentShader: dustFrag
}));
dust.frustumCulled = false;
scene.add(dust);
