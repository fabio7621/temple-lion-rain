// 霓虹招牌
import * as THREE from 'three';
import { scene } from '../core/stage.js';

/* ---------- neon signs (canvas textures) ---------- */
function signTexture(lines, color, glow) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 1024;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const step = 1024 / (lines.length + 0.5);
  lines.forEach((ch, i) => {
    const big = ch.length === 1;
    g.font = `${big ? 700 : 500} ${big ? 190 : 56}px "Noto Sans TC", "PingFang TC", sans-serif`;
    for (const [blur, alpha] of [[48, .9], [18, 1], [0, 1]]) {
      g.shadowColor = glow; g.shadowBlur = blur; g.globalAlpha = alpha;
      g.fillStyle = blur ? glow : color;
      g.fillText(ch, 128, step * (i + 0.75));
    }
  });
  g.globalAlpha = 1; g.shadowBlur = 0; g.strokeStyle = glow; g.lineWidth = 4;
  g.shadowColor = glow; g.shadowBlur = 20; g.strokeRect(14, 10, 228, 1004);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const signs = [];
function makeSign(lines, color, glow, pos, h, boost) {
  const tex = signTexture(lines, color, glow);
  const mk = (mirror) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: mirror ? 0.22 : 1, fog: false });
    mat.color.setScalar(boost * (mirror ? 0.6 : 1));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(h / 4, h), mat);
    m.position.set(pos[0], mirror ? -pos[1] : pos[1], pos[2]);
    if (mirror) m.scale.y = -1;
    scene.add(m); return mat;
  };
  const sg = { main: mk(false), mirror: mk(true), boost };
  signs.push(sg); return sg;
}
function buildSigns() {
  makeSign(['廟', '口', 'TEMPLE'], '#d8fffb', '#2cf2e0', [-13.5, 5.2, -24], 10, 0.8);
  makeSign(['平', '安', 'PING·AN'], '#ffe1ee', '#ff2d84', [15, 6.2, -28], 11, 0.85);
}
(document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 190px "Noto Sans TC"', '廟口平安')]).catch(() => {}) : Promise.resolve()).then(buildSigns);
