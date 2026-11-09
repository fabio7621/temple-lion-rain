// 石獅本體與溶解粒子的外觀
import { LION_H, TRAIL } from '../config.js';
import { DISSOLVE, NOISE } from './common.js';

export const lionVert = (touch) => `
uniform float uTime, uTouchR;
uniform vec4 uTrail[${TRAIL}];
uniform vec3 uViewDirL;
attribute vec3 aCen; attribute vec4 aSeed; attribute vec2 aMisc;
varying vec3 vN; varying vec3 vW; varying vec3 vL; varying float vAO, vHot, vPearl, vSeed;
void main(){
  vec3 c = aCen;
  float hot = 0.0; vec3 disp = vec3(0.0);
  ${touch ? `
  for (int i = 0; i < ${TRAIL}; i++) {
    vec4 tr = uTrail[i];
    vec3 dv = c - tr.xyz;
    float depth = dot(dv, uViewDirL);
    vec3 perp = dv - depth * uViewDirL;
    float fall = smoothstep(uTouchR, 0.0, length(perp)) * tr.w * smoothstep(0.9, 0.2, depth);
    hot += fall;
  }
  hot = clamp(hot, 0.0, 1.0);` : ''}
  vec3 pos = position;
  vL = position;
  vec4 w = modelMatrix * vec4(pos, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  ${touch ? '' : `w.y = -w.y; vN.y = -vN.y; w.x += sin(w.y * 14.0 + uTime * 2.5) * 0.012;`}
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
  vAO = aMisc.x; vPearl = aMisc.y; vHot = hot; vSeed = aSeed.w;
}`;
export const lionFrag = (mirror) => `
uniform float uTime, uReveal, uFocusR, uScan, uPearlGlow;
uniform vec3 uKeyPos, uFocus;
varying vec3 vN; varying vec3 vW; varying vec3 vL; varying float vAO, vHot, vPearl, vSeed;
${NOISE}
${DISSOLVE}
void main(){
  float rv = uReveal * ${(LION_H + 0.6).toFixed(2)} - 0.3;
  if (vL.y > rv) discard;
  float edge = smoothstep(0.14, 0.0, rv - vL.y) * step(uReveal, 0.999);
  float band = 0.0, halo = 0.0;
  ${mirror ? '' : `// touch dissolve: noise below the threshold is gone, a thin band above it burns cyan
  float dn = dissolveN(vL), th = dissolveT(vHot);
  if (dn < th) discard;
  float on = step(0.02, vHot);
  band = (1.0 - smoothstep(0.0, 0.06, dn - th)) * on;
  halo = (1.0 - smoothstep(0.0, 0.3, dn - th)) * on;
  // inside the shell: a hologram lattice shows through the holes
  if (!gl_FrontFacing) {
    vec3 gq = abs(fract(vL * 9.0) - 0.5);
    float lat = max(max(smoothstep(0.44, 0.5, gq.x), smoothstep(0.44, 0.5, gq.y)), smoothstep(0.44, 0.5, gq.z));
    float sweep = smoothstep(0.85, 1.0, fract(vL.y * 1.5 - uTime * 0.9));
    vec3 hc = vec3(0.006, 0.016, 0.02) + vec3(0.1, 0.85, 1.0) * (lat * 0.35 + sweep * 0.18 + lat * sweep * 0.7);
    hc += vec3(0.5, 1.0, 1.0) * band * 1.3;
    gl_FragColor = vec4(hc, 1.0); return;
  }`}
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  // granite: grey with a warm bias, darkened in crevices, fine speckle
  float n1 = vnoise3(vL * 42.0), n2 = vnoise3(vL * 5.0);
  vec3 alb = vec3(0.42, 0.41, 0.4) * (0.18 + 0.9 * vAO * vAO) * (0.78 + 0.38 * n1) * (0.86 + 0.28 * n2);
  // rain: water runs down in streaks, tops stay wetter
  float lane = floor(vL.x * 13.0 + vL.z * 9.0);
  float st = vnoise(vec2(lane * 0.37, vL.y * 1.1 + uTime * (0.25 + 0.2 * hash(vec2(lane, 2.0))) + hash(vec2(lane, 5.0)) * 9.0));
  float wet = clamp(0.45 + 0.5 * smoothstep(0.6, 0.86, st) + max(N.y, 0.0) * 0.3, 0.0, 1.0);
  alb *= mix(1.0, 0.6, wet);
  // warm spotlight from above
  vec3 Lk = normalize(uKeyPos - vW);
  float ndl = dot(N, Lk);
  float diff = max(ndl, 0.0);
  vec3 H = normalize(Lk + V);
  float spec = pow(max(dot(N, H), 0.0), 90.0) * (0.1 + 1.5 * wet) * vAO * vAO;
  vec3 col = alb * (vec3(0.03, 0.038, 0.055) + vec3(1.2, 0.76, 0.48) * pow(diff, 1.3) * 0.95 + vec3(0.05, 0.035, 0.035) * (ndl * 0.5 + 0.5));
  col += vec3(1.0, 0.78, 0.55) * spec * 0.8;
  // neon kickers: teal from screen-right, pink from screen-left, lantern red from behind
  vec3 Nv = normalize((viewMatrix * vec4(N, 0.0)).xyz);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.2);
  col += vec3(0.05, 0.85, 0.9) * fres * max(Nv.x, 0.0) * 0.9 * (0.4 + 0.6 * vAO);
  col += vec3(0.95, 0.1, 0.38) * fres * max(-Nv.x, 0.0) * 0.6 * (0.4 + 0.6 * vAO);
  col += vec3(0.95, 0.16, 0.06) * fres * max(Nv.y, 0.0) * 0.3;
  // rain glints
  float glint = step(0.9986, hash(vec2(vSeed * 913.1, floor(uTime * 8.0))));
  col += vec3(1.6, 1.4, 1.2) * glint * max(diff, 0.35);
  // scanner over the part being described
  float fd = length(vL - uFocus);
  float inF = smoothstep(uFocusR, uFocusR * 0.55, fd) * uScan;
  float lines = smoothstep(0.42, 0.5, abs(fract(vL.y * 9.0 - uTime * 0.5) - 0.5));
  col += vec3(0.08, 0.85, 0.9) * lines * inF * 0.32;
  float ringR = uFocusR * (0.82 + 0.06 * sin(uTime * 2.2));
  col += vec3(0.1, 0.95, 1.0) * smoothstep(0.022, 0.0, abs(fd - ringR)) * uScan * 0.9;
  col *= 1.0 - (1.0 - inF) * uScan * 0.18;
  // the pearl warms up when we talk about it
  col += vec3(1.0, 0.5, 0.16) * vPearl * uPearlGlow * (0.55 + 0.25 * sin(uTime * 2.4)) * (0.4 + diff);
  // dissolve edge: hot cyan rim (bloom picks it up) and a faint scan halo around the hole
  col += vec3(0.05, 0.55, 0.65) * halo * (0.12 + 0.18 * step(0.5, fract(vL.y * 40.0 - uTime * 3.0)));
  col = mix(col, vec3(0.45, 1.0, 1.0) * 1.35, band * 0.85);
  col += vec3(0.2, 1.0, 0.95) * edge * 1.6;
  ${mirror ? 'col *= 0.4;' : ''}
  gl_FragColor = vec4(col, 1.0);
}`;

export const powderVert = `
  uniform float uTime, uTouchR, uPR, uReveal;
  uniform vec4 uTrail[${TRAIL}];
  uniform vec3 uViewDirL;
  attribute vec3 aNor; attribute vec4 aSeed; attribute float aAO;
  varying float vA, vType; varying vec3 vCol;
  ${NOISE}
  ${DISSOLVE}
  void main(){
    vec3 c = position;
    float hot = 0.0;
    for (int i = 0; i < ${TRAIL}; i++) {
      vec4 tr = uTrail[i];
      vec3 dv = c - tr.xyz;
      float depth = dot(dv, uViewDirL);
      vec3 perp = dv - depth * uViewDirL;
      hot += smoothstep(uTouchR, 0.0, length(perp)) * tr.w * smoothstep(0.9, 0.2, depth);
    }
    hot = clamp(hot, 0.0, 1.0);
    float rel = (hot < 0.02) ? 1.0 : dissolveN(c) - dissolveT(hot);   // < 0 dissolved, 0..0.06 burning edge
    if (rel > 0.06 || aSeed.z > 0.5 || c.y > uReveal * ${(LION_H + 0.6).toFixed(2)} - 0.3) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; vCol = vec3(0.0); vType = 0.0; return; }
    float s = aSeed.w, k = uTouchR / 0.6;
    // each grain loops: leaves the surface, climbs, drifts on layered sine waves, fades, respawns
    float life = fract(uTime * (0.22 + 0.4 * aSeed.y) + aSeed.x * 7.0);
    vec3 p = c + aNor * (0.015 + life * 0.1) * k;
    float climb = life * (0.25 + 0.95 * s) * k;
    float stepQ = 0.03 * k;
    p.y += floor(climb / stepQ) * stepQ;
    p.x += (sin(p.y * 6.0 + uTime * 1.3 + s * 9.0) * 0.6 + sin(p.y * 13.0 - uTime * 2.1) * 0.4) * 0.08 * life * k;
    p.z += (cos(p.y * 5.0 + uTime * 1.1 + s * 5.0) * 0.6 + cos(p.y * 11.0 + uTime * 1.7) * 0.4) * 0.08 * life * k;
    vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp((3.0 + aSeed.x * 4.5) * uPR * clamp(9.0 / -mv.z, 0.7, 1.6) / (1.0 + life * 1.6), 1.0 * uPR, 9.0 * uPR);
    float pick = fract(s * 13.7);
    vCol = pick < 0.6 ? vec3(0.25, 1.0, 1.0) : (pick < 0.86 ? vec3(0.85, 1.0, 1.0) : (pick < 0.95 ? vec3(1.0, 0.62, 0.25) : vec3(1.0, 0.25, 0.6)));
    vType = floor(fract(s * 7.31) * 3.0);
    vA = pow(1.0 - life, 1.3) * smoothstep(0.02, 0.15, hot) * mix(0.35, 1.0, smoothstep(-0.15, 0.0, rel));
  }`;

export const powderFrag = `varying float vA, vType; varying vec3 vCol;
  void main(){
    vec2 a = abs(gl_PointCoord - 0.5); float m = max(a.x, a.y);
    float shape = vType < 0.5 ? step(m, 0.34)                                  // solid pixel
                : vType < 1.5 ? step(m, 0.46) * step(0.3, m)                    // hollow frame
                : step(min(a.x, a.y), 0.1) * step(m, 0.46);                     // plus
    if (shape < 0.5) discard;
    gl_FragColor = vec4(vCol * vA * 0.95, 1.0);
  }`;
