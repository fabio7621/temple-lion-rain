// 背景廟宇：材質配色、倒影、燈光
import * as THREE from 'three';
import { isNarrow, scene } from '../core/stage.js';
import { TEMPLE_POS, TEMPLE_SCALE } from '../config.js';

/* ---------- the temple behind the lion ---------- */
// Colours follow a Taiwanese temple at night: grey stone plinth, vermilion walls, jade-glazed roof,
// gilded ridges outlined like LED strips, cut-porcelain dragons in jade, painted blue brackets,
// red lacquer doors with light behind the lattice, glowing lanterns and a burning flame-pearl on the ridge.
scene.fog = new THREE.FogExp2(0x4a1c08, 0.08);
export let templeReady = false;
export const templeLights = new THREE.Group();
scene.add(templeLights);
function templeMaterials() {
  const M = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.6, metalness: 0 }, o));
  return {
    '台基與牆體': M({ vertexColors: true, roughness: 0.5 }),
    '封檐與山牆': M({ color: 0x5c120b, roughness: 0.55 }),
    '屋瓦': M({ color: 0x1d4b40, roughness: 0.3, metalness: 0.15 }),
    '屋脊與戧脊': M({ color: 0x8c6a2c, roughness: 0.4, emissive: 0xff8a3d, emissiveIntensity: 0.32 }),
    '垂脊小龍': M({ color: 0x2f7d6c, roughness: 0.4, emissive: 0x0b4a40, emissiveIntensity: 0.6 }),
    '正脊龍': M({ color: 0x2f7d6c, roughness: 0.4, emissive: 0x0b4a40, emissiveIntensity: 0.6 }),
    '火珠': M({ color: 0xffb347, emissive: 0xff6a12, emissiveIntensity: 2.4 }),
    '斗栱與浮雕': M({ color: 0x2a5878, roughness: 0.55, emissive: 0x06182a, emissiveIntensity: 1 }),
    '暗部': M({ color: 0x050404, roughness: 1 }),
    '燈籠': M({ color: 0xff3b2a, emissive: 0xff2a14, emissiveIntensity: 1.47 }),
    '盤龍柱': M({ color: 0x48534f, roughness: 0.45 }),
    '石獅': M({ color: 0x6e6a63, roughness: 0.55 }),
    '石縫': M({ color: 0x161413, roughness: 0.9 }),
    '門扇與窗櫺': M({ color: 0x4a0d08, roughness: 0.4, emissive: 0xff7a2a, emissiveIntensity: 0.16 }),
    '香爐': M({ color: 0x5c3c1a, roughness: 0.35, metalness: 0.6, emissive: 0x5a1e06, emissiveIntensity: 0.5 }),
  };
}
export function buildTemple(gltf) {
  const mats = templeMaterials();
  const root = gltf.scene;
  root.traverse(o => {
    if (!o.isMesh) return;
    const key = Object.keys(mats).find(k => o.name.includes(k));
    if (!key) return;
    if (key === '台基與牆體') {
      // one mesh holds both the stone plinth and the brick walls: split the colour by height
      const P = o.geometry.attributes.position, col = new Float32Array(P.count * 3);
      const stone = new THREE.Color(0x5a5650), wall = new THREE.Color(0x6e1b12), c = new THREE.Color();
      for (let i = 0; i < P.count; i++) {
        c.copy(P.getY(i) < 1.25 ? stone : wall);
        col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
      }
      o.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    if (o.material && o.material.normalMap) mats[key].normalMap = o.material.normalMap;
    o.material = mats[key];
  });
  root.position.copy(TEMPLE_POS); root.scale.setScalar(TEMPLE_SCALE);
  scene.add(root);
  // its reflection in the wet courtyard (skipped on phones to save the GPU)
  if (!isNarrow()) {
    const mirror = root.clone(true);
    const dim = new Map();
    mirror.traverse(o => {
      if (!o.isMesh) return;
      if (!dim.has(o.material)) {
        const m = o.material.clone();
        m.color.multiplyScalar(0.4); m.emissiveIntensity *= 0.55; m.normalMap = o.material.normalMap;
        dim.set(o.material, m);
      }
      o.material = dim.get(o.material);
    });
    mirror.scale.set(TEMPLE_SCALE, -TEMPLE_SCALE, TEMPLE_SCALE);
    mirror.position.y = -TEMPLE_POS.y;
    scene.add(mirror);
  }
  // lights for the temple only (the lion and the effects use their own shaders)
  const toW = (x, y, z) => new THREE.Vector3(x, y, z).multiplyScalar(TEMPLE_SCALE).add(TEMPLE_POS);
  const hemi = new THREE.HemisphereLight(0x8a4018, 0x08080c, 0.55);
  const teal = new THREE.DirectionalLight(0x2cf2e0, 0.9); teal.position.set(30, 10, -12);
  const pink = new THREE.DirectionalLight(0xff2d84, 0.7); pink.position.set(-30, 8, -16);
  const front = new THREE.DirectionalLight(0xffb070, 0.35); front.position.set(0, 12, 30);
  templeLights.add(hemi, teal, pink, front);
  for (const sx of [-1, 1]) {
    const L = new THREE.PointLight(0xff4a1e, 14.7, 14, 2); L.position.copy(toW(sx * 3.4, 4.2, 4.2));
    templeLights.add(L);
  }
  const altar = new THREE.PointLight(0xff8a3d, 22, 12, 2); altar.position.copy(toW(0, 2.6, 6.5));
  const pearl = new THREE.PointLight(0xff7a1a, 25, 10, 2); pearl.position.copy(toW(0, 9.4, 1.2));
  templeLights.add(altar, pearl);
  templeLights.userData.lanterns = templeLights.children.filter(l => l.isPointLight);
  templeReady = true;
}
