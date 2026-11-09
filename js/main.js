// 入口：場景模組依原本的建立順序載入，再下載模型、啟動主迴圈
import { bootBar, bootEl, bootPct, loadModel } from './loader.js';
import { buildLion } from './scene/lion.js';
import { buildTemple } from './scene/temple.js';
import './scene/background.js';
import './scene/lanterns.js';
import './scene/floor.js';
import './scene/spotlight.js';
import './scene/rain.js';
import './scene/signs.js';
import './scene/post.js';
import './ui/hud.js';
import { Sound } from './audio/sound.js';
import { startLoop } from './loop.js';

loadModel().then((gltf) => {
  buildLion(gltf);
  bootBar.style.transform = 'scaleX(1)'; bootPct.textContent = '100%';
  setTimeout(() => bootEl.classList.add('done'), 250);
  Sound.reveal();
  // the temple comes in second, out of the haze behind the lion
  loadModel('models/temple.glb', 9153940, false).then(buildTemple).catch(() => {});
}).catch(() => { bootPct.textContent = '模型載入失敗，請重新整理'; });

startLoop();
