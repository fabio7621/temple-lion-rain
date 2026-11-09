// 捲動位置換算成章節，再換算成石獅角度與鏡頭位置
import * as THREE from 'three';
import { camera, isNarrow } from '../core/stage.js';
import { KEYS, LION_H } from '../config.js';

/* ---------- scroll -> chapter position ---------- */
export const sections = [...document.querySelectorAll('.file')];
export function scrollChapter() {
  const y = scrollY + innerHeight * 0.5;
  const mids = sections.map(s => s.offsetTop + s.offsetHeight * 0.5);
  if (y <= mids[0]) return 0;
  for (let i = 0; i < mids.length - 1; i++) {
    if (y < mids[i + 1]) {
      const f = (y - mids[i]) / (mids[i + 1] - mids[i]);
      return i + Math.min(Math.max((f - 0.16) / 0.68, 0), 1);
    }
  }
  return mids.length - 1;
}
export const ease = f => f * f * (3 - 2 * f);
const lerp = (a, b, t) => a + (b - a) * t;
function fitDist() {
  const aspect = innerWidth / innerHeight;
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const narrow = isNarrow();
  const fracH = narrow ? 0.5 : 0.72, fracW = narrow ? 0.8 : 0.42;
  return Math.max(LION_H / (fracH * 2 * tanH), 2.5 / (fracW * 2 * tanH * aspect)) + 1.0;
}
const tgtL = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
export function stateAt(m) {
  const i = Math.min(Math.floor(m), KEYS.length - 2), f = Math.min(m - i, 1), e = ease(f);
  const A = KEYS[i], B = KEYS[i + 1];
  const fd = fitDist();
  // phones are narrow: back the close-ups off so the part still has some context around it
  const mob = Math.min(1.6, Math.max(1, Math.pow(0.75 / (innerWidth / innerHeight), 0.8)));
  const dA = A.dist ? A.dist * mob : fd, dB = B.dist ? B.dist * mob : fd;
  // pull back a little mid-turn so the statue swings through the frame
  const pull = Math.sin(Math.PI * e) * (0.9 + Math.abs(B.yaw - A.yaw) * 0.35);
  tmpA.fromArray(A.tgt); tmpB.fromArray(B.tgt);
  return {
    yaw: lerp(A.yaw, B.yaw, e),
    tgt: tgtL.copy(tmpA).lerp(tmpB, e),
    dist: lerp(dA, dB, e) + pull,
    el: lerp(A.el, B.el, e),
    r: lerp(A.r ?? 0.5, B.r ?? 0.5, e),
    settle: Math.pow(Math.abs(1 - 2 * f), 3),   // 1 when resting on a chapter, 0 mid-transition
    idx: Math.round(m),
  };
}
