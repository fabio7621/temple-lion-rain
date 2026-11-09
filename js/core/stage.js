// renderer、scene、camera 與裝置判斷
import * as THREE from 'three';

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isNarrow = () => innerWidth <= 820;
const canvas = document.getElementById('stage');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
export const DPR = Math.min(devicePixelRatio || 1, isNarrow() ? 1.5 : 1.75);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x050404, 1);

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 200);
