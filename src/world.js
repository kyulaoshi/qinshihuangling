'use strict';
/* ===================== 진시황릉 맵 (2m 격자) ===================== */
const T = 2;          // 한 칸 = 2m
const MW = 31, MH = 78;
const ZONES = {
  1: { zh: '地下墓门', py: 'Dìxià mùmén', ko: '지하 무덤 입구', ceil: 9, amb: [0.095, 0.095, 0.125] },
  2: { zh: '兵马俑坑', py: 'Bīngmǎyǒng kēng', ko: '병마용의 방', ceil: 8, amb: [0.1, 0.075, 0.06] },
  8: { zh: '秘密通道', py: 'Mìmì tōngdào', ko: '좁은 비밀 통로', ceil: 3.6, amb: [0.05, 0.045, 0.05] },
  3: { zh: '密码室', py: 'Mìmǎ shì', ko: '비밀 암호의 방', ceil: 6.5, amb: [0.05, 0.085, 0.085] },
  4: { zh: '皇帝宝库', py: 'Huángdì bǎokù', ko: '황제의 보물창고', ceil: 6.5, amb: [0.11, 0.085, 0.04] },
  9: { zh: '密室', py: 'Mìshì', ko: '숨겨진 방', ceil: 4, amb: [0.06, 0.09, 0.07] },
  10: { zh: '东边的密室', py: 'Dōngbian de mìshì', ko: '동쪽의 잠긴 방', ceil: 4, amb: [0.06, 0.09, 0.07] },
  5: { zh: '最后的迷宫', py: 'Zuìhòu de mígōng', ko: '마지막 미로', ceil: 4.2, amb: [0.045, 0.035, 0.06] },
  6: { zh: '逃生之门', py: 'Táoshēng zhī mén', ko: '최종 탈출구', ceil: 11, amb: [0.1, 0.05, 0.045] },
  7: { zh: '出口', py: 'Chūkǒu', ko: '바깥', ceil: 9, amb: [0.5, 0.48, 0.42] },
};
const DOOR_H = { '1': 7, '2': 3.6, '3': 3.6, '4': 3.6, 'a': 3.4, 'b': 3.4, 'c': 3.4, 'T': 3.6, 'X': 8.5, 'H': 3.2, 'L': 3.2 };

function buildGrid() {
  const g = []; for (let r = 0; r < MH; r++) g.push(new Array(MW).fill('#'));
  const rect = (r0, r1, c0, c1, ch = '.') => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) g[r][c] = ch; };
  rect(0, 1, 14, 16);                 // 바깥
  rect(2, 2, 14, 16, 'X');            // 최종 석문
  rect(3, 7, 8, 22);                  // 최종 탈출구
  g[8][15] = '.';
  // ---- 미로 ----
  g[9][15] = 'c'; rect(10, 11, 15, 15); g[10][16] = '.';
  rect(12, 12, 7, 25); rect(12, 15, 25, 25); rect(13, 15, 7, 7); g[16][7] = 'b';
  rect(17, 17, 7, 23); g[18][7] = '.'; rect(14, 16, 19, 19); rect(18, 20, 11, 11);
  rect(17, 19, 23, 23); g[20][23] = 'a'; rect(21, 25, 23, 23); g[22][24] = '.';
  rect(25, 25, 5, 23); rect(21, 25, 5, 5); rect(21, 21, 5, 10); rect(25, 27, 15, 15); g[24][11] = '.'; g[26][19] = '.'; // 굴러오는 돌 대피 홈
  g[28][15] = '4';
  rect(29, 36, 5, 25);                // 보물창고
  g[32][4] = 'H'; rect(31, 33, 1, 3); // 숨겨진 방
  g[32][26] = 'L'; rect(31, 33, 27, 29); // 동쪽의 잠긴 방 (청동 열쇠)
  g[37][15] = '3';
  rect(42, 45, 6, 24);                // 비밀 암호의 방
  rect(38, 41, 14, 16);               // 무너지는 바닥 구역
  rect(46, 51, 15, 15); rect(47, 49, 14, 16); g[50][15] = 'T'; // 화살 함정 통로
  g[52][15] = '2';
  rect(53, 64, 3, 27);                // 병마용의 방
  [55, 58, 61].forEach(r => { g[r][11] = 'o'; g[r][19] = 'o'; });
  rect(65, 65, 14, 16, '1');          // 거대한 석문
  rect(66, 76, 8, 22);                // 지하 무덤 입구
  [68, 71, 74].forEach(r => { g[r][10] = 'o'; g[r][20] = 'o'; });
  return g;
}
function zoneOfCell(r, c) {
  if (r <= 1) return 7; if (r <= 8) return 6; if (r <= 27) return 5;
  if (r <= 36) return (c <= 4) ? 9 : (c >= 27 ? 10 : 4); if (r <= 45) return 3; if (r <= 51) return 8; if (r <= 64) return 2; return 1;
}
const cellX = c => (c + 0.5) * T, cellZ = r => (r + 0.5) * T;

/* ---------- 캔버스 텍스처 ---------- */
const FONT_ZH = '"Noto Serif SC","Noto Serif CJK SC","STKaiti","KaiTi","SimSun","Noto Serif KR",serif';
function canvasTex(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d'), w, h); return cv; }
function stoneBG(x, w, h, base = '#5a5148') {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 60; i++) { x.fillStyle = `rgba(${Math.random()<.5?0:255},${Math.random()<.5?0:240},${Math.random()<.5?0:220},${Math.random()*0.06})`; x.fillRect(Math.random()*w, Math.random()*h, 2+Math.random()*4, 2+Math.random()*4); }
}
function carveText(x, txt, cx, cy, size, color = '#d8b46a') {
  x.font = `bold ${size}px ${FONT_ZH}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillText(txt, cx + size*0.04, cy + size*0.04);
  x.fillStyle = color; x.fillText(txt, cx, cy);
}
function plaqueTex(zh, sub) {
  return canvasTex(512, 160, (x, w, h) => {
    stoneBG(x, w, h, '#2b1d14'); x.strokeStyle = '#b08a3c'; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16);
    x.lineWidth = 2; x.strokeRect(20, 20, w - 40, h - 40);
    carveText(x, zh, w/2, sub ? 66 : h/2, sub ? 70 : 84);
    if (sub) { x.font = `bold 26px "Noto Sans KR","Malgun Gothic",sans-serif`; x.fillStyle = '#c9b48a'; x.textAlign = 'center'; x.fillText(sub, w/2, 124); }
  });
}
function friezeTex() {
  return canvasTex(256, 64, (x, w, h) => {
    x.fillStyle = '#3a120c'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#a8823a'; x.lineWidth = 5;
    x.beginPath(); x.moveTo(0, 6); x.lineTo(w, 6); x.moveTo(0, h - 6); x.lineTo(w, h - 6); x.stroke();
    x.lineWidth = 4;
    for (let i = 0; i < 4; i++) { // 회문(回纹)
      const o = i * 64 + 8;
      x.beginPath(); x.moveTo(o, 52); x.lineTo(o, 14); x.lineTo(o + 44, 14); x.lineTo(o + 44, 44); x.lineTo(o + 16, 44); x.lineTo(o + 16, 24); x.lineTo(o + 32, 24); x.lineTo(o + 32, 34); x.stroke();
      x.beginPath(); x.moveTo(o, 52); x.lineTo(o + 56, 52); x.lineTo(o + 56, 10); x.stroke();
    }
  });
}
function numberTabletTex(n) {
  return canvasTex(256, 384, (x, w, h) => {
    stoneBG(x, w, h, '#4d463e'); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 10; x.strokeRect(10, 10, w-20, h-20);
    carveText(x, numZh(n), w/2, 150, 170, '#c9a55a');
    x.font = 'bold 64px Georgia,serif'; x.fillStyle = '#8f7d63'; x.textAlign = 'center'; x.fillText(String(n), w/2, 300);
    x.font = `bold 34px "Noto Sans KR",sans-serif`; x.fillStyle = '#7d6e58'; x.fillText(numPy(n), w/2, 350);
  });
}
function glyphTex(ch, bg = '#57504a', col = '#2a221c', size = 180) {
  return canvasTex(256, 256, (x, w, h) => {
    stoneBG(x, w, h, bg); x.strokeStyle = 'rgba(30,20,10,0.6)'; x.lineWidth = 8; x.strokeRect(6, 6, w-12, h-12);
    x.font = `bold ${size}px ${FONT_ZH}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(255,240,200,0.12)'; x.fillText(ch, w/2 + 3, h/2 + 5); x.fillStyle = col; x.fillText(ch, w/2, h/2);
  });
}
function calendarTex(month, today) {
  return canvasTex(640, 512, (x, w, h) => {
    stoneBG(x, w, h, '#4a443c');
    x.strokeStyle = '#a07e3a'; x.lineWidth = 10; x.strokeRect(10, 10, w-20, h-20);
    carveText(x, '古历 · ' + numZh(month) + '月', w/2, 58, 56);
    const now = new Date(); const first = new Date(now.getFullYear(), month - 1, 1).getDay();
    const days = new Date(now.getFullYear(), month, 0).getDate();
    const wk = ['日','一','二','三','四','五','六'];
    x.font = `bold 30px ${FONT_ZH}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    wk.forEach((d, i) => { x.fillStyle = i === 0 ? '#c0503a' : '#c9b07a'; x.fillText(d, 70 + i * 83, 120); });
    for (let d = 1; d <= days; d++) {
      const idx = first + d - 1, cx = 70 + (idx % 7) * 83, cy = 170 + Math.floor(idx / 7) * 62;
      if (d === today) { x.fillStyle = 'rgba(200,60,30,0.85)'; x.beginPath(); x.arc(cx, cy, 27, 0, 7); x.fill(); }
      x.font = `bold 30px Georgia,serif`; x.fillStyle = d === today ? '#fff3d0' : '#d8c8a8'; x.fillText(String(d), cx, cy);
    }
    x.font = `bold 24px ${FONT_ZH}`; x.fillStyle = '#e8b070'; x.fillText('●＝今天', w - 90, h - 30);
  });
}
function steleTex(codes) {
  return canvasTex(512, 320, (x, w, h) => {
    stoneBG(x, w, h, '#2e2620'); x.strokeStyle = '#b08a3c'; x.lineWidth = 8; x.strokeRect(8, 8, w-16, h-16);
    carveText(x, '五密码', w/2, 56, 54);
    for (let i = 0; i < 5; i++) {
      const cx = 66 + i * 95, cy = 190;
      x.fillStyle = '#1a1410'; x.fillRect(cx - 38, cy - 60, 76, 120); x.strokeStyle = '#7a5f2c'; x.lineWidth = 4; x.strokeRect(cx - 38, cy - 60, 76, 120);
      x.font = 'bold 76px Georgia,serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = codes[i] != null ? '#ffd27a' : '#4a3a28'; x.fillText(codes[i] != null ? String(codes[i]) : '?', cx, cy + 4);
    }
  });
}
function lightTex() { return canvasTex(64, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ffe6b0'); x.fillStyle = g; x.fillRect(0, 0, w, h); }); }

/* ---------- 병마용 (절차적 모델) ---------- */
const CLAY = [0.58, 0.4, 0.29], CLAY_D = [0.4, 0.28, 0.21], CLAY_L = [0.66, 0.5, 0.38];
function addWarriorBody(g, M, opt = {}) {
  const old = g.M; g.M = M;
  const v = opt.var || 0, clay = opt.color || [CLAY[0] + v*0.04, CLAY[1] + v*0.02, CLAY[2]], dark = opt.dark || CLAY_D;
  const mat = opt.mat != null ? opt.mat : MAT.CLAY;
  g.box(0.72, 0.12, 0.72, [0.35, 0.3, 0.26], MAT.PLAIN);
  [-0.13, 0.13].forEach(x => {
    g.cyl(0.11, 0.1, 0.55, 8, clay, mat, M4.trans(x, 0.12, 0));
    g.box(0.16, 0.1, 0.3, dark, mat, M4.trans(x, 0.12, 0.05));
  });
  g.cyl(0.37, 0.3, 0.48, 10, clay, mat, M4.trans(0, 0.6, 0));
  g.box(0.58, 0.52, 0.36, clay, mat, M4.trans(0, 1.05, 0));
  // 갑옷 판
  for (let i = 0; i < 4; i++) g.box(0.62, 0.07, 0.4, dark, mat, M4.trans(0, 1.07 + i * 0.1, 0));
  g.box(0.64, 0.05, 0.42, [0.5, 0.35, 0.25], mat, M4.trans(0, 1.02, 0)); // 허리띠
  [-1, 1].forEach(s => {
    g.sphere(0.13, 8, 6, dark, mat, M4.trans(s * 0.33, 1.47, 0));
    if (opt.pose === 'bow' && s < 0) { // 궁수: 왼손에 활
      g.box(0.13, 0.42, 0.13, clay, mat, M4.chain(M4.trans(s * 0.36, 1.12, 0.02), M4.rotZ(s * 0.25)));
      g.box(0.12, 0.13, 0.4, clay, mat, M4.trans(s * 0.44, 1.0, 0.2));
      for (let k = -3; k <= 3; k++) g.cyl(0.02, 0.02, 0.24, 4, [0.35, 0.22, 0.12], MAT.WOOD, M4.chain(M4.trans(s * 0.46, 1.0 + k * 0.2, 0.42 - Math.abs(k) * 0.03), M4.rotX(k * 0.18)));
      g.cyl(0.006, 0.006, 1.3, 3, [0.85, 0.8, 0.7], MAT.PLAIN, M4.trans(s * 0.46, 0.35, 0.3));
    } else if (opt.pose === 'reins') { // 전차병: 두 손을 앞으로 뻗어 고삐를 쥠
      g.box(0.13, 0.36, 0.13, clay, mat, M4.chain(M4.trans(s * 0.34, 1.15, 0.05), M4.rotX(-0.5)));
      g.box(0.12, 0.12, 0.42, clay, mat, M4.trans(s * 0.3, 1.08, 0.35));
      g.sphere(0.07, 6, 5, CLAY_L, mat, M4.trans(s * 0.26, 1.08, 0.58));
      if (s > 0) g.box(0.6, 0.03, 0.03, [0.3, 0.2, 0.12], MAT.WOOD, M4.trans(0, 1.08, 0.62));
    } else if (opt.pose === 'spear' && s > 0) {
      g.box(0.13, 0.42, 0.13, clay, mat, M4.chain(M4.trans(s * 0.36, 1.12, 0.02), M4.rotX(-0.1)));
      g.box(0.12, 0.34, 0.12, clay, mat, M4.chain(M4.trans(s * 0.36, 1.1, 0.06), M4.rotX(-1.2)));
      g.sphere(0.07, 6, 5, CLAY_L, mat, M4.trans(s * 0.36, 1.2, 0.36));
      g.cyl(0.025, 0.025, 2.4, 5, [0.3, 0.22, 0.15], MAT.WOOD, M4.trans(s * 0.36, 0.12, 0.36));
      g.cyl(0.05, 0, 0.25, 4, [0.45, 0.4, 0.3], MAT.BRONZE, M4.trans(s * 0.36, 2.52, 0.36));
    } else {
      // 손을 앞에 모은 자세
      g.box(0.13, 0.42, 0.13, clay, mat, M4.chain(M4.trans(s * 0.35, 1.08, 0.02), M4.rotZ(s * 0.12)));
      g.box(0.12, 0.13, 0.36, clay, mat, M4.trans(s * 0.27, 0.98, 0.18));
      g.sphere(0.07, 6, 5, CLAY_L, mat, M4.trans(s * 0.14, 1.03, 0.34));
    }
  });
  g.cyl(0.08, 0.08, 0.1, 6, clay, mat, M4.trans(0, 1.55, 0));
  g.M = old;
}
function addWarriorHead(g, M, opt = {}) {
  const old = g.M; g.M = M; const mat = opt.mat != null ? opt.mat : MAT.CLAY;
  const clay = opt.color || CLAY_L, dark = opt.dark || [0.3, 0.21, 0.16];
  g.sphere(0.15, 10, 8, clay, mat, M4.trans(0, 0.16, 0), 1.18);
  g.sphere(0.155, 10, 6, dark, mat, M4.chain(M4.trans(0, 0.21, -0.025), M4.scale(1, 0.9, 1)));
  g.sphere(0.07, 6, 5, dark, mat, M4.trans(0.07, 0.36, -0.04)); // 상투
  g.box(0.13, 0.025, 0.03, dark, mat, M4.trans(0, 0.09, 0.145)); // 콧수염
  [-0.055, 0.055].forEach(x => { g.box(0.04, 0.02, 0.02, opt.eye || [0.12, 0.08, 0.06], opt.eyeMat != null ? opt.eyeMat : mat, M4.trans(x, 0.17, 0.142)); g.sphere(0.035, 5, 4, clay, mat, M4.trans(x * 2.7, 0.15, 0)); });
  g.box(0.04, 0.06, 0.04, clay, mat, M4.trans(0, 0.11, 0.155));
  if (opt.general) { g.box(0.2, 0.12, 0.2, dark, mat, M4.trans(0, 0.32, -0.01)); g.box(0.06, 0.12, 0.22, dark, mat, M4.trans(0, 0.42, -0.01)); }
  g.M = old;
}

/* ---------- 문지기 병마용 (크고 위압적인 모델) ---------- */
function addGuardBody(g) {
  const clay = [0.44, 0.35, 0.29], dark = [0.24, 0.19, 0.16], brz = [0.5, 0.4, 0.22], stud = [0.75, 0.6, 0.3], cape = [0.32, 0.05, 0.04];
  [-1, 1].forEach(s => {
    g.box(0.2, 0.15, 0.36, dark, MAT.CLAY, M4.trans(s * 0.15, 0, 0.04));
    g.cyl(0.12, 0.11, 0.5, 8, clay, MAT.CLAY, M4.trans(s * 0.15, 0.12, 0));
    g.box(0.2, 0.32, 0.08, dark, MAT.BRONZE, M4.trans(s * 0.15, 0.2, 0.1)); // 정강이 보호대
  });
  // 겹겹의 미늘 갑옷 치마 + 징
  [[0.47, 0.41, 0.56], [0.43, 0.38, 0.72], [0.4, 0.35, 0.88]].forEach(([rb, rt, y], k) => {
    g.cyl(rb, rt, 0.17, 14, k % 2 ? dark : [0.3, 0.24, 0.19], MAT.CLAY, M4.trans(0, y, 0));
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.sphere(0.022, 4, 3, stud, MAT.GOLD, M4.trans(Math.cos(a) * (rb - 0.01), y + 0.06, Math.sin(a) * (rb - 0.01))); }
  });
  g.box(0.74, 0.56, 0.44, clay, MAT.CLAY, M4.trans(0, 1.0, 0));
  g.box(0.78, 0.5, 0.48, dark, MAT.CLAY, M4.trans(0, 1.04, 0)); // 흉갑
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) g.sphere(0.024, 4, 3, stud, MAT.GOLD, M4.trans(-0.28 + c * 0.14, 1.1 + r * 0.11, 0.245));
  g.box(0.82, 0.08, 0.5, brz, MAT.BRONZE, M4.trans(0, 0.98, 0)); g.box(0.12, 0.1, 0.04, stud, MAT.GOLD, M4.trans(0, 0.97, 0.26));
  // 망토 (해진 끝자락)
  g.box(0.74, 1.15, 0.04, cape, MAT.SILK, M4.chain(M4.trans(0, 0.42, -0.27), M4.rotX(0.08)));
  for (let k = 0; k < 6; k++) g.box(0.1, 0.12 + (k % 3) * 0.1, 0.03, cape, MAT.SILK, M4.trans(-0.3 + k * 0.12, 0.3 - (k % 3) * 0.1, -0.25));
  [-1, 1].forEach(s => {
    // 커다란 어깨 갑옷
    g.sphere(0.17, 8, 6, dark, MAT.CLAY, M4.trans(s * 0.45, 1.46, 0));
    for (let k = 0; k < 3; k++) g.box(0.34, 0.06, 0.44, k % 2 ? brz : dark, k % 2 ? MAT.BRONZE : MAT.CLAY, M4.chain(M4.trans(s * (0.47 + k * 0.03), 1.5 - k * 0.09, 0), M4.rotZ(-s * 0.55)));
    // 팔: 아래로 내린 뒤 앞으로 (두 손을 앞으로 모아 무기를 쥔 자세)
    g.box(0.16, 0.36, 0.16, clay, MAT.CLAY, M4.trans(s * 0.46, 1.06, 0.02));
    g.box(0.15, 0.15, 0.38, dark, MAT.CLAY, M4.trans(s * 0.4, 1.0, 0.2));
    g.sphere(0.085, 6, 5, [0.5, 0.4, 0.33], MAT.CLAY, M4.trans(s * 0.34, 1.0, 0.4));
    g.box(0.17, 0.06, 0.17, brz, MAT.BRONZE, M4.trans(s * 0.4, 1.1, 0.2)); // 팔찌
  });
  g.box(0.07, 0.62, 0.09, [0.2, 0.15, 0.1], MAT.WOOD, M4.chain(M4.trans(-0.44, 0.45, 0.12), M4.rotZ(0.25))); // 허리의 칼집
  g.cyl(0.17, 0.15, 0.12, 10, dark, MAT.CLAY, M4.trans(0, 1.55, 0)); g.cyl(0.18, 0.18, 0.04, 10, brz, MAT.BRONZE, M4.trans(0, 1.58, 0));
}
function addGuardHead(g) {
  const face = [0.5, 0.41, 0.35], dark = [0.13, 0.1, 0.08], brz = [0.5, 0.4, 0.22];
  g.sphere(0.16, 12, 9, face, MAT.CLAY, M4.trans(0, 0.16, 0), 1.15);
  g.box(0.21, 0.09, 0.15, face, MAT.CLAY, M4.trans(0, 0.03, 0.04));                         // 각진 턱
  g.box(0.13, 0.05, 0.03, [0.22, 0.17, 0.14], MAT.CLAY, M4.trans(0, 0.178, 0.142));             // 깊은 눈두덩
  [-1, 1].forEach(s => {
    g.box(0.11, 0.038, 0.05, dark, MAT.CLAY, M4.chain(M4.trans(s * 0.062, 0.222, 0.148), M4.rotZ(s * 0.38))); // 찌푸린 눈썹
    g.box(0.09, 0.022, 0.035, dark, MAT.CLAY, M4.chain(M4.trans(s * 0.045, 0.085, 0.158), M4.rotZ(-s * 0.45))); // 처진 콧수염
    g.box(0.03, 0.15, 0.12, brz, MAT.BRONZE, M4.trans(s * 0.168, 0.12, 0.02));             // 볼 보호대
  });
  g.box(0.045, 0.07, 0.05, face, MAT.CLAY, M4.trans(0, 0.13, 0.16));                           // 코
  g.box(0.07, 0.015, 0.02, dark, MAT.CLAY, M4.trans(0, 0.065, 0.152));                          // 굳게 다문 입
  g.box(0.13, 0.12, 0.07, dark, MAT.CLAY, M4.trans(0, -0.03, 0.12)); g.cyl(0.05, 0, 0.12, 6, dark, MAT.CLAY, M4.chain(M4.trans(0, -0.08, 0.13), M4.rotX(Math.PI))); // 수염
  // 투구
  g.sphere(0.18, 12, 7, brz, MAT.BRONZE, M4.chain(M4.trans(0, 0.21, -0.01), M4.scale(1, 0.85, 1)));
  g.cyl(0.19, 0.19, 0.045, 14, [0.36, 0.28, 0.15], MAT.BRONZE, M4.trans(0, 0.2, -0.01));
  g.box(0.3, 0.13, 0.05, brz, MAT.BRONZE, M4.trans(0, 0.06, -0.16));                         // 목 보호대
  g.box(0.045, 0.06, 0.3, [0.36, 0.28, 0.15], MAT.BRONZE, M4.trans(0, 0.36, -0.01));         // 투구 볏
  g.cyl(0.06, 0, 0.3, 6, [0.6, 0.07, 0.05], MAT.SILK, M4.trans(0, 0.39, -0.03));              // 붉은 깃털 장식
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.box(0.025, 0.22, 0.025, [0.55, 0.06, 0.04], MAT.SILK, M4.chain(M4.trans(Math.cos(a) * 0.04, 0.42, Math.sin(a) * 0.04 - 0.03), M4.rotX(Math.sin(a) * 0.5), M4.rotZ(Math.cos(a) * 0.5), M4.trans(0, -0.18, 0))); }
}

/* ---------- 월드 생성 ---------- */
function buildWorld() {
  const grid = buildGrid();
  const W = {
    grid, lights: [], torches: [], circles: [], interact: [], warriors: [], doors: {}, decals: [], markers: [],
    shadows: [], flamePts: [], flameSeeds: [], mistQuads: [], revealed: new Uint8Array(MW * MH), dyn: {},
  };
  const at = (r, c) => (r < 0 || c < 0 || r >= MH || c >= MW) ? '#' : grid[r][c];
  const isDoor = ch => DOOR_H[ch] != null;
  const ceilOf = (r, c) => { const ch = at(r, c); if (ch === '#') return 0; if (isDoor(ch)) return DOOR_H[ch]; return ZONES[zoneOfCell(r, c)].ceil; };
  W.at = at; W.ceilOf = ceilOf; W.isDoor = isDoor;

  const g = new Geo(); const fr = new Geo();
  const wallCol = { 1: [0.36, 0.34, 0.33], 2: [0.42, 0.34, 0.27], 8: [0.3, 0.29, 0.28], 3: [0.33, 0.36, 0.35], 4: [0.4, 0.35, 0.28], 9: [0.32, 0.37, 0.33], 10: [0.32, 0.37, 0.33], 5: [0.3, 0.28, 0.3], 6: [0.38, 0.3, 0.27], 7: [0.85, 0.82, 0.75] };
  const floorCol = { 1: [0.36, 0.34, 0.31], 2: [0.45, 0.36, 0.28], 8: [0.3, 0.29, 0.27], 3: [0.34, 0.35, 0.33], 4: [0.38, 0.33, 0.26], 9: [0.33, 0.35, 0.31], 10: [0.33, 0.35, 0.31], 5: [0.28, 0.27, 0.27], 6: [0.36, 0.3, 0.27], 7: [0.9, 0.86, 0.78] };
  const addTorch = (x, z, nx, nz, y = 2.4, big = false, zone = 1) => {
    const M = M4.chain(M4.trans(x, 0, z), M4.rotY(Math.atan2(nx, nz)));
    g.box(0.12, 0.12, 0.45, [0.3, 0.25, 0.18], MAT.BRONZE, M4.chain(M, M4.trans(0, y - 0.2, 0.2)));
    g.cyl(0.05, 0.17, 0.22, 8, [0.45, 0.35, 0.2], MAT.BRONZE, M4.chain(M, M4.trans(0, y, 0.42)));
    g.sphere(0.12, 6, 4, [1, 0.45, 0.12], MAT.EMIT, M4.chain(M, M4.trans(0, y + 0.2, 0.42)), 0.5);
    const fx = x + nx * 0.42, fz = z + nz * 0.42;
    for (let i = 0; i < 9; i++) { W.flamePts.push(fx + (Math.random() - 0.5) * 0.12, y + 0.22, fz + (Math.random() - 0.5) * 0.12); W.flameSeeds.push(i / 9, 0); }
    W.lights.push({ x: x + nx * 0.8, y: y + 0.4, z: z + nz * 0.8, r: zone === 5 ? 9 : 12, c: [1, 0.55, 0.25], base: zone === 5 ? 1.0 : 1.35, ph: Math.random() * 10 });
  };
  const addBrazier = (x, z, s = 1) => {
    g.cyl(0.5 * s, 0.7 * s, 0.5 * s, 12, [0.4, 0.33, 0.22], MAT.BRONZE, M4.trans(x, 0.9 * s, z));
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; g.cyl(0.07 * s, 0.05 * s, 0.95 * s, 6, [0.35, 0.3, 0.2], MAT.BRONZE, M4.trans(x + Math.cos(a) * 0.45 * s, 0, z + Math.sin(a) * 0.45 * s)); }
    g.sphere(0.55 * s, 10, 5, [1, 0.4, 0.1], MAT.EMIT, M4.trans(x, 1.35 * s, z), 0.35);
    for (let i = 0; i < 26; i++) { W.flamePts.push(x + (Math.random() - 0.5) * 0.7 * s, 1.45 * s, z + (Math.random() - 0.5) * 0.7 * s); W.flameSeeds.push(Math.random(), 0); }
    W.lights.push({ x, y: 2.4 * s, z, r: 16, c: [1, 0.5, 0.2], base: 1.7, ph: Math.random() * 10 });
    W.circles.push({ x, z, r: 0.8 * s });
  };

  /* ----- 바닥 / 천장 / 벽 ----- */
  const N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let r = 0; r < MH; r++) for (let c = 0; c < MW; c++) {
    const ch = at(r, c); if (ch === '#') continue;
    const z0 = r * T, z1 = (r + 1) * T, x0 = c * T, x1 = (c + 1) * T, zn = zoneOfCell(r, c), h = ceilOf(r, c);
    const fc = floorCol[zn], wc = wallCol[zn];
    if ((r === 38 || r === 40) && c >= 14 && c <= 16) { // 무너지는 발판 아래 구덩이
      const pc = [0.05, 0.045, 0.04], d = -5;
      g.quad([x0, d, z1], [x1, d, z1], [x1, d, z0], [x0, d, z0], [0, 1, 0], pc, MAT.PLAIN);
      g.quad([x0, d, z0], [x1, d, z0], [x1, 0, z0], [x0, 0, z0], [0, 0, 1], pc, MAT.WALL); g.quad([x1, d, z1], [x0, d, z1], [x0, 0, z1], [x1, 0, z1], [0, 0, -1], pc, MAT.WALL);
      g.quad([x0, d, z1], [x0, d, z0], [x0, 0, z0], [x0, 0, z1], [1, 0, 0], pc, MAT.WALL); g.quad([x1, d, z0], [x1, d, z1], [x1, 0, z1], [x1, 0, z0], [-1, 0, 0], pc, MAT.WALL);
    } else g.quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], [0, 1, 0], fc, zn === 7 ? MAT.EMIT : MAT.FLOOR);
    g.quad([x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1], [0, -1, 0], [wc[0] * 0.7, wc[1] * 0.7, wc[2] * 0.7], zn === 7 ? MAT.EMIT : MAT.CEIL);
    for (const [dr, dc] of N4) {
      const nch = at(r + dr, c + dc); const solid = nch === '#';
      const y0 = solid ? 0 : ceilOf(r + dr, c + dc);
      if (y0 >= h) continue;
      // 문 셀의 옆벽 / 높이 차이 벽
      let a, b, cc, d, n;
      if (dr === -1) { a = [x0, y0, z0]; b = [x1, y0, z0]; cc = [x1, h, z0]; d = [x0, h, z0]; n = [0, 0, 1]; }
      else if (dr === 1) { a = [x1, y0, z1]; b = [x0, y0, z1]; cc = [x0, h, z1]; d = [x1, h, z1]; n = [0, 0, -1]; }
      else if (dc === -1) { a = [x0, y0, z1]; b = [x0, y0, z0]; cc = [x0, h, z0]; d = [x0, h, z1]; n = [1, 0, 0]; }
      else { a = [x1, y0, z0]; b = [x1, y0, z1]; cc = [x1, h, z1]; d = [x1, h, z0]; n = [-1, 0, 0]; }
      const mat = (zn === 7) ? MAT.EMIT : MAT.WALL;
      g.quad(a, b, cc, d, n, wc, mat);
      if (!solid) continue;
      // 걸레받이
      const bx = (a[0] + b[0]) / 2 + n[0] * 0.08, bz = (a[2] + b[2]) / 2 + n[2] * 0.08;
      g.box(Math.abs(b[0] - a[0]) + Math.abs(n[0]) * 0.16, 0.35, Math.abs(b[2] - a[2]) + Math.abs(n[2]) * 0.16, [wc[0] * 0.6, wc[1] * 0.6, wc[2] * 0.6], MAT.WALL, M4.trans(bx, 0, bz));
      // 장식 띠 (회문)
      if (h >= 6 && zn !== 7) {
        const fy0 = 3.6, fy1 = 4.1, off = 0.02;
        const A = [a[0] + n[0] * off, fy0, a[2] + n[2] * off], B = [b[0] + n[0] * off, fy0, b[2] + n[2] * off];
        fr.quad(A, B, [B[0], fy1, B[2]], [A[0], fy1, A[2]], n, [1, 1, 1], MAT.PLAIN, [[0, 1], [1, 1], [1, 0], [0, 0]]);
      }
      // 횃불 배치
      const along = (dr !== 0) ? c : r;
      const every = zn === 5 ? 4 : zn === 8 ? 3 : 3;
      if (along % every === 1 && zn !== 7 && zn !== 9 && zn !== 10 && zn !== 6 && zn !== 8 && !isDoor(ch) && !(zn === 3 && r <= 41)) {
        const tx = (a[0] + b[0]) / 2, tz = (a[2] + b[2]) / 2;
        addTorch(tx, tz, n[0], n[2], zn === 5 || zn === 8 ? 2.1 : 2.6, false, zn);
      }
    }
  }
  // 대형 공간의 천장 들보
  for (let z = 133; z < 154; z += 4) g.box(30, 0.5, 0.6, [0.25, 0.19, 0.13], MAT.WOOD, M4.trans(31, 8.4, z));
  for (let z = 107; z < 130; z += 4) g.box(50, 0.5, 0.6, [0.27, 0.2, 0.14], MAT.WOOD, M4.trans(31, 7.4, z));
  for (let x = 14; x < 50; x += 4) g.box(0.5, 0.4, 7.6, [0.27, 0.2, 0.14], MAT.WOOD, M4.trans(x, 6.0, 88));

  /* ----- 기둥 ----- */
  for (let r = 0; r < MH; r++) for (let c = 0; c < MW; c++) if (at(r, c) === 'o') {
    const x = cellX(c), z = cellZ(r), h = ceilOf(r, c);
    g.cyl(0.95, 0.95, 0.5, 8, [0.3, 0.27, 0.24], MAT.WALL, M4.trans(x, 0, z));
    g.cyl(0.7, 0.62, h - 0.9, 12, [0.34, 0.24, 0.17], MAT.WOOD, M4.trans(x, 0.5, z));
    g.cyl(0.66, 0.66, 0.25, 12, [0.42, 0.34, 0.2], MAT.BRONZE, M4.trans(x, 1.6, z));
    g.cyl(0.64, 0.64, 0.25, 12, [0.42, 0.34, 0.2], MAT.BRONZE, M4.trans(x, h - 1.8, z));
    g.box(1.6, 0.4, 1.6, [0.28, 0.2, 0.13], MAT.WOOD, M4.trans(x, h - 0.4, z));
    W.circles.push({ x, z, r: 0.95, pillar: true });
  }

  /* ----- 장식 소품 ----- */
  const rng = makeRng(20260);
  const jar = (x, z, s = 1, col = [0.45, 0.3, 0.2]) => {
    g.sphere(0.35 * s, 10, 7, col, MAT.CLAY, M4.trans(x, 0.42 * s, z), 1.2);
    g.cyl(0.16 * s, 0.2 * s, 0.25 * s, 10, col, MAT.CLAY, M4.trans(x, 0.75 * s, z));
    g.cyl(0.22 * s, 0.22 * s, 0.05 * s, 10, [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8], MAT.CLAY, M4.trans(x, 0.98 * s, z));
    W.circles.push({ x, z, r: 0.42 * s });
  };
  const ding = (x, z, s = 1) => { // 청동 세발솥
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.5; g.cyl(0.07 * s, 0.09 * s, 0.45 * s, 6, [0.33, 0.4, 0.3], MAT.BRONZE, M4.trans(x + Math.cos(a) * 0.33 * s, 0, z + Math.sin(a) * 0.33 * s)); }
    g.sphere(0.5 * s, 12, 8, [0.38, 0.42, 0.3], MAT.BRONZE, M4.chain(M4.trans(x, 0.75 * s, z), M4.scale(1, 0.7, 1)));
    g.cyl(0.47 * s, 0.5 * s, 0.25 * s, 12, [0.4, 0.43, 0.3], MAT.BRONZE, M4.trans(x, 0.85 * s, z));
    [-1, 1].forEach(sd => g.box(0.08 * s, 0.35 * s, 0.25 * s, [0.38, 0.42, 0.3], MAT.BRONZE, M4.trans(x + sd * 0.38 * s, 1.08 * s, z)));
    W.circles.push({ x, z, r: 0.55 * s });
  };
  const coins = (x, z, n, rad) => {
    g.cyl(rad, rad * 0.2, rad * 0.45, 10, [0.75, 0.58, 0.2], MAT.GOLD, M4.trans(x, 0, z));
    for (let i = 0; i < n; i++) { const a = rng() * 6.28, d = rng() * rad * 1.3; g.cyl(0.07, 0.07, 0.02, 7, [0.85, 0.66, 0.25], MAT.GOLD, M4.chain(M4.trans(x + Math.cos(a) * d, 0.01 + rng() * rad * 0.4 * (1 - d / (rad * 1.3)), z + Math.sin(a) * d), M4.rotX((rng() - 0.5) * 0.6))); }
    W.circles.push({ x, z, r: rad * 0.9 });
  };
  const rubble = (x, z, n) => { for (let i = 0; i < n; i++) { const s = 0.1 + rng() * 0.25; g.box(s, s * 0.7, s * 1.2, [0.33, 0.31, 0.29], MAT.WALL, M4.chain(M4.trans(x + (rng() - .5) * 1.5, 0, z + (rng() - .5) * 1.5), M4.rotY(rng() * 3))); } };
  const deco = (tex, w, h, M) => W.decals.push({ tex, w, h, M });
  const plaqueOver = (tex, x, zFace, y, w = 3.2, flip = false) => deco(tex, w, w * 160 / 512, M4.chain(M4.trans(x, y, zFace), M4.rotY(flip ? Math.PI : 0)));

  // ===== 구역 1: 지하 무덤 입구 =====
  addBrazier(23, 147, 1); addBrazier(39, 147, 1);
  [[18.5, 140], [18.5, 150], [43.5, 136], [43.5, 152], [19, 144]].forEach(([x, z], i) => jar(x, z, 0.9 + (i % 3) * 0.15));
  rubble(24, 152, 8); rubble(40, 140, 6);
  // 입구 문지기 병마용 2개 (MISSION 1)
  // 문지기 병마용 2명: 거대한 석상 받침대 위, 미늘창(戟)으로 석문을 막고 서 있다
  // 미션 전: 석문 바로 앞에 나란히 서서 문을 완전히 가로막음 (bx) → 미션 성공 후 양옆(ox)으로 비켜섬
  [[29.4, 26.2], [32.6, 35.8]].forEach(([bx, ox], i) => {
    W.warriors.push({ x: bx, bx, ox, z: 134.6, yaw: 0, s: 1.75, y: 0.55, kind: 'guard', mission: 1, dyn: true, side: i === 0 ? 1 : -1 });
  });
  W.guardBlock = { x: 31, z: 134.6, r: 0.75 }; W.circles.push(W.guardBlock); // 두 받침대 사이 틈도 막음

  addBrazier(24.0, 137.8, 0.85); addBrazier(38.0, 137.8, 0.85);           // 아래에서 비추는 화로
  W.lights[W.lights.length - 1].pri = W.lights[W.lights.length - 2].pri = true;
  W.lights.push({ x: 26.2, y: 6.4, z: 138.2, r: 12.5, c: [0.6, 0.66, 0.9], base: 0.95, ph: 0, pri: true }); // 위에서 내려오는 차가운 빛
  W.lights.push({ x: 35.8, y: 6.4, z: 138.2, r: 12.5, c: [0.6, 0.66, 0.9], base: 0.95, ph: 1, pri: true });
  // 거대한 석문 위 현판
  plaqueOver(canvasTex(512, 160, (x, w, h) => { stoneBG(x, w, h, '#2b1d14'); x.strokeStyle = '#b08a3c'; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16); carveText(x, '秦始皇陵', w/2, h/2 + 4, 92); }), 31, 132.03, 7.9, 6);
  deco(glyphTex('秦', '#4d4640', '#9a7a3a'), 1.6, 1.6, M4.chain(M4.trans(16.03, 4.6, 143), M4.rotY(Math.PI / 2)));
  deco(glyphTex('皇', '#4d4640', '#9a7a3a'), 1.6, 1.6, M4.chain(M4.trans(45.97, 4.6, 143), M4.rotY(-Math.PI / 2)));

  // ===== 구역 2: 병마용의 방 =====
  let wi = 0;
  for (let r = 0; r < 4; r++) for (const side of [-1, 1]) for (let k = 0; k < 5; k++) {
    const x = side < 0 ? 9 + k * 2.2 : 44 + k * 2.2, z = 110 + r * 4.2;
    W.warriors.push({ x, z, yaw: 0, s: 1 + ((wi * 7) % 5) * 0.025, kind: 'hall', var: (wi * 3) % 4, pose: (k + r) % 2 ? 'spear' : 'stand' }); wi++;
  }
  // 흙 칸막이(얕은 둑)
  for (const x0 of [7.5, 42.5]) for (let r = 0; r < 5; r++) g.box(11.6, 0.6, 0.5, [0.38, 0.29, 0.21], MAT.CLAY, M4.trans(x0 + 4.9 + (x0 > 30 ? -0.4 : 0), 0, 107.9 + r * 4.2));
  for (const x0 of [7.5, 42.5]) for (let r = 0; r < 5; r++) W.circles.push(...[0, 1, 2, 3, 4, 5].map(i => ({ x: x0 + 0.3 + i * 2.1 + (x0 > 30 ? -0.4 : 0), z: 107.9 + r * 4.2, r: 0.35 })));
  // ===== MISSION 2: 사라진 황제의 옥새 — 사건 현장 =====
  // 비어 있는 황금 받침대
  g.box(2.4, 0.4, 2.4, [0.28, 0.24, 0.21], MAT.WALL, M4.trans(31, 0, 115));
  g.cyl(0.75, 0.9, 0.9, 12, [0.8, 0.6, 0.22], MAT.GOLD, M4.trans(31, 0.4, 115));
  g.box(0.9, 0.12, 0.9, [0.65, 0.08, 0.06], MAT.SILK, M4.trans(31, 1.3, 115));
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; g.cyl(0.05, 0.05, 0.5, 6, [0.8, 0.6, 0.22], MAT.GOLD, M4.trans(31 + Math.cos(a) * 0.5, 1.3, 115 + Math.sin(a) * 0.5)); }
  W.circles.push({ x: 31, z: 115, r: 1.3 });
  addBrazier(24, 114, 0.8); addBrazier(38, 114, 0.8);
  // 용의자 4명 (동적 메시: 범인은 정답 후 움직인다)
  W.suspects = {};
  const SUS = [['gen', 25, 'stand', 1.2], ['arch', 29, 'bow', 1.12], ['char', 33, 'reins', 1.12], ['inf', 37, 'spear', 1.12]];
  SUS.forEach(([id, x, pose, s]) => {
    const w = { x, z: 121, yaw: 0, s, kind: 'suspect', sid: id, pose, dyn: true, var: 1 };
    W.warriors.push(w); W.suspects[id] = w;
    g.box(1.0, 0.55, 0.25, [0.3, 0.26, 0.22], MAT.WALL, M4.trans(x, 0, 122.4));
  });
  // 전차병 아래 바닥 비밀칸 테두리
  g.box(1.2, 0.02, 1.2, [0.22, 0.2, 0.18], MAT.WALL, M4.trans(33, 0, 121));
  // 단서 오브젝트 위치
  W.clues = {
    incident: { x: 31, z: 117.7, type: 'paper' },
    gen: { x: 23.2, z: 112.6, type: 'slip' },
    arch: { x: 18.6, z: 117.25, type: 'slip' },
    char: { x: 15.2, z: 128, type: 'slip' },
    inf: { x: 54.6, z: 114, type: 'slip' },
    rule: { x: 36, z: 107.6, type: 'stele' },
  };
  const slip = (x, z, rot) => { for (let i = 0; i < 7; i++) g.cyl(0.025, 0.025, 0.55, 5, [0.72, 0.6, 0.35], MAT.WOOD, M4.chain(M4.trans(x, 0.03, z), M4.rotY(rot), M4.trans(-0.18 + i * 0.06, 0, -0.27), M4.rotX(Math.PI / 2))); g.box(0.46, 0.012, 0.03, [0.45, 0.15, 0.1], MAT.SILK, M4.chain(M4.trans(x, 0.05, z), M4.rotY(rot), M4.trans(0, 0, 0.1))); };
  slip(23.2, 112.6, 0.4); slip(18.6, 117.25, -0.3); slip(15.2, 128, 1.1); slip(54.6, 114, 2.0);
  g.box(0.7, 0.01, 0.5, [0.78, 0.7, 0.55], MAT.PLAIN, M4.chain(M4.trans(31, 0.005, 117.7), M4.rotY(0.25)));
  // 무덤의 규칙 비석
  g.box(2.0, 0.4, 0.9, [0.26, 0.23, 0.2], MAT.WALL, M4.trans(36, 0, 106.6));
  g.box(1.7, 2.6, 0.35, [0.3, 0.28, 0.26], MAT.WALL, M4.trans(36, 0.4, 106.55));
  W.circles.push({ x: 35.5, z: 106.6, r: 0.6 }); W.circles.push({ x: 36.5, z: 106.6, r: 0.6 });
  deco(canvasTex(384, 576, (x, w, h) => { stoneBG(x, w, h, '#3e3a35'); x.strokeStyle = '#8c6a3c'; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20);
    carveText(x, '墓 规', w / 2, 70, 56); x.font = `bold 38px ${FONT_ZH}`; x.textAlign = 'center'; x.fillStyle = '#c9a55a';
    ['两个人以上', '在房间里的时候，', '谁也不能', '拿玉玺。'].forEach((l, i) => x.fillText(l, w / 2, 170 + i * 72)); }), 1.5, 2.25, M4.trans(36, 1.75, 106.74));
  // 이름표
  const nameTex = (zh, py, ko) => canvasTex(320, 176, (x, w, h) => { stoneBG(x, w, h, '#2b211a'); x.strokeStyle = '#b08a3c'; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12); carveText(x, zh, w / 2, 68, 64); x.font = 'bold 24px "Noto Sans KR",sans-serif'; x.fillStyle = '#c9b48a'; x.textAlign = 'center'; x.fillText(py + ' · ' + ko, w / 2, 138); });
  [['将军', 'jiāngjūn', '장군', 25], ['弓箭手', 'gōngjiànshǒu', '궁수', 29], ['车兵', 'chēbīng', '전차병', 33], ['步兵', 'bùbīng', '보병', 37]].forEach(([zh, py, ko, x]) => { deco(nameTex(zh, py, ko), 0.95, 0.52, M4.trans(x, 0.3, 122.53)); W.decals[W.decals.length - 1].emis = 0.45; });
  // 말 대신 전차 바퀴 장식
  [[13, 127], [49, 127]].forEach(([x, z]) => { g.cyl(0.9, 0.9, 0.12, 14, [0.32, 0.23, 0.15], MAT.WOOD, M4.chain(M4.trans(x, 0.9, z), M4.rotZ(Math.PI / 2), M4.trans(0, -0.06, 0))); W.circles.push({ x, z, r: 0.6 }); });
  plaqueOver(plaqueTex('秘密通道', '좁은 비밀 통로'), 31, 106.03, 4.6, 3);
  plaqueOver(plaqueTex('兵马俑坑', '병마용의 방'), 31, 132 - 0.03, 7.5, 3, true);

  // ===== 구역 3: 비밀 암호의 방 =====
  for (let i = 0; i < 5; i++) deco(numberTabletTex(i + 1), 1.3, 1.95, M4.chain(M4.trans(12.03, 2.6, 84.6 + i * 1.6), M4.rotY(Math.PI / 2)));
  [84.9, 91.1].forEach((z, i) => deco(numberTabletTex(i + 6), 1.3, 1.95, M4.chain(M4.trans(49.97, 2.6, z), M4.rotY(-Math.PI / 2))));
  [[17, 8], [20.5, 9], [24, 10], [38, 1], [41.5, 2], [45, 3]].forEach(([x, n]) => deco(numberTabletTex(n), 1.3, 1.95, M4.trans(x, 2.6, 84.03)));
  // 낙서(洛书) 돌판 3x3
  const lo = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  for (let i = 0; i < 9; i++) {
    const x = 28.6 + (i % 3) * 2.4, z = 85.6 + Math.floor(i / 3) * 2.4;
    g.box(2.1, 0.05, 2.1, [0.3, 0.3, 0.29], MAT.WALL, M4.trans(x, 0, z));
    deco(glyphTex(numZh(lo[i]), '#3c3a36', '#a88c4c', 150), 1.3, 1.3, M4.chain(M4.trans(x, 0.06, z), M4.rotX(-Math.PI / 2)));
  }
  W.calTex = null; // 미션 생성 후 달력 생성
  W.calendarPos = { x: 49.68, y: 2.9, z: 88 };
  g.box(0.3, 3.4, 3.8, [0.25, 0.2, 0.16], MAT.WOOD, M4.trans(49.85, 1.1, 88));
  [[14, 90.8], [48, 85.2]].forEach(([x, z]) => jar(x, z, 0.8, [0.3, 0.32, 0.3]));
  plaqueOver(plaqueTex('皇帝宝库', '황제의 보물창고'), 31, 76.03, 4.6, 3);

  // ===== 구역 4: 황제의 보물창고 =====
  g.box(3.6, 0.35, 3, [0.3, 0.24, 0.2], MAT.WALL, M4.trans(31, 0, 65));
  W.circles.push({ x: 31, z: 65, r: 1.5 });
  // 상자 본체 (뚜껑은 동적)
  g.box(1.6, 0.8, 1.0, [0.35, 0.18, 0.1], MAT.WOOD, M4.trans(31, 0.35, 65));
  [-0.6, 0, 0.6].forEach(dx => g.box(0.12, 0.82, 1.04, [0.75, 0.58, 0.25], MAT.GOLD, M4.trans(31 + dx, 0.35, 65)));
  g.box(1.4, 0.05, 0.8, [0.8, 0.1, 0.05], MAT.EMIT, M4.trans(31, 1.1, 65)); // 안쪽 붉은 빛
  W.chest = { x: 31, z: 65, lid: 0, open: false };
  [[18, 60], [44, 60], [18, 71], [44, 71]].forEach(([x, z]) => ding(x, z, 1.1));
  [[13, 59.5], [15.5, 59.5], [48.5, 59.5], [13, 71.5], [48.5, 72]].forEach(([x, z], i) => jar(x, z, 1 + (i % 2) * 0.2, [0.42, 0.3, 0.18]));
  coins(24, 66, 70, 0.8); coins(38, 64, 70, 0.8); coins(26, 61, 40, 0.55); coins(36, 69.5, 45, 0.6);
  // 비단 두루마리
  [[0.7, 0.1, 0.1], [0.85, 0.7, 0.2], [0.15, 0.45, 0.4], [0.5, 0.15, 0.45]].forEach((col, i) => {
    g.cyl(0.18, 0.18, 1.4, 10, col, MAT.SILK, M4.chain(M4.trans(40 + i * 0.05, 0.18 + (i > 1 ? 0.33 : 0), 70 + (i % 2) * 0.38 - 0.2), M4.rotZ(Math.PI / 2), M4.trans(0, -0.7, 0)));
  });
  W.circles.push({ x: 40, z: 70, r: 0.8 });
  // 비단 걸이
  g.box(0.1, 2.2, 0.1, [0.3, 0.2, 0.12], MAT.WOOD, M4.trans(20.5, 0, 69)); g.box(0.1, 2.2, 0.1, [0.3, 0.2, 0.12], MAT.WOOD, M4.trans(22.5, 0, 69));
  g.box(2.3, 0.1, 0.1, [0.3, 0.2, 0.12], MAT.WOOD, M4.trans(21.5, 2.2, 69));
  g.box(1.8, 1.7, 0.03, [0.65, 0.12, 0.1], MAT.SILK, M4.trans(21.5, 0.45, 69));
  W.circles.push({ x: 21.5, z: 69, r: 1.1 });
  // 금괴
  for (let i = 0; i < 6; i++) g.box(0.4, 0.15, 0.2, [0.85, 0.65, 0.2], MAT.GOLD, M4.chain(M4.trans(33.5 + (i % 3) * 0.45, Math.floor(i / 3) * 0.15, 61), M4.rotY(0.1)));
  // 숨겨진 방의 옥새
  g.box(1.2, 1.0, 1.2, [0.28, 0.25, 0.22], MAT.WALL, M4.trans(3.5, 0, 65));
  g.box(0.4, 0.25, 0.4, [0.35, 0.75, 0.5], MAT.GOLD, M4.trans(3.5, 1.0, 65));
  g.sphere(0.13, 8, 6, [0.4, 0.8, 0.55], MAT.GOLD, M4.trans(3.5, 1.33, 65));
  W.circles.push({ x: 3.5, z: 65, r: 0.8 });
  W.lights.push({ x: 4, y: 2.5, z: 65, r: 7, c: [0.4, 1, 0.6], base: 0.9, ph: 0, secret: true });
  deco(glyphTex('龍', '#3c3a36', '#6d5a3a', 170), 1.2, 1.2, M4.chain(M4.trans(10.03, 1.8, 65), M4.rotY(Math.PI / 2))); W.decals[W.decals.length - 1].secret = true;
  plaqueOver(plaqueTex('最后的迷宫', '마지막 미로'), 31, 58.03, 4.6, 3);

  // ===== 구역 5: 미로 =====
  W.warriors.push({ x: 49.2, z: 45, yaw: -Math.PI / 2, s: 1.1, kind: 'maze', mission: 5, step: 0, pose: 'spear' });
  W.warriors.push({ x: 15, z: 37.3, yaw: Math.PI, s: 1.1, kind: 'maze', mission: 5, step: 1, pose: 'spear' });
  W.warriors.push({ x: 33.3, z: 21, yaw: -Math.PI / 2, s: 1.1, kind: 'maze', mission: 5, step: 2, pose: 'spear' });
  W.deadEnds = [
    { r: 21, c: 10, sx: cellX(5), sz: cellZ(21), dx: 0, dz: 1 },
    { r: 20, c: 11, sx: cellX(9), sz: cellZ(17), dx: 1, dz: 0 },
    { r: 14, c: 19, sx: cellX(17), sz: cellZ(17), dx: 1, dz: 0 },
    { r: 15, c: 25, sx: cellX(22), sz: cellZ(12), dx: 1, dz: 0 },
  ];
  rubble(cellX(10), cellZ(21), 6); rubble(cellX(25), cellZ(15), 6);

  // ===== 구역 6: 최종 탈출구 =====
  addBrazier(21, 10, 1.2); addBrazier(41, 10, 1.2);
  [[19, 15], [43, 15], [19, 7.5], [43, 7.5]].forEach(([x, z]) => W.warriors.push({ x, z, yaw: x < 31 ? Math.PI / 2 : -Math.PI / 2, s: 2.0, kind: 'statue', pose: 'spear' }));
  // 암호 입력 장치
  g.box(3.2, 0.3, 1.6, [0.28, 0.24, 0.2], MAT.WALL, M4.trans(31, 0, 10.2));
  g.box(2.8, 1.0, 0.9, [0.32, 0.27, 0.22], MAT.WALL, M4.trans(31, 0.3, 10.2));
  for (let i = 0; i < 5; i++) g.cyl(0.2, 0.2, 0.18, 12, [0.6, 0.48, 0.25], MAT.BRONZE, M4.chain(M4.trans(29.6 + i * 0.7, 1.3, 10.5), M4.rotX(0.5)));
  W.circles.push({ x: 31, z: 10.2, r: 1.5 }); W.circles.push({ x: 30, z: 8.4, r: 0.6 }); W.circles.push({ x: 32, z: 8.4, r: 0.6 });
  W.steleDecal = { w: 3.4, h: 2.1, M: M4.trans(31, 2.45, 8.62) };
  g.box(3.8, 2.8, 0.4, [0.24, 0.2, 0.17], MAT.WALL, M4.trans(31, 0.8, 8.4));
  plaqueOver(canvasTex(512, 160, (x, w, h) => { stoneBG(x, w, h, '#2b1d14'); x.strokeStyle = '#b08a3c'; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16); carveText(x, '生 门', w/2, h/2 + 4, 92); }), 31, 6.03, 9.6, 5);
  // 바깥의 밝은 빛
  W.lights.push({ x: 31, y: 5, z: 2, r: 30, c: [1, 0.95, 0.85], base: 0, ph: 0, exit: true });

  // ===== 액션 요소: 단서 비석 / 아이템 / 함정 장치 =====
  const stele = (x, z, yaw) => { const M = M4.chain(M4.trans(x, 0, z), M4.rotY(yaw)); g.box(1.9, 0.3, 0.8, [0.26, 0.23, 0.2], MAT.WALL, M); g.box(1.6, 2.2, 0.3, [0.32, 0.29, 0.26], MAT.WALL, M4.chain(M, M4.trans(0, 0.3, 0))); g.box(1.8, 0.2, 0.4, [0.4, 0.3, 0.18], MAT.BRONZE, M4.chain(M, M4.trans(0, 2.5, 0))); W.circles.push({ x, z, r: 0.75 }); };
  // 단서 비석: 텍스트는 게임마다 정해지므로(applyState) 위치만 기록
  W.signs = {
    torch:  { x: 23.6, z: 148.2, yaw: 0.25, kind: 'stele' },
    patrol: { x: 38, z: 128.4, yaw: 0, kind: 'stele' },
    arrow:  { x: 27.4, z: 107.3, yaw: 0, kind: 'stele' },
    floor:  { x: 36.8, z: 85.2, yaw: 0, kind: 'stele' },
    treas:  { x: 26.5, z: 72.6, yaw: 0, kind: 'stele' },
    boulder:{ x: 30.03, z: 55, yaw: Math.PI / 2, kind: 'wall', y: 1.9, ix: 31, iz: 55 },
    gkey:   { x: 35, z: 24.03, yaw: 0, kind: 'wall', y: 1.9, ix: 35, iz: 25 },
    final:  { x: 31, z: 10.67, yaw: 0, kind: 'wall', y: 0.8, w: 2.4, h: 0.9, ix: 28.4, iz: 11.6 },
  };
  Object.values(W.signs).forEach(sg => {
    if (sg.kind === 'stele') { stele(sg.x, sg.z, sg.yaw); sg.y = 1.55; sg.w = 1.4; sg.h = 1.9; sg.dz = 0.16; sg.ix = sg.x; sg.iz = sg.z + 1.3; }
    sg.w = sg.w || 1.7; sg.h = sg.h || 1.15;
    const off = sg.dz || 0; sg.M = M4.chain(M4.trans(sg.x + Math.sin(sg.yaw) * off, sg.y, sg.z + Math.cos(sg.yaw) * off), M4.rotY(sg.yaw));
  });
  // 아이템 (획득 전까지 떠 있는 3D 오브젝트)
  W.items = {
    torch:  { x: 16.9, y: 2.0, z: 144, px: 17.6, pz: 144 },
    shield: { x: 9.5, y: 0.9, z: 128.6 },
    bkey:   { x: 12.4, y: 0.8, z: 72.6 },
    map:    { x: 15.5, y: 0.9, z: 66 },
    seal2:  { x: 57.5, y: 1.35, z: 65 },
    gkey:   { x: 51, y: 0.9, z: 30.8 },
  };
  g.box(0.12, 0.12, 0.6, [0.3, 0.25, 0.18], MAT.BRONZE, M4.trans(16.3, 1.75, 144)); // 횃불 걸이
  g.box(1.2, 0.8, 0.5, [0.3, 0.2, 0.12], MAT.WOOD, M4.trans(9.5, 0, 129.2)); // 무기 거치대
  g.box(0.9, 0.5, 0.9, [0.28, 0.25, 0.22], MAT.WALL, M4.trans(15.5, 0, 66)); W.circles.push({ x: 15.5, z: 66, r: 0.55 });
  // 동쪽의 잠긴 방: 옥새 조각 제단
  g.box(1.2, 1.0, 1.2, [0.28, 0.25, 0.22], MAT.WALL, M4.trans(57.5, 0, 65)); W.circles.push({ x: 57.5, z: 65, r: 0.8 });
  W.lights.push({ x: 57, y: 2.5, z: 65, r: 7, c: [0.4, 1, 0.6], base: 0.9, ph: 0, secret2: true });
  // 최종 장치 위 황제 문양판
  g.cyl(0.5, 0.5, 0.06, 16, [0.75, 0.58, 0.25], MAT.GOLD, M4.chain(M4.trans(31, 1.32, 10.2), M4.rotX(0)));
  // 화살 함정 경고등 (서쪽 벽) / 화살 구멍
  W.arrowLamps = [95, 97, 99].map(z => ({ x: 28.08, y: 2.3, z }));
  [28.9, 31].forEach(x => g.box(0.5, 0.25, 0.1, [0.05, 0.04, 0.03], MAT.PLAIN, M4.trans(x, 1.05, 99.96)));
  // 안개 영역
  [[16, 132, 46, 154], [6, 106, 56, 130], [12, 76, 50, 92], [10, 58, 52, 74], [10, 18, 46, 56], [16, 6, 46, 16]].forEach(([x0, z0, x1, z1]) => { W.mistQuads.push([x0, z0, x1, z1, 0.35]); W.mistQuads.push([x0, z0, x1, z1, 0.9]); });

  /* ----- 문 ----- */
  const addDoor = (id, cells, kind) => { W.doors[id] = { id, cells, kind, open: 0, target: 0, h: DOOR_H[id] }; };
  addDoor('1', [[65, 14], [65, 15], [65, 16]], 'gate'); addDoor('X', [[2, 14], [2, 15], [2, 16]], 'gate');
  ['2', '3', '4'].forEach(id => { for (let r = 0; r < MH; r++) for (let c = 0; c < MW; c++) if (grid[r][c] === id) addDoor(id, [[r, c]], 'slab'); });
  ['a', 'b', 'c'].forEach(id => { for (let r = 0; r < MH; r++) for (let c = 0; c < MW; c++) if (grid[r][c] === id) addDoor(id, [[r, c]], 'bars'); });
  addDoor('T', [[50, 15]], 'trap'); W.doors.T.open = 1; W.doors.T.target = 1;
  addDoor('H', [[32, 4]], 'secret');
  addDoor('L', [[32, 26]], 'locked');

  /* ----- 정적 병마용 몸체 ----- */
  W.warriors.forEach(w => {
    w.headYaw = 0; w.headTarget = 0; w.cool = 0;
    if (w.dyn) { w.circle = { x: w.x, z: w.z, r: w.kind === 'guard' ? 1.05 : 0.5 * w.s }; W.circles.push(w.circle); return; }
    const M = M4.chain(M4.trans(w.x, w.y || 0, w.z), M4.rotY(w.yaw), M4.scale(w.s, w.s, w.s));
    const opt = { var: w.var || 0, pose: w.pose };
    if (w.kind === 'statue') { opt.color = [0.45, 0.4, 0.36]; opt.dark = [0.3, 0.27, 0.24]; opt.mat = MAT.WALL; }
    if (w.kind === 'maze') { opt.color = [0.5, 0.36, 0.27]; }
    addWarriorBody(g, M, opt);
    w.headYaw = 0; w.headTarget = 0; w.cool = 0;
    W.circles.push({ x: w.x, z: w.z, r: 0.5 * w.s });
  });

  W.staticMesh = R.upload(g);
  W.friezeMesh = R.upload(fr);
  W.friezeTex = R.texFromCanvas(friezeTex());
  { const gl = R.gl; gl.bindTexture(gl.TEXTURE_2D, W.friezeTex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); }
  // 프리즈 uv: u를 길이에 맞게 반복 (quad 단위 1 → 2m)
  // 데칼
  const quadMesh = (w, h) => { const q = new Geo(); q.plane(w, h, [1, 1, 1], MAT.PLAIN); return R.upload(q); };
  W.decals.forEach(d => { d.mesh = quadMesh(d.w, d.h); d.gltex = R.texFromCanvas(d.tex); });

  /* ----- 동적 메시 ----- */
  const mk = fn => { const q = new Geo(); fn(q); return R.upload(q); };
  W.dyn.head = mk(q => addWarriorHead(q, IDENT));
  W.dyn.headGeneral = mk(q => addWarriorHead(q, IDENT, { general: true }));
  W.dyn.headStatue = mk(q => addWarriorHead(q, IDENT, { color: [0.45, 0.4, 0.36], dark: [0.3, 0.27, 0.24], mat: MAT.WALL }));
  W.dyn.headMaze = mk(q => addWarriorHead(q, IDENT, { eye: [1, 0.3, 0.1], eyeMat: MAT.EMIT }));
  W.dyn.shadow = mk(q => { addWarriorBody(q, IDENT, { pose: 'spear', color: [0, 0, 0], dark: [0, 0, 0], mat: MAT.EMIT }); addWarriorHead(q, M4.trans(0, 1.62, 0), { color: [0, 0, 0], dark: [0, 0, 0], mat: MAT.EMIT, eye: [1, 0.1, 0.05], eyeMat: MAT.EMIT }); });
  W.dyn.slab = mk(q => { q.box(2, 1, 0.7, [0.34, 0.31, 0.29], MAT.WALL); q.box(1.2, 0.05, 0.75, [0.5, 0.4, 0.22], MAT.BRONZE, M4.trans(0, 0.7, 0)); });
  W.dyn.secret = mk(q => q.box(0.7, 1, 2, [0.4, 0.35, 0.28], MAT.WALL));
  W.dyn.bars = mk(q => { for (let i = 0; i < 6; i++) q.cyl(0.06, 0.06, 1, 6, [0.45, 0.38, 0.22], MAT.BRONZE, M4.trans(-0.85 + i * 0.34, 0, 0)); [0.25, 0.75].forEach(y => q.box(2, 0.08, 0.1, [0.45, 0.38, 0.22], MAT.BRONZE, M4.trans(0, y, 0))); });
  const leaf = (side, h) => mk(q => {
    q.box(3, h, 0.5, [0.3, 0.26, 0.23], MAT.WALL, M4.trans(side * 1.5, 0, 0));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) { // 청동 못
      const px = side * (0.45 + i * 0.7), py = 0.8 + j * (h - 1.6) / 6;
      q.sphere(0.09, 6, 4, [0.62, 0.48, 0.22], MAT.GOLD, M4.trans(px, py, 0.27));
      q.sphere(0.09, 6, 4, [0.62, 0.48, 0.22], MAT.GOLD, M4.trans(px, py, -0.27));
    }
    q.cyl(0.3, 0.3, 0.06, 10, [0.6, 0.45, 0.2], MAT.GOLD, M4.chain(M4.trans(side * 0.35, h * 0.45, 0.27), M4.rotX(Math.PI / 2)));
    q.cyl(0.3, 0.3, 0.06, 10, [0.6, 0.45, 0.2], MAT.GOLD, M4.chain(M4.trans(side * 0.35, h * 0.45, -0.27), M4.rotX(-Math.PI / 2)));
  });
  W.doors['1'].leaves = [leaf(1, DOOR_H['1']), leaf(-1, DOOR_H['1'])];
  W.doors['X'].leaves = [leaf(1, DOOR_H['X']), leaf(-1, DOOR_H['X'])];
  W.dyn.lid = mk(q => { q.box(1.64, 0.3, 1.04, [0.38, 0.2, 0.11], MAT.WOOD, M4.trans(0, 0, 0.52)); [-0.6, 0, 0.6].forEach(dx => q.box(0.12, 0.32, 1.08, [0.75, 0.58, 0.25], MAT.GOLD, M4.trans(dx, 0, 0.52))); q.box(0.3, 0.25, 0.1, [0.8, 0.62, 0.25], MAT.GOLD, M4.trans(0, -0.1, 1.06)); });
  W.dyn.marker = mk(q => { q.cyl(0, 0.22, 0.35, 4, [1, 0.75, 0.25], MAT.EMIT, M4.trans(0, -0.35, 0)); q.cyl(0.22, 0, 0.35, 4, [1, 0.75, 0.25], MAT.EMIT); });
  W.dyn.light = mk(q => q.plane(6, 9, [1, 1, 1], MAT.EMIT));
  W.dyn.suspect = {};
  Object.values(W.suspects).forEach(w => { W.dyn.suspect[w.sid] = mk(q => addWarriorBody(q, IDENT, { pose: w.pose, var: 1 })); });
  W.dyn.seal = mk(q => { q.box(0.42, 0.26, 0.42, [0.3, 0.8, 0.55], MAT.GOLD); q.sphere(0.14, 8, 6, [0.35, 0.85, 0.6], MAT.GOLD, M4.trans(0, 0.36, 0)); q.box(0.3, 0.02, 0.3, [0.9, 0.2, 0.1], MAT.EMIT, M4.trans(0, -0.01, 0)); });
  W.dyn.hatch = mk(q => q.box(1.1, 0.04, 1.1, [0.32, 0.29, 0.26], MAT.WALL));
  W.dyn.hole = mk(q => q.box(1.0, 0.01, 1.0, [0.3, 1, 0.6], MAT.EMIT));
  W.dyn.spark = mk(q => { q.sphere(0.07, 6, 4, [1, 0.85, 0.4], MAT.EMIT); });
  W.dyn.guardBody = mk(q => addGuardBody(q));
  W.dyn.guardBase = mk(q => { q.box(1.7, 0.55, 1.7, [0.27, 0.24, 0.21], MAT.WALL); q.box(1.8, 0.08, 1.8, [0.5, 0.38, 0.2], MAT.BRONZE, M4.trans(0, 0.5, 0));
    for (let k = 0; k < 4; k++) q.box(0.25, 0.25, 0.04, [0.5, 0.38, 0.2], MAT.BRONZE, M4.trans(-0.6 + k * 0.4, 0.15, 0.86)); });
  W.dyn.guardHead = mk(q => addGuardHead(q));
  W.dyn.guardEyes = mk(q => [-1, 1].forEach(s => { q.sphere(0.03, 8, 6, [1, 0.32, 0.08], MAT.EMIT, M4.chain(M4.trans(s * 0.056, 0.178, 0.148), M4.scale(1.4, 0.7, 0.6))); }));
  W.dyn.halberd = mk(q => {
    const wood = [0.22, 0.14, 0.08], brz = [0.55, 0.45, 0.25];
    q.cyl(0.045, 0.045, 6.0, 7, wood, MAT.WOOD, M4.trans(0, -0.9, 0));
    q.cyl(0.07, 0.05, 0.25, 7, brz, MAT.BRONZE, M4.trans(0, -0.95, 0));
    for (let k = 0; k < 5; k++) q.cyl(0.055, 0.055, 0.05, 7, brz, MAT.BRONZE, M4.trans(0, 0.6 + k * 0.9, 0));
    q.cyl(0.09, 0, 0.6, 4, [0.62, 0.6, 0.55], MAT.BRONZE, M4.trans(0, 5.1, 0));               // 창날
    q.box(0.62, 0.14, 0.04, [0.6, 0.55, 0.45], MAT.BRONZE, M4.chain(M4.trans(0.3, 4.75, 0), M4.rotZ(-0.25))); // 꺾창 날(戈)
    q.box(0.2, 0.08, 0.05, [0.6, 0.55, 0.45], MAT.BRONZE, M4.trans(-0.12, 4.82, 0));
    for (let k = 0; k < 7; k++) q.box(0.03, 0.35 + (k % 3) * 0.08, 0.03, [0.65, 0.08, 0.05], MAT.SILK, M4.trans(-0.06 + (k % 4) * 0.04, 4.25 - (k % 3) * 0.06, -0.04 + (k % 2) * 0.08)); // 붉은 술
  });
  // ---- 액션 요소 메시 ----
  const BRZ = [0.62, 0.45, 0.22], GLD = [0.95, 0.75, 0.25];
  const keyMesh = (col, mat, s) => mk(q => { const M = M4.scale(s, s, s); q.cyl(0.12, 0.12, 0.04, 12, col, mat, M4.chain(M, M4.trans(0, 0.2, 0), M4.rotX(Math.PI / 2))); q.box(0.05, 0.4, 0.04, col, mat, M4.chain(M, M4.trans(0, -0.22, 0))); q.box(0.1, 0.05, 0.04, col, mat, M4.chain(M, M4.trans(0.06, -0.18, 0))); q.box(0.08, 0.05, 0.04, col, mat, M4.chain(M, M4.trans(0.05, -0.08, 0))); });
  W.dyn.item = {
    torch: mk(q => { q.cyl(0.05, 0.04, 0.7, 6, [0.4, 0.26, 0.14], MAT.WOOD, M4.trans(0, -0.35, 0)); q.cyl(0.09, 0.07, 0.15, 8, [0.3, 0.25, 0.2], MAT.PLAIN, M4.trans(0, 0.3, 0)); q.sphere(0.11, 8, 6, [1, 0.6, 0.2], MAT.EMIT, M4.trans(0, 0.5, 0), 1.4); }),
    shield: mk(q => { q.cyl(0.45, 0.45, 0.06, 18, [0.42, 0.42, 0.44], MAT.BRONZE, M4.rotX(Math.PI / 2)); q.sphere(0.12, 8, 6, [0.6, 0.5, 0.3], MAT.GOLD, M4.trans(0, 0, 0.04)); q.cyl(0.46, 0.46, 0.03, 18, [0.3, 0.3, 0.32], MAT.BRONZE, M4.chain(M4.trans(0, 0, -0.01), M4.rotX(Math.PI / 2))); }),
    bkey: keyMesh(BRZ, MAT.BRONZE, 1.2),
    gkey: keyMesh(GLD, MAT.GOLD, 1.5),
    map: mk(q => { q.cyl(0.07, 0.07, 0.6, 8, [0.85, 0.75, 0.55], MAT.PLAIN, M4.chain(M4.trans(-0.3, 0, 0), M4.rotZ(-Math.PI / 2))); q.box(0.6, 0.01, 0.42, [0.88, 0.8, 0.6], MAT.PLAIN, M4.trans(0, 0, 0.21)); q.box(0.04, 0.012, 0.3, [0.6, 0.15, 0.1], MAT.SILK, M4.trans(0.1, 0.002, 0.25)); }),
    seal2: mk(q => { q.box(0.22, 0.26, 0.42, [0.3, 0.8, 0.55], MAT.GOLD); q.sphere(0.12, 8, 6, [0.35, 0.85, 0.6], MAT.GOLD, M4.trans(-0.05, 0.3, 0)); }),
    seal1: mk(q => { q.box(0.22, 0.26, 0.42, [0.3, 0.8, 0.55], MAT.GOLD); }),
  };
  W.dyn.ring = mk(q => { for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; q.box(0.12, 0.02, 0.05, [1, 0.8, 0.35], MAT.EMIT, M4.chain(M4.trans(Math.cos(a) * 0.6, 0.02, Math.sin(a) * 0.6), M4.rotY(-a + Math.PI / 2))); } });
  W.dyn.lockdoor = mk(q => { q.box(0.7, 1, 2, [0.5, 0.38, 0.2], MAT.BRONZE); q.box(0.72, 0.06, 2.02, [0.35, 0.26, 0.14], MAT.BRONZE, M4.trans(0, 0.3, 0)); q.box(0.72, 0.06, 2.02, [0.35, 0.26, 0.14], MAT.BRONZE, M4.trans(0, 0.7, 0)); q.box(0.74, 0.06, 0.04, [0.05, 0.04, 0.03], MAT.PLAIN, M4.trans(0, 0.45, 0)); });
  W.dyn.boulder = mk(q => { q.sphere(1, 14, 10, [0.42, 0.38, 0.33], MAT.WALL); q.cyl(1.01, 1.01, 0.15, 14, [0.3, 0.27, 0.24], MAT.WALL, M4.chain(M4.trans(0, 0, 0), M4.rotX(Math.PI / 2), M4.trans(0, -0.075, 0)), false); });
  W.dyn.arrow = mk(q => { q.cyl(0.02, 0.02, 0.9, 5, [0.45, 0.3, 0.15], MAT.WOOD, M4.chain(M4.rotX(Math.PI / 2), M4.trans(0, -0.45, 0))); q.cyl(0.05, 0, 0.15, 4, [0.6, 0.6, 0.62], MAT.BRONZE, M4.chain(M4.trans(0, 0, 0.45), M4.rotX(Math.PI / 2))); q.box(0.12, 0.01, 0.15, [0.9, 0.85, 0.8], MAT.PLAIN, M4.trans(0, 0, -0.4)); });
  W.dyn.tile = mk(q => q.box(2, 0.3, 2, [0.36, 0.36, 0.34], MAT.FLOOR, M4.trans(0, -0.3, 0)));
  W.dyn.lamp = mk(q => { q.box(0.12, 0.3, 0.3, [0.3, 0.25, 0.2], MAT.BRONZE, M4.trans(-0.06, -0.15, 0)); q.sphere(0.12, 8, 6, [1, 0.15, 0.08], MAT.EMIT, M4.trans(0.06, 0, 0)); });
  W.dyn.patrolBody = mk(q => addWarriorBody(q, IDENT, { pose: 'spear', color: [0.48, 0.33, 0.25] }));
  W.dyn.cone = mk(q => { const n = 10, A = 0.6; for (let i = 0; i < n; i++) { const a0 = -A + 2 * A * i / n, a1 = -A + 2 * A * (i + 1) / n; const i0 = q.vert(0, 0.04, 0, 0, 1, 0, [1, 0.15, 0.1], MAT.EMIT), i1 = q.vert(Math.sin(a1), 0.04, Math.cos(a1), 0, 1, 0, [1, 0.15, 0.1], MAT.EMIT), i2 = q.vert(Math.sin(a0), 0.04, Math.cos(a0), 0, 1, 0, [1, 0.15, 0.1], MAT.EMIT); q.i.push(i0, i2, i1); } });
  W.dyn.alert = mk(q => { q.box(0.12, 0.45, 0.12, [1, 0.2, 0.1], MAT.EMIT, M4.trans(0, 0.2, 0)); q.box(0.12, 0.12, 0.12, [1, 0.2, 0.1], MAT.EMIT); });
  W.steleDecal.mesh = quadMesh(W.steleDecal.w, W.steleDecal.h);
  W.steleCanvas = null; W.steleTex = null;

  W.flames = R.pointBuffer(W.flamePts, W.flameSeeds);
  const dp = [], ds = [];
  for (let i = 0; i < 700; i++) { dp.push(Math.random() * 24, Math.random() * 8, Math.random() * 24); ds.push(Math.random(), 1); }
  W.dust = R.pointBuffer(dp, ds);
  W.mist = R.mistBuffer(W.mistQuads);
  return W;
}

/* ---------- 충돌 ---------- */
function solidCell(W, r, c, forCam) {
  const ch = W.at(r, c);
  if (W.blockFn && W.blockFn(r, c, forCam)) return true;
  if (ch === '#') return true;
  const d = W.doors[ch];
  if (d) {
    if (d.kind === 'trap') return d.open < 0.6;
    return d.open < (d.kind === 'gate' ? 0.55 : 0.8);
  }
  return false;
}
function collideCircle(W, x, z, rad) {
  for (let it = 0; it < 2; it++) {
    const c0 = Math.floor((x - rad) / T), c1 = Math.floor((x + rad) / T), r0 = Math.floor((z - rad) / T), r1 = Math.floor((z + rad) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (!solidCell(W, r, c)) continue;
      const bx0 = c * T, bx1 = bx0 + T, bz0 = r * T, bz1 = bz0 + T;
      const px = clamp(x, bx0, bx1), pz = clamp(z, bz0, bz1);
      let dx = x - px, dz = z - pz, d = Math.hypot(dx, dz);
      if (d < rad) {
        if (d < 1e-5) { // 내부: 최소 축으로 밀어냄
          const opts = [[x - bx0, -1, 0], [bx1 - x, 1, 0], [z - bz0, 0, -1], [bz1 - z, 0, 1]].sort((a, b) => a[0] - b[0])[0];
          x += opts[1] * (opts[0] + rad); z += opts[2] * (opts[0] + rad);
        } else { x = px + dx / d * rad; z = pz + dz / d * rad; }
      }
    }
    for (const ci of W.circles) {
      if (ci.r <= 0) continue;
      const dx = x - ci.x, dz = z - ci.z; const rr = ci.r + rad;
      if (Math.abs(dx) > rr || Math.abs(dz) > rr) continue;
      const d = Math.hypot(dx, dz);
      if (d < rr && d > 1e-5) { x = ci.x + dx / d * rr; z = ci.z + dz / d * rr; }
    }
  }
  return [x, z];
}
// 카메라가 벽을 뚫지 않도록 레이마칭
function camRay(W, ox, oy, oz, dx, dy, dz, maxD) {
  for (let t = 0.2; t <= maxD; t += 0.1) {
    const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
    const r = Math.floor(z / T), c = Math.floor(x / T);
    if (solidCell(W, r, c, true) || y < 0.25 || y > W.ceilOf(r, c) - 0.25) return Math.max(0.6, t - 0.35);
    for (const ci of W.circles) if (ci.pillar && Math.hypot(x - ci.x, z - ci.z) < ci.r + 0.2) return Math.max(0.6, t - 0.35);
  }
  return maxD;
}
// 격자 시야 (미니맵 공개용)
function losCell(W, r0, c0, r1, c1) {
  const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)) * 2;
  for (let i = 1; i < steps; i++) {
    const t = i / steps, r = Math.round(r0 + (r1 - r0) * t), c = Math.round(c0 + (c1 - c0) * t);
    if (r === r1 && c === c1) return true;
    if (solidCell(W, r, c)) return false;
  }
  return true;
}
