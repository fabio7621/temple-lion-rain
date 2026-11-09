// 全畫面背景：霧霾天空、遠方樓群
import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { bgFrag, bgVert } from '../shaders/environment.js';

/* ---------- background: hazy sky, megablocks, a temple roof in the haze, wet ground reflection ---------- */
export const bgUniforms = { uTime: { value: 0 }, uHorizon: { value: 0.5 }, uAspect: { value: innerWidth / innerHeight }, uMouse: { value: new THREE.Vector2() } };
const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: bgUniforms, depthWrite: false, depthTest: false,
  vertexShader: bgVert,
  fragmentShader: bgFrag
}));
bg.frustumCulled = false; bg.renderOrder = -10;
scene.add(bg);
