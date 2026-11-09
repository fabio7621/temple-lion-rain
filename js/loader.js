// 串流下載 .glb 並更新開場進度條
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const bootEl = document.getElementById('boot'), bootBar = document.getElementById('bootBar'), bootPct = document.getElementById('bootPct');
// stream a .glb in (for the progress bar), then parse it
export async function loadModel(url = 'models/lion.glb', expected = 5520756, progress = true) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch ' + res.status);
  const total = +res.headers.get('content-length') || expected;
  const reader = res.body.getReader(), parts = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); got += value.length;
    if (!progress) continue;
    const k = Math.min(got / total, 1) * 0.9;
    bootBar.style.transform = `scaleX(${k})`; bootPct.textContent = Math.round(k * 100) + '%';
  }
  const buf = await new Blob(parts).arrayBuffer();
  return new Promise((ok, bad) => new GLTFLoader().parse(buf, '', ok, bad));
}
