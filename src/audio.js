'use strict';
/* ===================== Web Audio 효과음 (모두 직접 합성) ===================== */
const Sfx = {
  ctx: null, master: null, sfxBus: null, ambBus: null, noiseBuf: null,
  settings: Object.assign({ sound: true, ambience: true, voice: true, voiceStyle: 'tomb', volume: 0.8, lowGfx: false }, store.get('qin_settings', {})),
  windNodes: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.connect(c.destination);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
    this.ambBus = c.createGain(); this.ambBus.connect(this.master);
    const len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    this.apply();
  },
  save() { store.set('qin_settings', this.settings); this.apply(); },
  apply() {
    if (!this.ctx) return;
    const s = this.settings, t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.sound ? s.volume : 0, t, 0.05);
    this.ambBus.gain.setTargetAtTime(s.ambience ? 1 : 0, t, 0.2);
  },
  noise(dur, { type = 'lowpass', f = 800, f2 = null, q = 1, gain = 0.5, a = 0.01, bus = null, when = 0 } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + when;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(bus || this.sfxBus);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  },
  tone(freq, dur, { type = 'sine', gain = 0.3, a = 0.01, f2 = null, when = 0, bus = null } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.05);
  },
  // ---- 효과음 목록 ----
  drum(when = 0, big = 1) {
    this.tone(90 * big, 0.9, { f2: 38, gain: 0.9, when });
    this.tone(55, 1.4, { f2: 30, gain: 0.5 * big, when });
    this.noise(0.25, { f: 400, f2: 80, gain: 0.35, when });
  },
  bigDrums() { for (let i = 0; i < 4; i++) this.drum(i * 0.55, i === 3 ? 1.3 : 1); },
  step(run) { this.noise(0.09, { type: 'bandpass', f: run ? 520 : 380, q: 1.2, gain: run ? 0.14 : 0.1, a: 0.004 }); },
  jump() { this.noise(0.15, { type: 'bandpass', f: 300, gain: 0.12 }); },
  land() { this.noise(0.18, { f: 300, f2: 90, gain: 0.25, a: 0.003 }); },
  doorOpen(dur = 3) {
    this.noise(dur, { f: 220, f2: 90, q: 3, gain: 0.45, a: 0.3 });
    this.tone(48, dur, { type: 'sawtooth', gain: 0.08, a: 0.4 });
    this.noise(0.5, { f: 180, gain: 0.3, when: dur - 0.3 });
  },
  doorSlam() { this.drum(0, 1.4); this.noise(1.2, { f: 1200, f2: 100, gain: 0.6, a: 0.003 }); },
  correct() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.45, { type: 'triangle', gain: 0.2, when: i * 0.08 })); },
  wrong() { this.tone(180, 0.35, { type: 'square', gain: 0.12, f2: 110 }); this.tone(170, 0.35, { type: 'square', gain: 0.08, f2: 100, when: 0.12 }); },
  click() { this.tone(660, 0.06, { type: 'triangle', gain: 0.08 }); },
  treasure() {
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.6, { type: 'triangle', gain: 0.15, when: i * 0.07 }));
    this.noise(1.2, { type: 'highpass', f: 5000, gain: 0.08, when: 0.1 });
  },
  redFlash() { this.tone(110, 1.2, { type: 'sawtooth', gain: 0.12, f2: 55 }); this.drum(0.05, 0.8); },
  grind() { this.noise(1.3, { type: 'bandpass', f: 160, f2: 120, q: 4, gain: 0.35, a: 0.2 }); },
  shadow() { this.tone(70, 2.5, { type: 'sawtooth', gain: 0.08, a: 0.6 }); this.tone(73, 2.5, { type: 'sawtooth', gain: 0.06, a: 0.6 }); this.noise(2, { f: 300, gain: 0.12, a: 0.8 }); },
  codeGet() { [659, 880, 1319].forEach((f, i) => this.tone(f, 0.8, { type: 'sine', gain: 0.25, when: i * 0.12 })); this.drum(0, 0.6); },
  warn() { this.tone(440, 0.2, { type: 'square', gain: 0.08 }); this.tone(440, 0.2, { type: 'square', gain: 0.08, when: 0.3 }); },
  escapeMusic() {
    // 오음음계 승리 음악
    const mel = [392, 440, 523, 587, 659, 587, 659, 784, 880, 784, 659, 784, 1047];
    mel.forEach((f, i) => { this.tone(f, 0.5, { type: 'triangle', gain: 0.22, when: i * 0.28 }); this.tone(f / 2, 0.5, { type: 'sine', gain: 0.12, when: i * 0.28 }); });
    for (let i = 0; i < 8; i++) this.drum(i * 0.56, 0.7);
    this.tone(1047, 2.5, { type: 'sine', gain: 0.2, when: mel.length * 0.28, a: 0.05 });
    this.tone(784, 2.5, { type: 'sine', gain: 0.15, when: mel.length * 0.28, a: 0.05 });
  },
  growl() { this.noise(2.2, { f: 140, f2: 70, q: 3, gain: 0.45, a: 0.4 }); this.tone(46, 2.2, { type: 'sawtooth', gain: 0.07, a: 0.5 }); this.tone(49, 2.2, { type: 'sawtooth', gain: 0.05, a: 0.5 }); },
  hit() { this.noise(0.25, { f: 900, f2: 200, gain: 0.5, a: 0.003 }); this.tone(140, 0.3, { type: 'square', gain: 0.15, f2: 70 }); },
  clang() { [1200, 1650, 2300].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', gain: 0.12 / (i + 1) })); this.noise(0.1, { type: 'highpass', f: 3000, gain: 0.2 }); },
  whoosh() { this.noise(0.35, { type: 'bandpass', f: 2500, f2: 600, q: 2, gain: 0.25, a: 0.02 }); },
  beep() { this.tone(980, 0.12, { type: 'square', gain: 0.08 }); },
  crack() { this.noise(0.3, { type: 'bandpass', f: 1800, q: 3, gain: 0.35, a: 0.002 }); this.noise(0.5, { f: 300, gain: 0.25, when: 0.1 }); },
  collapse() { this.noise(1.2, { f: 600, f2: 60, gain: 0.6, a: 0.01 }); this.drum(0.1, 0.7); },
  rumble(d = 2.5) { this.noise(d, { f: 120, f2: 60, q: 2, gain: 0.5, a: 0.6 }); this.tone(38, d, { type: 'sawtooth', gain: 0.06, a: 0.8 }); },
  pickup() { [880, 1175, 1760].forEach((f, i) => this.tone(f, 0.35, { type: 'sine', gain: 0.16, when: i * 0.06 })); this.noise(0.4, { type: 'highpass', f: 6000, gain: 0.06, when: 0.05 }); },
  alert() { this.tone(330, 0.15, { type: 'sawtooth', gain: 0.15 }); this.tone(495, 0.3, { type: 'sawtooth', gain: 0.15, when: 0.12 }); this.drum(0, 0.5); },
  unlock() { this.tone(1500, 0.08, { type: 'square', gain: 0.08 }); this.noise(0.15, { type: 'bandpass', f: 2000, gain: 0.2, when: 0.08 }); this.tone(900, 0.2, { type: 'triangle', gain: 0.12, when: 0.18 }); },
  // 음성 아래에 깔리는 울림 (무덤 속 공명)
  voiceBed(kind, len) {
    if (!this.ctx) return;
    const d = Math.min(6, 1.2 + len * 0.28);
    if (kind === 'stone') { this.noise(d, { type: 'bandpass', f: 110, q: 6, gain: 0.18, a: 0.3 }); this.tone(55, d, { gain: 0.07, a: 0.4 }); }
    else if (kind === 'drum') { this.drum(0, 0.7); this.noise(d, { type: 'bandpass', f: 90, q: 6, gain: 0.2, a: 0.3 }); this.tone(41, d, { gain: 0.09, a: 0.4 }); }
    else if (kind === 'gong') { this.tone(98, d + 1, { type: 'sine', gain: 0.12, a: 0.02 }); this.tone(147.5, d, { type: 'sine', gain: 0.05, a: 0.02 }); this.tone(196.6, d * 0.7, { type: 'sine', gain: 0.04, a: 0.02 }); }
    else if (kind === 'chime') { [659, 988].forEach((f, i) => this.tone(f, 2.5, { type: 'sine', gain: 0.05, when: i * 0.25, a: 0.01 })); this.noise(d, { type: 'bandpass', f: 2400, q: 8, gain: 0.03, a: 0.5 }); }
  },
  // 동굴 바람 + 낮은 저음 (반복)
  startAmbience() {
    if (!this.ctx || this.windNodes) return;
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 350; fl.Q.value = 0.8;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.09; const lg = c.createGain(); lg.gain.value = 220;
    lfo.connect(lg); lg.connect(fl.frequency);
    const g = c.createGain(); g.gain.value = 0.12;
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.13; const lg2 = c.createGain(); lg2.gain.value = 0.06;
    lfo2.connect(lg2); lg2.connect(g.gain);
    src.connect(fl); fl.connect(g); g.connect(this.ambBus);
    const drone = c.createOscillator(); drone.frequency.value = 49; const dg = c.createGain(); dg.gain.value = 0.05;
    drone.connect(dg); dg.connect(this.ambBus);
    src.start(); lfo.start(); lfo2.start(); drone.start();
    this.windNodes = { src, lfo, lfo2, drone };
    // 가끔 들리는 먼 북소리
    this.drumTimer = setInterval(() => { if (Math.random() < 0.5) { this.tone(60, 1.5, { f2: 35, gain: 0.25, bus: this.ambBus }); } }, 9000);
  },
};

/* ===================== 중국어 음성 (Web Speech API, zh-CN) ===================== */
// 역할별 목소리 톤: 브라우저 음성 엔진의 높낮이(pitch)·속도(rate)·남녀 목소리를 조절한다.
const VOICE_ROLES = {
  narrator: { male: true, pitch: 0.7, rate: 0.72, echo: 'gong', label: '내레이션 (인트로)' },
  warrior:  { male: true, pitch: 0.55, rate: 0.78, echo: 'stone', label: '병마용' },
  general:  { male: true, pitch: 0.45, rate: 0.72, echo: 'drum', label: '장군 병마용' },
  spirit:   { male: false, pitch: 0.8, rate: 0.74, echo: 'chime', label: '고대 달력 · 보물상자' },
  clear:    { male: false, pitch: 1.0, rate: 0.85, echo: null, label: '정답 문장 (또렷한 발음)' },
};
const MISSION_ROLE = { 1: 'warrior', 2: 'general', 3: 'spirit', 4: 'spirit', 5: 'warrior' };
const Voice = {
  voice: null, male: null, female: null, ready: false,
  init() {
    if (!('speechSynthesis' in window)) return;
    const pick = () => {
      const vs = speechSynthesis.getVoices();
      const zh = vs.filter(v => /^zh[-_]CN/i.test(v.lang) || /普通话|Mandarin|Chinese \(China|Xiaoxiao|Yunxi|Huihui|Kangkang/i.test(v.name));
      const isMale = v => /Yunxi|Yunyang|Yunjian|Yunye|Yunze|Yunhao|Kangkang|Male|男/i.test(v.name);
      this.male = zh.find(v => isMale(v) && /Natural|Online/i.test(v.name)) || zh.find(isMale) || null;
      this.female = zh.find(v => /Xiaoxiao|Natural/i.test(v.name) && !isMale(v)) || zh.find(v => !isMale(v)) || zh[0] || null;
      this.voice = this.female || this.male;
      this.ready = !!this.voice;
      document.dispatchEvent(new Event('voice-ready'));
    };
    pick(); speechSynthesis.onvoiceschanged = pick;
  },
  available() { return this.ready && Sfx.settings.voice; },
  say(text, role) {
    if (!this.available()) return false;
    if (Sfx.settings.voiceStyle === 'clear') role = 'clear';
    const R0 = VOICE_ROLES[role] || VOICE_ROLES.clear;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[①②③④]/g, ''));
      u.voice = (R0.male ? this.male : this.female) || this.voice;
      u.lang = 'zh-CN'; u.pitch = R0.pitch; u.rate = R0.rate; u.volume = Sfx.settings.volume;
      // 목소리 밑에 깔리는 무덤 울림 효과
      if (R0.echo) u.onstart = () => Sfx.voiceBed(R0.echo, text.length);
      speechSynthesis.speak(u); return true;
    } catch (e) { return false; }
  },
};
