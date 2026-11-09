// 常調的數值集中在這裡
import * as THREE from 'three';

// statue height, used by the camera fit and the reveal scan
export const LION_H = 4.24;

/* ---------- chapters: how the statue turns and where the camera looks ---------- */
// yaw: statue rotation; tgt: point on the statue (local) the camera centres; dist: camera distance (null = fit whole statue);
// el: camera elevation (rad); r: radius of the scan ring around the part
export const KEYS = [
  { yaw: -0.38, tgt: [0, 2.12, 0],        dist: null, el: 0.10 },
  { yaw: 0.16,  tgt: [0, 3.25, 0.78],     dist: 4.3,  el: 0.05, r: 0.42 },
  { yaw: 0.40,  tgt: [0, 2.32, 1.02],     dist: 4.6,  el: 0.12, r: 0.42 },
  { yaw: 0.78,  tgt: [-0.58, 1.66, 0.98], dist: 4.6,  el: 0.24, r: 0.5 },
  { yaw: 1.50,  tgt: [-0.45, 3.4, -0.15], dist: 5.4,  el: 0.3,  r: 0.95 },
  { yaw: 3.30,  tgt: [0, 2.0, -1.2],      dist: 6.0,  el: 0.16, r: 0.95 },
  { yaw: 6.12,  tgt: [0, 0.75, 1.15],     dist: 5.6,  el: 0.0,  r: 0.75 },
  { yaw: 6.90,  tgt: [0, 2.12, 0],        dist: null, el: 0.12 },
];

// how many recent pointer positions feed the touch dissolve
export const TRAIL = 10;

// far enough back that the whole roof and the ridge dragons stay inside the frame
export const TEMPLE_POS = new THREE.Vector3(0, 0, -20), TEMPLE_SCALE = 0.95;
export const FOG_TARGET = 0.011;

export const LANTERNS = 9, LZ = -4.6;
export const CONE_TOP = 9.5;
