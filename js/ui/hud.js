// DOM 介面：章節軌、卡片收合、文字亂碼、鎖定框元素、聲音鈕
import { isNarrow, reduced } from '../core/stage.js';
import { Sound } from '../audio/sound.js';
import { sections } from './scroll.js';

/* ---------- HUD ---------- */
export const railBtns = [...document.querySelectorAll('.rail button')];
railBtns.forEach(b => b.addEventListener('click', () => {
  const s = sections[+b.dataset.go];
  scrollTo({ top: s.offsetTop + s.offsetHeight * 0.5 - innerHeight * 0.5, behavior: reduced ? 'auto' : 'smooth' });
}));
const folds = [...document.querySelectorAll('.fold')];
function setFolded(min) {
  document.documentElement.classList.toggle('cards-min', min);
  folds.forEach(b => { b.textContent = min ? '展開' : '收合'; b.setAttribute('aria-expanded', String(!min)); });
  try { localStorage.setItem('lionrain-min', min ? '1' : '0'); } catch (e) {}
}
let startMin = isNarrow();
try { const v = localStorage.getItem('lionrain-min'); if (v !== null) startMin = v === '1'; } catch (e) {}
setFolded(startMin);
folds.forEach(b => b.addEventListener('click', () => setFolded(!document.documentElement.classList.contains('cards-min'))));

const GLYPHS = '01#%<>/\\=+*ﾊﾐﾋｰｳｼﾅﾓﾆｻ獅廟珠ΔΣ';
function scramble(el) {
  if (reduced || el.dataset.busy) return;
  const final = el.dataset.final || (el.dataset.final = el.textContent);
  el.dataset.busy = '1';
  const len = final.length; const start = performance.now(), dur = 750;
  const tick = (now) => {
    const k = Math.min((now - start) / dur, 1);
    let out = '';
    for (let i = 0; i < len; i++) {
      const reveal = k * len * 1.25 - i * 0.45;
      out += (final[i] === ' ' || reveal > 1) ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (k < 1) requestAnimationFrame(tick); else { el.textContent = final; delete el.dataset.busy; }
  };
  requestAnimationFrame(tick);
}
const io = new IntersectionObserver(es => es.forEach(en => {
  if (en.isIntersecting) en.target.querySelectorAll('.eyebrow span, h1 .glitch, h2 .glitch').forEach(scramble);
}), { threshold: 0.35 });
sections.forEach(s => io.observe(s));

export const retTag = document.querySelector('.reticle .tag');
export const reticle = document.getElementById('reticle'), retZh = document.getElementById('retZh'), retEn = document.getElementById('retEn');

const soundBtn = document.getElementById('soundBtn');
soundBtn.addEventListener('click', () => {
  const v = Sound.toggle();
  soundBtn.setAttribute('aria-pressed', String(v));
  soundBtn.querySelector('.state').textContent = v ? 'ON' : 'OFF';
});
railBtns.forEach(b => b.addEventListener('click', () => Sound.tick()));
folds.forEach(b => b.addEventListener('click', () => Sound.tick()));
