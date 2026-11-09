// 濕地面：石板、漣漪、燈光倒影
import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { lanternXs } from './lanterns.js';
import { floorFrag, floorVert } from '../shaders/environment.js';

/* ---------- wet courtyard floor: stone slabs, ripples, light pools ---------- */
export const floorUniforms = { uTime: { value: 0 }, uLx: { value: lanternXs } };
const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 70, 1, 1), new THREE.ShaderMaterial({
  uniforms: floorUniforms, transparent: true, depthWrite: false,
  vertexShader: floorVert,
  fragmentShader: floorFrag
}));
floor.rotation.x = -Math.PI / 2; floor.position.z = -18; floor.renderOrder = 1;
scene.add(floor);
