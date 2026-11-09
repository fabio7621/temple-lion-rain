// 每一幀的更新與畫面尺寸調整
import * as THREE from 'three';
import { FOG_TARGET, KEYS, LION_H, TRAIL } from './config.js';
import { camera, isNarrow, reduced, renderer, scene } from './core/stage.js';
import { Sound } from './audio/sound.js';
import { bgUniforms } from './scene/background.js';
import { floorUniforms } from './scene/floor.js';
import { lanternMat, lanterns } from './scene/lanterns.js';
import { lion, lionReady, lionUniforms, trail } from './scene/lion.js';
import { bloom, composer, gradePass } from './scene/post.js';
import { rainUniforms } from './scene/rain.js';
import { signs } from './scene/signs.js';
import { coneMat, dust } from './scene/spotlight.js';
import { templeLights, templeReady } from './scene/temple.js';
import { railBtns, retEn, retTag, retZh, reticle } from './ui/hud.js';
import { mouse, ndc, plane, ray } from './ui/pointer.js';
import { ease, scrollChapter, sections, stateAt } from './ui/scroll.js';

/* ---------- resize ---------- */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  bgUniforms.uAspect.value = w / h;
  gradePass.uniforms.uRes.value.set(w, h);
}
addEventListener('resize', resize);

/* ---------- loop: one frame, top to bottom ---------- */
const clock = new THREE.Clock();

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  followScroll(dt);
  smoothPointer();

  const S = stateAt(chap);
  const chapterKey = KEYS[S.idx];
  rotateLion(S.yaw, t);
  const focusWorld = locateFocusInWorld(S.tgt);
  const cardSide = getCardSide();

  orbitCamera(S, focusWorld, t);
  shiftViewAwayFromCard(cardSide, dt);
  updateHorizon();

  updateScanner(S, chapterKey, dt);
  updateReticleLabel(S.idx);
  placeReticle(S.settle, chapterKey, cardSide);
  updateTouch(S.dist, focusWorld, dt);

  if (templeReady) {
    clearFog(dt);
    flickerTempleLights(t);
  }
  advanceReveal(dt);
  updateGlitch(S.settle, dt, t);

  updateShaderTime(t);
  updateRainWeather(t);
  swingLanterns(t);
  flickerSigns();

  Sound.update(dt, rainUniforms.uDensity.value, getDimmestSignLevel());
  gradePass.uniforms.uFlash.value = reduced ? Sound.flash * 0.3 : Sound.flash;
  markCurrentChapter(S.idx);

  composer.render(dt);
  requestAnimationFrame(loop);
}

// frame-rate independent easing: `retain` is the share of the gap still left after one second
function dampTo(current, target, retain, dt) {
  return current + (target - current) * (1 - Math.pow(retain, dt));
}

/* ---------- scroll and pointer ---------- */
let chap = 0, lastScrollY = scrollY, scrollVel = 0;

function followScroll(dt) {
  const target = scrollChapter();
  chap = dampTo(chap, target, 0.003, dt);
  if (Math.abs(target - chap) < 1e-4) chap = target;
  scrollVel = scrollVel * 0.9 + Math.abs(scrollY - lastScrollY) * 0.1;
  lastScrollY = scrollY;
}

function smoothPointer() {
  mouse.sx += (mouse.x - mouse.sx) * 0.05;
  mouse.sy += (mouse.y - mouse.sy) * 0.05;
}

/* ---------- statue and camera ---------- */
const focusOnLion = new THREE.Vector3();
const horizonProbe = new THREE.Vector3();
let viewShiftX = 0;

// statue turn: chapter yaw + slow idle sway + a hint of pointer
function rotateLion(yaw, t) {
  lion.rotation.y = yaw + (reduced ? 0 : Math.sin(t * 0.22) * 0.05) + mouse.sx * 0.12;
  lion.updateMatrixWorld();
}

function locateFocusInWorld(localTarget) {
  return focusOnLion.copy(localTarget).applyMatrix4(lion.matrixWorld);
}

function getCardSide() {
  return sections[Math.min(Math.round(chap), sections.length - 1)].dataset.side === 'right' ? -1 : 1;
}

// camera on the +z side, orbiting slightly with the pointer
function orbitCamera(S, focusWorld, t) {
  const az = mouse.sx * 0.08 + (reduced ? 0 : Math.sin(t * 0.07) * 0.03);
  const el = S.el - mouse.sy * 0.04;
  camera.position.set(
    focusWorld.x + Math.sin(az) * Math.cos(el) * S.dist,
    focusWorld.y + Math.sin(el) * S.dist + 0.15,
    focusWorld.z + Math.cos(az) * Math.cos(el) * S.dist);
  camera.lookAt(focusWorld);
}

// shift the statue away from the side the card sits on
function shiftViewAwayFromCard(cardSide, dt) {
  const narrow = isNarrow(), W = innerWidth, H = innerHeight;
  viewShiftX = dampTo(viewShiftX, narrow ? 0 : cardSide * W * 0.09, 0.02, dt);
  camera.setViewOffset(W, H, -viewShiftX, narrow ? H * 0.13 : H * 0.02, W, H);
  camera.updateProjectionMatrix();
}

function updateHorizon() {
  horizonProbe.set(camera.position.x, camera.position.y, camera.position.z - 1000);
  horizonProbe.project(camera);
  bgUniforms.uHorizon.value = THREE.MathUtils.clamp(horizonProbe.y * 0.5 + 0.5, 0.05, 0.95);
}

/* ---------- scanner, pearl glow and reticle for the part being described ---------- */
const focusOnScreen = new THREE.Vector3();
let retIdx = -1;

function updateScanner(S, chapterKey, dt) {
  const scanOn = chapterKey.r ? S.settle : 0;
  const pearlOn = S.idx === 1 ? S.settle : 0;
  lionUniforms.uScan.value = dampTo(lionUniforms.uScan.value, scanOn, 0.02, dt);
  lionUniforms.uFocus.value.fromArray(chapterKey.tgt);
  lionUniforms.uFocusR.value = chapterKey.r || 0.5;
  lionUniforms.uPearlGlow.value = dampTo(lionUniforms.uPearlGlow.value, pearlOn, 0.05, dt);
}

function updateReticleLabel(idx) {
  if (idx === retIdx) return;
  retIdx = idx;
  const sec = sections[idx];
  retZh.textContent = sec.dataset.mark || '';
  retEn.textContent = sec.dataset.markEn || '';
}

function placeReticle(settle, chapterKey, cardSide) {
  focusOnScreen.fromArray(chapterKey.tgt).applyMatrix4(lion.matrixWorld).project(camera);
  const rx = (focusOnScreen.x * 0.5 + 0.5) * innerWidth, ry = (-focusOnScreen.y * 0.5 + 0.5) * innerHeight;
  const opacity = lionReady && chapterKey.r ? Math.max(0, (settle - 0.35) / 0.65) * Math.min(1, revealT) : 0;
  reticle.style.opacity = opacity.toFixed(3);
  reticle.style.transform = `translate(${rx.toFixed(1)}px, ${ry.toFixed(1)}px)`;
  reticle.classList.toggle('flip', shouldFlipReticle(rx, cardSide));
}

function shouldFlipReticle(rx, cardSide) {
  const tagReach = retTag.offsetWidth + 70;
  let flip = !isNarrow() && cardSide < 0;
  if (!flip && rx + tagReach > innerWidth - 16) flip = true;
  if (flip && rx - tagReach < 16) flip = false;
  return flip;
}

/* ---------- touch -> statue-local hit point on a plane through the focus, facing the camera ---------- */
const cameraDirection = new THREE.Vector3();
const lionInverseRotation = new THREE.Quaternion();

function updateTouch(viewDist, focusWorld, dt) {
  camera.getWorldDirection(cameraDirection);
  lionInverseRotation.copy(lion.quaternion).invert();
  lionUniforms.uViewDirL.value.copy(cameraDirection).applyQuaternion(lionInverseRotation).normalize();
  lionUniforms.uTouchR.value = THREE.MathUtils.clamp(viewDist * 0.055, 0.2, 0.62);
  for (let i = 0; i < TRAIL; i++) trail[i].w *= Math.pow(0.22, dt);
  if (!lionReady || !mouse.active || !mouse.moved) return;
  addPointerToTrail(cameraDirection, focusWorld);
  mouse.moved = false;
}

function addPointerToTrail(viewDirection, focusWorld) {
  plane.setFromNormalAndCoplanarPoint(viewDirection.clone().negate(), focusWorld);
  ndc.set(mouse.x, mouse.y);
  ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(plane, mouse.world)) return;
  const local = lion.worldToLocal(mouse.world.clone());
  const travel = local.distanceTo(mouse.last);
  if (travel <= 0.04) return;
  for (let i = TRAIL - 1; i > 0; i--) trail[i].copy(trail[i - 1]);
  trail[0].set(local.x, local.y, local.z, Math.min(0.85, 0.45 + travel * 1.5));
  mouse.last.copy(local);
  if (Math.hypot(local.x, local.z) < 1.5 && local.y > 0 && local.y < LION_H) Sound.scatter(Math.min(1, travel * 3));
}

/* ---------- temple drifts in out of the haze, lanterns flicker ---------- */
function clearFog(dt) {
  scene.fog.density = dampTo(scene.fog.density, FOG_TARGET, 0.05, dt);
}

function flickerTempleLights(t) {
  templeLights.userData.lanterns.forEach((l, i) => {
    l.intensity = (i === 3 ? 25 : i === 2 ? 22 : 14.7) * (0.9 + 0.1 * Math.sin(t * (6 + i) + i * 2.0) * Math.sin(t * 2.3 + i));
  });
}

/* ---------- reveal scan on load ---------- */
let revealT = 0;

function advanceReveal(dt) {
  if (lionReady) revealT = Math.min(1, revealT + dt / (reduced ? 0.4 : 2.6));
  lionUniforms.uReveal.value = ease(revealT);
}

/* ---------- glitch spikes: while turning, on fast scroll, and now and then ---------- */
let glitch = 0, idleGlitchAt = 3, wasTurning = false;

function updateGlitch(settle, dt, t) {
  reactToChapterTurn(settle);
  triggerIdleGlitch(t);
  glitch = Math.max(glitch * Math.pow(0.02, dt), (1 - settle) * 0.22, Math.min(scrollVel / 120, 0.6));
  if (reduced) glitch = 0;
  gradePass.uniforms.uGlitch.value = glitch;
}

function reactToChapterTurn(settle) {
  const isTurning = settle < 0.6;
  if (isTurning && !wasTurning) {
    Sound.turnStart(getYawToNextChapter());
    glitch = Math.max(glitch, 0.45);
  }
  if (!isTurning && wasTurning) Sound.turnEnd();
  wasTurning = isTurning;
}

function getYawToNextChapter() {
  return Math.abs(KEYS[Math.min(Math.floor(chap) + 1, KEYS.length - 1)].yaw - KEYS[Math.floor(chap)].yaw);
}

function triggerIdleGlitch(t) {
  if (t <= idleGlitchAt) return;
  glitch = Math.max(glitch, 0.55);
  idleGlitchAt = t + 6 + Math.random() * 7;
  Sound.glitch();
}

/* ---------- ambient animation ---------- */
function updateShaderTime(t) {
  lionUniforms.uTime.value = t;
  bgUniforms.uTime.value = t;
  bgUniforms.uMouse.value.set(mouse.sx, mouse.sy);
  floorUniforms.uTime.value = t;
  coneMat.uniforms.uTime.value = t;
  dust.material.uniforms.uTime.value = t;
  gradePass.uniforms.uTime.value = t;
}

function updateRainWeather(t) {
  rainUniforms.uTime.value = reduced ? t * 0.35 : t;
  rainUniforms.uWind.value = 0.1 + Math.sin(t * 0.3) * 0.04 + Math.min(scrollVel / 400, 0.15);
  rainUniforms.uDensity.value = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.11));
}

function swingLanterns(t) {
  for (const L of lanterns) {
    L.rotation.z = Math.sin(t * 0.9 + L.userData.ph) * 0.06;
    L.rotation.x = Math.sin(t * 0.7 + L.userData.ph * 1.3) * 0.04;
  }
  lanternMat.uniforms.uDim.value = (0.92 + 0.08 * Math.sin(t * 7.0) * Math.sin(t * 2.3)) * 0.67;
}

function flickerSigns() {
  for (const s of signs) {
    const level = Math.random() < 0.012 ? 0.15 : (Math.random() < 0.03 ? 0.6 : 1);
    s.main.opacity = level;
    s.mirror.opacity = 0.22 * level;
  }
}

function getDimmestSignLevel() {
  return signs.reduce((dimmest, s) => Math.min(dimmest, s.main.opacity), 1);
}

/* ---------- chapter rail ---------- */
let shownIdx = -1;

function markCurrentChapter(idx) {
  if (idx === shownIdx) return;
  shownIdx = idx;
  railBtns.forEach((b, i) => b.setAttribute('aria-current', i === idx ? 'true' : 'false'));
}

export function startLoop() {
  resize();
  requestAnimationFrame(loop);
}
