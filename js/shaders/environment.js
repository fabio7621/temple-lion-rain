// 天空、燈籠、地面、光錐、香塵、雨的外觀
import { CONE_TOP, LANTERNS, LZ } from '../config.js';
import { NOISE } from './common.js';

export const bgVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`;

export const bgFrag = `
  uniform float uTime, uHorizon, uAspect; uniform vec2 uMouse;
  varying vec2 vUv;
  ${NOISE}
  // temple hall with a swallow-tail ridge, seen through the haze
  float temple(vec2 q){
    float ax = abs(q.x);
    float body = step(ax, 0.36) * step(q.y, 0.085) * step(-0.2, q.y);
    float k = clamp(ax / 0.5, 0.0, 1.0);
    float eave = 0.072 + 0.05 * pow(k, 4.0);
    float top = mix(0.175, 0.13, pow(k, 1.6));
    float roof = step(ax, 0.5) * step(eave, q.y) * step(q.y, top);
    float ridge = step(ax, 0.34) * step(abs(q.y - 0.182), 0.009);
    float tx = clamp((ax - 0.3) / 0.15, 0.0, 1.0);
    float tail = step(0.3, ax) * step(ax, 0.45) * step(abs(q.y - (0.18 + tx * tx * 0.075)), 0.008 * (1.0 - tx * 0.6));
    float tail2 = step(0.36, ax) * step(ax, 0.44) * step(abs(q.y - (0.176 + (ax - 0.36) * 0.35 + pow(max(ax - 0.36, 0.0) * 9.0, 2.0) * 0.012)), 0.005);
    float pearl = step(length(q - vec2(0.0, 0.205)), 0.014);
    float upper = step(ax, 0.17) * step(0.175, q.y) * step(q.y, 0.205 + 0.0 * ax) ;
    return max(max(body, roof), max(max(ridge, pearl), max(tail, tail2)));
  }
  float doorway(vec2 q){ float d = step(abs(q.x), 0.035) * step(q.y, 0.055); float s1 = step(abs(abs(q.x) - 0.17), 0.03) * step(q.y, 0.045); return (d + s1 * 0.5) * step(-0.05, q.y); }
  vec3 sky(vec2 uv){
    float h = uHorizon;
    float y = (uv.y - h) / (1.0 - h);
    vec2 p = vec2((uv.x - 0.5) * uAspect, uv.y);
    vec3 hz = vec3(0.6, 0.2, 0.05), midc = vec3(0.16, 0.045, 0.014), top = vec3(0.01, 0.005, 0.006);
    vec3 col = mix(hz, midc, smoothstep(0.0, 0.42, y));
    col = mix(col, top, smoothstep(0.32, 1.0, y));
    // dim sun behind the dust
    vec2 lp = vec2(0.2 * uAspect + uMouse.x * 0.05, h + 0.52 * (1.0 - h));
    float dl = length(p - lp);
    col += vec3(1.0, 0.42, 0.1) * exp(-dl * 3.6) * 0.45 + vec3(1.0, 0.7, 0.4) * smoothstep(0.07, 0.055, dl) * 0.28;
    vec2 dv = p - lp; float ang = atan(dv.x, -dv.y);
    float rays = fbm(vec2(ang * 7.0, uTime * 0.04));
    col += vec3(1.0, 0.5, 0.18) * pow(rays, 3.0) * exp(-dl * 1.8) * 0.75 * smoothstep(0.05, -0.05, dv.y);
    // far megablocks
    float x1 = p.x * 1.1 + uMouse.x * 0.015;
    float c1 = floor(x1 * 5.0), w1 = fract(x1 * 5.0);
    float ht1 = h + (0.05 + hash(vec2(c1, 1.0)) * 0.18) * step(0.3, hash(vec2(c1, 3.0)));
    float b1 = step(uv.y, ht1) * step(0.1, w1) * step(w1, 0.86);
    col = mix(col, col * 0.62 + vec3(0.07, 0.02, 0.006), b1 * 0.7);
    // nearer towers with a few lit windows
    float x2 = p.x * 0.7 + uMouse.x * 0.04 + 7.3;
    float c2 = floor(x2 * 3.0), w2 = fract(x2 * 3.0);
    float ht2 = h + (0.02 + hash(vec2(c2, 5.0)) * 0.3) * step(0.45, hash(vec2(c2, 9.0))) * step(0.42, abs(p.x));
    float b2 = step(uv.y, ht2) * step(0.18, w2) * step(w2, 0.7);
    vec2 win = floor(vec2(w2 * 70.0, uv.y * 260.0));
    float lit = step(0.93, hash(win + c2)) * step(0.5, fract(win.x * 0.5)) * b2;
    col = mix(col, vec3(0.03, 0.012, 0.008) + col * 0.25, b2 * 0.85);
    col += lit * mix(vec3(1.0, 0.45, 0.1), vec3(0.1, 0.9, 0.9), step(0.6, hash(win * 1.7))) * 0.32;
    // drifting dust, incense and fog
    float fg = fbm(vec2(p.x * 1.3 + uTime * 0.018, uv.y * 3.5 - uTime * 0.01));
    col += vec3(0.45, 0.16, 0.04) * fg * 0.26 * smoothstep(0.9, 0.0, y);
    col = mix(col, hz * 0.8, smoothstep(0.12, 0.0, y) * 0.55);
    return col;
  }
  void main(){
    vec3 col;
    float h = uHorizon;
    if (vUv.y > h) col = sky(vUv);
    else {
      float dep = (h - vUv.y);
      float rip = (vnoise(vec2(vUv.x * 60.0, vUv.y * 300.0 + uTime * 2.0)) - 0.5) * 0.012 * (0.3 + dep * 4.0);
      vec2 m = vec2(vUv.x + rip, h + dep * 1.6);
      col = sky(m) * mix(0.35, 0.12, smoothstep(0.0, 0.35, dep));
      col = mix(col, sky(vec2(vUv.x, h + 0.002)) * 0.8, smoothstep(0.03, 0.0, dep));
    }
    gl_FragColor = vec4(col, 1.0);
  }`;

export const lanternVert = `varying vec3 vP; varying vec3 vN; varying vec3 vW; void main(){ vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

export const lanternFrag = `uniform float uTime, uDim; varying vec3 vP; varying vec3 vN; varying vec3 vW;
    void main(){
      float ribs = 0.72 + 0.28 * pow(abs(cos(atan(vP.x, vP.z) * 6.0)), 0.5);
      vec3 V = normalize(cameraPosition - vW);
      float core = pow(max(dot(normalize(vN), V), 0.0), 1.4);
      float band = smoothstep(0.86, 0.9, abs(vP.y));
      vec3 col = vec3(1.0, 0.16, 0.06) * (0.55 + 1.6 * core) * ribs;
      col = mix(col, vec3(1.0, 0.7, 0.25) * 1.2, band);
      gl_FragColor = vec4(col * uDim, 1.0);
    }`;

export const floorVert = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

export const floorFrag = `
  uniform float uTime; uniform float uLx[${LANTERNS}]; varying vec3 vW;
  ${NOISE}
  void main(){
    float dist = length(vW.xz - cameraPosition.xz);
    vec2 g = vW.xz * 1.7; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    float ph = fract(uTime * 0.85 + hash(id) * 7.0);
    vec2 off = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.5;
    float r = length(f - off);
    float ring = smoothstep(0.035, 0.0, abs(r - ph * 0.42)) * (1.0 - ph) * step(0.35, hash(id + 1.3));
    vec2 c = vW.xz - vec2(0.0, 0.2);
    float pool = exp(-dot(c, c) * 0.14);
    vec2 sl = abs(fract(vW.xz * vec2(0.62, 0.62) + 0.5) - 0.5);
    float seam = smoothstep(0.47, 0.5, max(sl.x, sl.y));
    vec3 col = vec3(0.012, 0.008, 0.007);
    col += vec3(1.0, 0.42, 0.14) * pool * 0.3;
    col *= 1.0 - seam * 0.6;
    col += vec3(1.0, 0.55, 0.25) * ring * (0.1 + pool * 0.9);
    // lantern reflections stretch toward the viewer
    for (int i = 0; i < ${LANTERNS}; i++) {
      float sx = exp(-abs(vW.x - uLx[i]) * 7.0 * (0.6 + 0.4 * vnoise(vec2(vW.z * 3.0, uTime * 2.0 + float(i)))));
      col += vec3(1.0, 0.14, 0.05) * sx * exp(-abs(vW.z - ${LZ.toFixed(1)}) * 0.22) * 0.107;
    }
    col += vec3(0.05, 0.7, 0.75) * exp(-abs(vW.x + 13.5) * 0.9) * 0.18 * smoothstep(-40.0, -8.0, vW.z) * (0.6 + 0.4 * vnoise(vW.xz * 4.0 + uTime));
    col += vec3(0.85, 0.08, 0.32) * exp(-abs(vW.x - 15.0) * 0.8) * 0.16 * smoothstep(-40.0, -10.0, vW.z) * (0.6 + 0.4 * vnoise(vW.xz * 4.0 - uTime));
    float a = mix(0.6, 0.0, smoothstep(10.0, 40.0, dist));
    gl_FragColor = vec4(col, a);
  }`;

export const coneVert = `varying vec3 vN; varying vec3 vW; varying float vH;
    void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vH = uv.y; gl_Position = projectionMatrix * viewMatrix * w; }`;

export const coneFrag = `uniform float uTime; varying vec3 vN; varying vec3 vW; varying float vH;
    ${NOISE}
    void main(){
      vec3 V = normalize(cameraPosition - vW);
      float fr = pow(abs(dot(normalize(vN), V)), 2.2);
      float n = fbm(vec2(vW.x * 0.9 + vW.z * 0.4, vW.y * 0.6 + uTime * 0.25));
      float a = fr * (0.25 + 0.75 * vH) * (0.45 + 0.9 * n) * 0.1 * smoothstep(0.0, 0.12, vH);
      gl_FragColor = vec4(vec3(1.0, 0.58, 0.28) * a, 1.0);
    }`;

export const dustVert = `uniform float uTime, uPR; attribute vec4 aSeed; varying float vA;
    void main(){
      float y = mod(aSeed.y * ${CONE_TOP.toFixed(1)} + uTime * (0.05 + aSeed.w * 0.12), ${CONE_TOP.toFixed(1)});
      float r = mix(2.7, 0.35, y / ${CONE_TOP.toFixed(1)}) * sqrt(aSeed.x);
      float a = aSeed.z * 6.2832 + uTime * 0.05;
      vec3 p = vec3(cos(a) * r, y, sin(a) * r - 0.1);
      p.x += sin(uTime * 0.4 + aSeed.w * 9.0) * 0.08;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vA = 0.35 + 0.65 * sin(uTime * (1.0 + aSeed.w) + aSeed.x * 30.0) * 0.5 + 0.3;
      gl_PointSize = (2.0 + aSeed.w * 3.0) * uPR * (8.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`;

export const dustFrag = `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.7, 0.4) * smoothstep(0.5, 0.0, d) * vA * 0.9, 1.0); }`;

export const rainVert = `uniform float uTime, uWind, uDensity; attribute vec4 aSeed; attribute float aEnd; varying float vA; varying vec3 vCol;
    void main(){
      float H = 15.0;
      float speed = 10.5 * (0.8 + 0.45 * aSeed.w);
      float y = 12.0 - mod(aSeed.y * H + uTime * speed, H);
      vec3 p = vec3(aSeed.x * 28.0 - 14.0, y, aSeed.z * 17.0 - 11.0);
      p.x += y * uWind;
      float len = 0.22 + 0.3 * aSeed.w;
      p += normalize(vec3(uWind, 1.0, 0.0)) * len * aEnd;
      float r = mix(0.35, 2.9, clamp(1.0 - p.y / ${CONE_TOP.toFixed(1)}, 0.0, 1.0));
      float d = length(p.xz - vec2(0.0, -0.1));
      float lit = smoothstep(r * 1.1, r * 0.25, d);
      float nearSign = exp(-abs(p.x + 9.0) * 0.5) * 0.6;
      float lan = exp(-abs(p.z - ${LZ.toFixed(1)}) * 0.8) * smoothstep(3.5, 7.0, p.y);
      vCol = vec3(0.5, 0.36, 0.28) * 0.35 + vec3(1.0, 0.6, 0.3) * lit * 2.6 + vec3(0.1, 0.8, 0.85) * nearSign * 0.5 + vec3(1.0, 0.15, 0.05) * lan * 1.2;
      vA = (aEnd > 0.5 ? 0.08 : 1.0) * step(0.0, p.y) * step(fract(aSeed.y * 7.13 + aSeed.z * 3.7), uDensity) * (0.35 + 0.65 * max(lit, lan));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`;

export const rainFrag = `varying float vA; varying vec3 vCol; void main(){ gl_FragColor = vec4(vCol * vA, 1.0); }`;
