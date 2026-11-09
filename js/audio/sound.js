// 用 Web Audio API 即時合成的環境音與音效
/* ---------- sound: synthesised live with the Web Audio API (no files) ---------- */
export const Sound = (() => {
  let ctx = null, master, musicBus, sfxBus, ambBus, verbIn, echoIn, rainGain, buzzGain, buzzOsc;
  let on = false, timer = null, nextChord = 0, chordIdx = 0, nextBell = 0, nextDrop = 0, nextThunder = 0, lastCrumble = 0;
  let flash = 0;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const CHORDS = [
    { bass: 38, notes: [57, 60, 64, 65] },
    { bass: 34, notes: [53, 57, 62, 65] },
    { bass: 31, notes: [50, 53, 58, 69] },
    { bass: 33, notes: [52, 55, 62, 64] },
  ];
  const BELLS = [74, 77, 79, 81, 84, 86, 89];

  function noiseBuffer(sec, kind) {
    const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
        else if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
        else d[i] = w;
      }
    }
    return buf;
  }
  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  let WHITE, PINK, BROWN;
  function src(buf, loop) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = !!loop; return s; }
  function g(v) { const n = ctx.createGain(); n.gain.value = v; return n; }
  function filt(type, f, q) { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; }
  function pan(v) { const p = ctx.createStereoPanner ? ctx.createStereoPanner() : g(1); if (p.pan) p.pan.value = v; return p; }

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    WHITE = noiseBuffer(2, 'white'); PINK = noiseBuffer(4, 'pink'); BROWN = noiseBuffer(6, 'brown');
    master = g(0);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
    master.connect(comp).connect(ctx.destination);
    const verb = ctx.createConvolver(); verb.buffer = impulse(5.5, 2.6);
    verbIn = g(1); const verbOut = g(0.6); verbIn.connect(verb).connect(verbOut).connect(master);
    echoIn = g(1); const dl = ctx.createDelay(2); dl.delayTime.value = 0.48; const fb = g(0.42); const eLp = filt('lowpass', 2600);
    echoIn.connect(dl); dl.connect(eLp).connect(fb).connect(dl); eLp.connect(verbIn); eLp.connect(g(0.5)).connect(master);
    musicBus = g(0.5); musicBus.connect(master); musicBus.connect(g(0.75)).connect(verbIn);
    sfxBus = g(0.7); sfxBus.connect(master); sfxBus.connect(g(0.35)).connect(verbIn);
    ambBus = g(0.6); ambBus.connect(master);
    rainGain = g(0.0); rainGain.connect(ambBus);
    const hiss = src(PINK, true); hiss.connect(filt('highpass', 600)).connect(filt('lowpass', 7500)).connect(g(0.55)).connect(rainGain); hiss.start();
    const body = src(BROWN, true); body.connect(filt('lowpass', 520)).connect(g(0.5)).connect(rainGain); body.start(0, 1.3);
    const hum = g(0.035); hum.connect(filt('lowpass', 240)).connect(ambBus);
    [55, 82.41, 110.3].forEach((f, i) => { const o = ctx.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 1) * 4; o.connect(hum); o.start(); });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lfoG = g(0.015); lfo.connect(lfoG).connect(hum.gain); lfo.start();
    buzzGain = g(0.0); buzzOsc = ctx.createOscillator(); buzzOsc.type = 'sawtooth'; buzzOsc.frequency.value = 120;
    buzzOsc.connect(filt('bandpass', 2300, 5)).connect(buzzGain).connect(pan(0.55)).connect(ambBus); buzzOsc.start();
    const now = ctx.currentTime;
    nextChord = now + 0.3; nextBell = now + 3; nextDrop = now + 0.2; nextThunder = now + 14 + Math.random() * 12;
  }

  function playChord(c, t, dur) {
    const lp = filt('lowpass', 380, 1.6);
    lp.frequency.setValueAtTime(380, t);
    lp.frequency.linearRampToValueAtTime(2000, t + dur * 0.35);
    lp.frequency.exponentialRampToValueAtTime(520, t + dur + 3);
    const vca = g(0); vca.gain.setValueAtTime(0, t);
    vca.gain.linearRampToValueAtTime(0.05, t + 2.6);
    vca.gain.setValueAtTime(0.05, t + dur - 0.5);
    vca.gain.linearRampToValueAtTime(0, t + dur + 3.5);
    lp.connect(vca).connect(musicBus);
    c.notes.forEach((n, i) => {
      [-7, 7].forEach(cents => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = cents + (Math.random() - 0.5) * 3;
        const p = pan((i / (c.notes.length - 1) - 0.5) * 0.9 * Math.sign(cents)); o.connect(p).connect(lp);
        o.start(t); o.stop(t + dur + 4);
      });
    });
    const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = mtof(c.bass);
    const bg = g(0); bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.16, t + 1.8); bg.gain.setValueAtTime(0.16, t + dur - 0.4); bg.gain.linearRampToValueAtTime(0, t + dur + 2);
    b.connect(bg).connect(master); b.start(t); b.stop(t + dur + 2.2);
  }
  function bell(t, midi, vol = 0.05, dest = echoIn) {
    const f = mtof(midi);
    const car = ctx.createOscillator(); car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.frequency.value = f * 3.5;
    const mg = g(f * 2.2); mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.8);
    mod.connect(mg).connect(car.frequency);
    const vca = g(0); vca.gain.setValueAtTime(0, t); vca.gain.linearRampToValueAtTime(vol, t + 0.01); vca.gain.exponentialRampToValueAtTime(0.0005, t + 3.2);
    car.connect(vca).connect(pan((Math.random() - 0.5) * 1.2)).connect(dest);
    vca.connect(musicBus);
    car.start(t); mod.start(t); car.stop(t + 3.4); mod.stop(t + 3.4);
  }
  // a temple bowl / bronze bell: inharmonic partials with a long tail
  function templeBell(t, base = 49, vol = 0.18) {
    const f = mtof(base);
    [[1, 1], [2.76, 0.5], [5.4, 0.28], [8.93, 0.14], [1.5, 0.22]].forEach(([r, a], k) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * r; o.detune.value = (Math.random() - 0.5) * 6;
      const v = g(0); const dec = 6.5 / (1 + k * 0.6);
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(vol * a, t + 0.008); v.gain.exponentialRampToValueAtTime(0.0003, t + dec);
      o.connect(v).connect(pan((k % 2 ? 0.25 : -0.25))).connect(sfxBus); v.connect(g(0.6)).connect(verbIn);
      o.start(t); o.stop(t + dec + 0.1);
    });
  }
  function drop(t) {
    const s = src(WHITE); const bp = filt('bandpass', 1800 + Math.random() * 4500, 6 + Math.random() * 10);
    const v = g(0); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.05, t + 0.002); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.06 + Math.random() * 0.08);
    s.connect(bp).connect(v).connect(pan(Math.random() * 2 - 1)).connect(ambBus);
    s.start(t, Math.random() * 1.5, 0.2);
  }
  function thunder(t) {
    const s = src(BROWN); const lp = filt('lowpass', 160, 0.7);
    lp.frequency.setValueAtTime(420, t); lp.frequency.exponentialRampToValueAtTime(90, t + 6);
    const v = g(0); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(0.9, t + 0.25); v.gain.linearRampToValueAtTime(0.5, t + 1.2); v.gain.exponentialRampToValueAtTime(0.001, t + 7);
    s.connect(lp).connect(v).connect(ambBus); s.start(t, Math.random() * 2, 7.5);
    const cr = src(WHITE); const hp = filt('bandpass', 900, 0.8); const cv = g(0);
    cv.gain.setValueAtTime(0, t); cv.gain.linearRampToValueAtTime(0.12, t + 0.03); cv.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    cr.connect(hp).connect(cv).connect(verbIn); cr.start(t, 0, 1);
    setTimeout(() => { flash = 1; }, Math.max(0, (t - ctx.currentTime) * 1000 - 120));
  }
  function schedule() {
    if (!ctx || !on) return;
    const now = ctx.currentTime, ahead = now + 0.6;
    while (nextChord < ahead) { playChord(CHORDS[chordIdx % CHORDS.length], nextChord, 8); chordIdx++; nextChord += 8; }
    while (nextBell < ahead) { bell(nextBell, BELLS[(Math.random() * BELLS.length) | 0], 0.03 + Math.random() * 0.03); nextBell += 2.4 + Math.random() * 4.5; }
    while (nextDrop < ahead) { drop(nextDrop); nextDrop += 0.05 + Math.random() * 0.22; }
    if (nextThunder < ahead) { thunder(nextThunder); nextThunder += 28 + Math.random() * 40; }
  }

  return {
    get on() { return on; },
    get flash() { return flash; },
    toggle() {
      if (!ctx) init();
      on = !on;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      if (on) {
        ctx.resume();
        const t0 = ctx.currentTime;
        if (nextChord < t0) nextChord = t0 + 0.2;
        if (nextBell < t0) nextBell = t0 + 1.5;
        if (nextDrop < t0) nextDrop = t0 + 0.1;
        master.gain.linearRampToValueAtTime(0.9, now + 2.5);
        clearInterval(timer); timer = setInterval(schedule, 200); schedule();
        templeBell(t0 + 0.2, 49, 0.12);
      } else {
        master.gain.linearRampToValueAtTime(0, now + 0.8);
        clearInterval(timer); timer = null;
        setTimeout(() => { if (!on) ctx.suspend(); }, 900);
      }
      return on;
    },
    update(dt, rainDensity, neonLevel) {
      flash *= Math.pow(0.004, dt);
      if (!on || !ctx) return;
      rainGain.gain.setTargetAtTime(0.18 + rainDensity * 0.32, ctx.currentTime, 0.4);
      buzzGain.gain.setTargetAtTime(neonLevel > 0.9 ? 0.012 : neonLevel * 0.004, ctx.currentTime, 0.01);
    },
    // the statue starts to turn
    turnStart(amount) {
      if (!on) return;
      const t = ctx.currentTime, len = 1.6 + Math.min(amount, 3) * 0.4;
      const s = src(PINK); const bp = filt('bandpass', 180, 1.2);
      bp.frequency.setValueAtTime(180, t); bp.frequency.exponentialRampToValueAtTime(1400, t + len * 0.45); bp.frequency.exponentialRampToValueAtTime(260, t + len);
      const v = g(0); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(0.42, t + len * 0.4); v.gain.exponentialRampToValueAtTime(0.001, t + len + 0.3);
      s.connect(bp).connect(v).connect(sfxBus); s.start(t, Math.random(), len + 0.5);
      // stone grinding on stone
      const r = src(BROWN); const rl = filt('lowpass', 90, 4); const rv = g(0);
      rv.gain.setValueAtTime(0, t); rv.gain.linearRampToValueAtTime(0.5, t + 0.3); rv.gain.exponentialRampToValueAtTime(0.001, t + len);
      r.connect(rl).connect(rv).connect(sfxBus); r.start(t, Math.random() * 3, len + 0.3);
    },
    // landed on a chapter
    turnEnd() {
      if (!on) return;
      const t = ctx.currentTime;
      templeBell(t, 49 + [0, 3, 5, 7][(Math.random() * 4) | 0], 0.13);
      [62, 69, 74].forEach((m, i) => bell(t + 0.15 + i * 0.07, m + 12, 0.03, verbIn));
    },
    reveal() {
      if (!on) return;
      templeBell(ctx.currentTime, 45, 0.16);
    },
    // stone dissolving into data: a fizz of tiny bleeps over a thin crackle
    scatter(strength) {
      if (!on) return;
      const t = ctx.currentTime;
      if (t - lastCrumble < 0.06) return;
      lastCrumble = t;
      const n = 3 + ((Math.random() * 4) | 0);
      for (let i = 0; i < n; i++) {
        const st = t + i * 0.022 + Math.random() * 0.015;
        const o = ctx.createOscillator(); o.type = 'square';
        const f = mtof(BELLS[(Math.random() * BELLS.length) | 0] + 12 + (Math.random() < 0.3 ? 12 : 0));
        o.frequency.setValueAtTime(f, st); o.frequency.exponentialRampToValueAtTime(f * (1.2 + Math.random() * 0.8), st + 0.05);
        const og = g(0); og.gain.setValueAtTime(0, st); og.gain.linearRampToValueAtTime(0.008 + strength * 0.012, st + 0.003); og.gain.exponentialRampToValueAtTime(0.0002, st + 0.05 + Math.random() * 0.04);
        o.connect(filt('highpass', 1500)).connect(og).connect(pan(Math.random() * 1.6 - 0.8)).connect(sfxBus); o.start(st); o.stop(st + 0.12);
      }
      const w = src(WHITE); const bp = filt('bandpass', 6000, 2); const wv = g(0);
      wv.gain.setValueAtTime(0, t); wv.gain.linearRampToValueAtTime(0.02 + strength * 0.03, t + 0.01); wv.gain.exponentialRampToValueAtTime(0.0002, t + 0.18);
      w.connect(bp).connect(wv).connect(sfxBus); w.start(t, Math.random(), 0.2);
    },
    glitch() {
      if (!on) return;
      const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.16);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let hold = 0, v = 0, step = 20 + ((Math.random() * 80) | 0);
      for (let i = 0; i < len; i++) { if (hold-- <= 0) { v = Math.random() < 0.5 ? -1 : 1; hold = step; if (Math.random() < 0.08) step = 10 + ((Math.random() * 120) | 0); } d[i] = v * (1 - i / len); }
      const s = src(buf); const gv = g(0.05);
      s.connect(filt('bandpass', 1400, 0.7)).connect(gv).connect(pan(Math.random() * 1.4 - 0.7)).connect(sfxBus); s.start(t);
    },
    tick() {
      if (!on) return;
      const t = ctx.currentTime, o = ctx.createOscillator(); o.frequency.value = 2400;
      const og = g(0); og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(0.04, t + 0.003); og.gain.exponentialRampToValueAtTime(0.0003, t + 0.05);
      o.connect(og).connect(sfxBus); o.start(t); o.stop(t + 0.06);
    }
  };
})();
