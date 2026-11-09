'use strict';
/* ===================== 액션 요소: 아이템 · 함정 · 생명력 · 순찰 ===================== */
const ITEMS = {
  torch:  { zh: '火把', py: 'huǒbǎ', ko: '횃불', icon: '🔥', need: true, use: '어두운 비밀 통로를 밝힌다. 없으면 통로에 들어갈 수 없다.' },
  shield: { zh: '铁盾', py: 'tiě dùn', ko: '철제 방패', icon: '🛡️', need: false, use: '화살 함정의 화살을 막아 준다.' },
  bkey:   { zh: '青铜钥匙', py: 'qīngtóng yàoshi', ko: '청동 열쇠', icon: '🗝️', need: true, use: '보물창고의 잠긴 청동 문을 연다.' },
  map:    { zh: '地图', py: 'dìtú', ko: '지하 지도', icon: '🗺️', need: false, use: '미니맵에 미로 전체, 안전한 길, 황금 열쇠 위치를 표시한다.' },
  seal:   { zh: '玉玺碎片', py: 'yùxǐ suìpiàn', ko: '옥새 조각', icon: '💠', need: true, use: '두 조각을 최종 탈출구의 황제 문양판에 맞춘다.' },
  gkey:   { zh: '黄金钥匙', py: 'huángjīn yàoshi', ko: '황금 열쇠', icon: '🔑', need: true, use: '최종 탈출문의 황금 자물쇠를 연다.' },
};
const ITEM_ORDER = ['torch', 'shield', 'bkey', 'map', 'seal', 'gkey'];
const DIR = { 14: { zh: '左边', py: 'zuǒbian', ko: '왼쪽' }, 15: { zh: '中间', py: 'zhōngjiān', ko: '가운데' }, 16: { zh: '右边', py: 'yòubian', ko: '오른쪽' } };
function signLines(id) {
  const S = G.S, f = S.floorSafe || [14, 16];
  const L = {
    torch: [['前面很黑。', 'Qiánmian hěn hēi.', '앞쪽은 아주 어둡다.'], ['你需要火把。', 'Nǐ xūyào huǒbǎ.', '너는 횃불이 필요하다.'], ['火把在左边。', 'Huǒbǎ zài zuǒbian.', '횃불은 왼쪽에 있다.']],
    patrol: [['兵马俑会走路！', 'Bīngmǎyǒng huì zǒulù!', '병마용이 걸어 다닌다!'], ['别让它看见你！', 'Bié ràng tā kànjiàn nǐ!', '병마용에게 들키지 마라!'], ['躲在柱子后面！', 'Duǒ zài zhùzi hòumian!', '기둥 뒤에 숨어라!']],
    arrow: [['前面有危险！', 'Qiánmian yǒu wēixiǎn!', '앞쪽에 위험이 있다!'], ['左边有箭！', 'Zuǒbian yǒu jiàn!', '왼쪽에 화살이 있다!'], ['右边是安全的！', 'Yòubian shì ānquán de!', '오른쪽은 안전하다!']],
    floor: [['前面有危险！', 'Qiánmian yǒu wēixiǎn!', '앞쪽에 위험이 있다!'], [`先走${DIR[f[0]].zh}，再走${DIR[f[1]].zh}。`, `Xiān zǒu ${DIR[f[0]].py}, zài zǒu ${DIR[f[1]].py}.`, `먼저 ${DIR[f[0]].ko}으로 가고, 그다음 ${DIR[f[1]].ko}으로 가라.`]],
    treas: [['房间里有一把钥匙。', 'Fángjiān li yǒu yì bǎ yàoshi.', '방 안에 열쇠가 하나 있다.'], ['玉玺在东边。', 'Yùxǐ zài dōngbian.', '옥새는 동쪽에 있다.']],
    boulder: [['小心！', 'Xiǎoxīn!', '조심해라!'], ['石头会滚过来！', 'Shítou huì gǔn guòlai!', '돌이 굴러올 것이다!'], ['快跑！', 'Kuài pǎo!', '빨리 달려라!']],
    gkey: [['黄金钥匙在东边。', 'Huángjīn yàoshi zài dōngbian.', '황금 열쇠는 동쪽에 있다.']],
    final: [['把玉玺放在这里。', 'Bǎ yùxǐ fàng zài zhèlǐ.', '옥새를 여기에 놓아라.'], ['用黄金钥匙开门。', 'Yòng huángjīn yàoshi kāi mén.', '황금 열쇠로 문을 열어라.']],
  };
  return (L[id] || []).map(([zh, py, ko]) => ({ zh, py, ko }));
}
const SIGN_TITLE = { torch: '入口的石碑 · 입구의 비석', patrol: '兵马俑坑的警告 · 병마용의 방 경고문', arrow: '通道的警告 · 통로 경고문', floor: '石板的秘密 · 돌판의 비밀', treas: '宝库的石碑 · 보물창고 비석', boulder: '迷宫的警告 · 미로 경고문', gkey: '墙上的字 · 벽에 새겨진 글', final: '生门的文字 · 탈출문의 글' };
const CHECKPOINTS = { 1: [31, 151, 0], 2: [31, 128.4, 0], 8: [31, 103, 0], 3: [31, 90.5, 0], 4: [31, 73, 0], 5: [31, 54.5, 0], 6: [31, 16, 0] };
const PATROL_WP = [[21.5, 109], [40.5, 109], [40.5, 127], [21.5, 127]];

const ACT = {
  arrows: [], arrowT: { state: 'idle', t: 0, cd: 0 }, boulder: { active: false, warn: 0, cd: 0, x: 11 }, tiles: {}, fx: [],
  patrol: null, falling: null, invuln: 0, darkToastT: 0, signTex: {}, mazePath: null,
  reset() {
    this.arrows = []; this.arrowT = { state: 'idle', t: 0, cd: 0 }; this.boulder = { active: false, warn: 0, cd: 0, x: 11, told: false };
    this.tiles = {}; this.fx = []; this.falling = null; this.invuln = 0;
    this.patrol = { x: PATROL_WP[0][0], z: PATROL_WP[0][1], yaw: Math.PI / 2, wp: 1, state: 'patrol', t: 0, lost: 0, phase: 0, stun: 0 };
    const W = G.W;
    W.blockFn = (r, c) => r === 51 && c === 15 && G.S && !G.S.items.torch; // 횃불 없이는 어두운 통로 진입 불가
    if (!this.mazePath) this.mazePath = bfsPath(W, [27, 15], [8, 15]);
  },
  // 게임마다 바뀌는 단서 비석 텍스처
  buildSigns() {
    const W = G.W;
    Object.entries(W.signs).forEach(([id, sg]) => {
      const lines = signLines(id);
      const cv = canvasTex(512, sg.kind === 'stele' ? 680 : 340, (x, w, h) => {
        stoneBG(x, w, h, '#3b3631'); x.strokeStyle = '#8c6a3c'; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16);
        const fs = lines.some(l => l.zh.length > 7) ? 44 : 54;
        x.font = `bold ${fs}px ${FONT_ZH}`; x.textAlign = 'center'; x.textBaseline = 'middle';
        const lh = Math.min(fs * 1.5, (h - 60) / Math.max(1, lines.length));
        lines.forEach((l, i) => {
          const yy = h / 2 + (i - (lines.length - 1) / 2) * lh;
          x.fillStyle = 'rgba(0,0,0,.55)'; x.fillText(l.zh, w / 2 + 2, yy + 3); x.fillStyle = '#e2bf72'; x.fillText(l.zh, w / 2, yy);
        });
      });
      if (!this.signTex[id]) { const q = new Geo(); q.plane(sg.w, sg.h, [1, 1, 1], MAT.PLAIN); this.signTex[id] = { mesh: R.upload(q), tex: R.texFromCanvas(cv) }; }
      else R.updateTex(this.signTex[id].tex, cv);
    });
  },
  have(id) { const I = G.S.items; return id === 'seal' ? (I.seal1 ? 1 : 0) + (I.seal2 ? 1 : 0) : !!I[id]; },
  pickup(id) {
    const S = G.S; const key = id === 'seal2' ? 'seal' : id;
    if (S.items[id]) return; S.items[id] = true; S.score += 30;
    const it = ITEMS[key], wi = G.W.items[id];
    this.fx.push({ x: wi.x, y: wi.y, z: wi.z, t: 0 }); Sfx.pickup();
    UI.toast(`${it.icon} <b>${it.ko}</b> 획득! <span style="font-family:var(--zh)">${it.zh}</span> ${it.py} ${it.need ? '<b style="color:#ff9a7a">[필수]</b>' : '<b style="color:#9fd0ff">[선택]</b>'}<br><small>${it.use}</small>${key === 'seal' ? ` (${this.have('seal')}/2)` : ''}`, '获得道具！');
    UI.hud(); UI.invFlash(key); saveGame();
  },
  // ---------- 피해 / 쓰러짐 ----------
  hurt(kind) {
    const S = G.S; if (this.invuln > 0 || G.state === 'end') return false;
    S.hearts = Math.max(0, S.hearts - 1); this.invuln = 1.8; S.hitCount = (S.hitCount || 0) + 1;
    Sfx.hit(); UI.flashRed(); Player.cam.shake = 0.8;
    const msg = { arrow: '화살에 맞았다!', fall: '바닥이 무너져 떨어졌다!', boulder: '굴러온 돌에 부딪혔다!', patrol: '병마용에게 붙잡혔다!' }[kind] || '다쳤다!';
    if (S.hearts > 0) UI.toast(`💔 ${msg} 남은 생명 ${'❤️'.repeat(S.hearts)}`, '危险！', true);
    UI.hud(); saveGame();
    if (S.hearts <= 0) { this.die(msg); return 'dead'; }
    return true;
  },
  die(msg) {
    const S = G.S; S.deaths = (S.deaths || 0) + 1; S.score = Math.max(0, S.score - 50);
    G.state = 'cutscene'; G.cut = { kind: 'death', t: 0, msg }; UI.fade(true); this.falling = null; Sfx.drum(0, 1);
  },
  deathCut(dt) {
    const C = G.cut; C.t += dt;
    if (C.t > 1.3 && !C.done) {
      C.done = true; const S = G.S; S.hearts = 3; const cp = S.cp || CHECKPOINTS[1];
      Player.reset(cp[0], cp[1], cp[2]); this.resetTraps(); UI.fade(false); G.state = 'play';
      UI.toast(`${C.msg} 쓰러졌다… 체크포인트에서 다시 시작합니다. (생명 ❤️❤️❤️ 회복, -50점)`, '再试一次！', true); UI.hud(); saveGame();
    }
  },
  resetTraps() {
    this.arrows = []; this.arrowT.state = 'idle'; this.arrowT.cd = 0.8; this.boulder.active = false; this.boulder.warn = 0; this.boulder.cd = 1.5;
    const p = this.patrol; p.state = 'return'; p.stun = 1.5; this.invuln = 1.5;
  },
  setCheckpoint(zone) {
    const S = G.S; let cp = CHECKPOINTS[zone];
    if (zone === 8 && S.trap) cp = [33, 98.6, 0];
    if (cp && (!S.cp || S.cpZone !== zone)) { S.cp = cp; S.cpZone = zone; }
  },
  // ---------- 매 프레임 ----------
  update(dt) {
    const S = G.S, p = Player, W = G.W; if (!S) return;
    this.invuln = Math.max(0, this.invuln - dt);
    this.fx.forEach(f => f.t += dt); this.fx = this.fx.filter(f => f.t < 1.2);
    const r = Math.floor(p.z / T), c = Math.floor(p.x / T);
    // 어두운 통로 안내
    this.darkToastT -= dt;
    if (!S.items.torch && r === 52 && c === 15 && this.darkToastT <= 0) { this.darkToastT = 5; UI.toast('너무 어두워서 한 발짝도 나아갈 수 없다… 🔥 횃불(火把 huǒbǎ)이 필요하다!', '太黑了！', true); }
    if (S.trap && S.cpZone === 8 && S.cp[1] !== 98.6) this.setCheckpoint(8);
    this.updateArrows(dt, r, c);
    this.updateFloor(dt, r, c);
    this.updateBoulder(dt, r, c);
    this.updatePatrol(dt);
  },
  updateArrows(dt, r, c) {
    const A = this.arrowT, p = Player, S = G.S;
    A.cd = Math.max(0, A.cd - dt);
    const inZone = r >= 47 && r <= 49 && c >= 14 && c <= 16;
    if (A.state === 'idle' && inZone && A.cd <= 0) { A.state = 'warn'; A.t = 0; A.beep = 0; if (!S.ev.arrowTold) { S.ev.arrowTold = true; UI.toast('발밑의 발판이 딸깍! 벽의 경고등이 붉게 깜빡인다…!', '小心！', true); } }
    if (A.state === 'warn') {
      A.t += dt; A.beep -= dt; if (A.beep <= 0) { Sfx.beep(); A.beep = 0.3; }
      if (A.t >= 1.4) { A.state = 'idle'; A.cd = 2.6; Sfx.whoosh(); [29, 31].forEach(x => { this.arrows.push({ x, z: 99.6, y: 1.15 }); this.arrows.push({ x, z: 101.2, y: 1.15 }); }); }
    }
    this.arrows.forEach(a => {
      a.z -= 19 * dt;
      if (a.hit) return;
      const lane = Math.floor(a.x / T);
      if (Math.floor(p.x / T) === lane && Math.abs(p.z - a.z) < 0.55 && p.y < 1.7) {
        a.hit = true;
        if (S.items.shield) { Sfx.clang(); if (!this.blockTold) { this.blockTold = true; UI.toast('🛡️ 철제 방패로 화살을 막았다!', '挡住了！'); } }
        else this.hurt('arrow');
      }
    });
    this.arrows = this.arrows.filter(a => a.z > 94.2 && !a.hit);
  },
  updateFloor(dt, r, c) {
    const S = G.S, p = Player, f = S.floorSafe;
    Object.values(this.tiles).forEach(t => { t.t += dt; if (t.state === 'crack' && t.t > 0.45) { t.state = 'fall'; t.t = 0; Sfx.collapse(); Player.cam.shake = 0.6; } if (t.state === 'fall' && t.t > 3.2) { t.state = 'ok'; t.t = 0; } });
    if (this.falling) {
      const F = this.falling; F.t += dt; p.y -= (3 + F.t * 12) * dt;
      if (F.t > 0.9) { this.falling = null; const res = this.hurt('fall'); if (res !== 'dead') { Player.reset(31, 83.2, 0); this.invuln = 1.2; } }
      return;
    }
    if ((r === 38 || r === 40) && c >= 14 && c <= 16 && p.y < 0.05) {
      const safe = (r === 40 ? f[0] : f[1]) === c, key = r + '_' + c;
      const t = this.tiles[key] || (this.tiles[key] = { state: 'ok', t: 0, r, c });
      if (!safe && t.state === 'ok') { t.state = 'crack'; t.t = 0; Sfx.crack(); }
      if (t.state === 'fall') { this.falling = { t: 0 }; G.input.f = G.input.b = G.input.l = G.input.r = 0; }
    }
  },
  updateBoulder(dt, r, c) {
    const B = this.boulder, p = Player;
    B.cd = Math.max(0, B.cd - dt);
    if (!B.active && B.warn <= 0 && B.cd <= 0 && r === 25 && c >= 12 && c <= 23) {
      B.warn = 2.2; Sfx.rumble(2.6); Player.cam.shake = 0.5;
      UI.toast(B.told ? '또 돌이 굴러온다! 달려라!' : '쿠르릉… 미로 서쪽에서 거대한 돌이 굴러온다! 달리거나 옆 홈으로 피하라!', '石头来了！', true); B.told = true;
    }
    if (B.warn > 0) { B.warn -= dt; Player.cam.shake = Math.max(Player.cam.shake, 0.25); if (B.warn <= 0) { B.active = true; B.x = 11; B.hit = false; } }
    if (B.active) {
      B.x += 7.6 * dt; Player.cam.shake = Math.max(Player.cam.shake, clamp(1 - Math.abs(p.x - B.x) / 14, 0, 0.6));
      if (!B.hit && Math.abs(p.z - 51) < 1.25 && Math.abs(p.x - B.x) < 1.25 && p.y < 1.8) { B.hit = true; this.hurt('boulder'); }
      if (B.x >= 46.6) { B.active = false; B.cd = 4.5; Sfx.collapse(); }
    }
  },
  updatePatrol(dt) {
    const P = this.patrol, S = G.S, p = Player, W = G.W;
    const active = S.done[1] && !S.done[2] && G.zone === 2;
    if (S.done[2]) { P.state = 'stand'; return; }
    if (!active) return;
    P.stun = Math.max(0, P.stun - dt);
    const dx = p.x - P.x, dz = p.z - P.z, d = Math.hypot(dx, dz);
    const sees = d < 10 && Math.abs(angDiff(P.yaw, Math.atan2(dx, dz))) < 0.6 && patrolLOS(W, P.x, P.z, p.x, p.z);
    const move = (tx, tz, sp) => {
      const mx = tx - P.x, mz = tz - P.z, md = Math.hypot(mx, mz); if (md < 0.05) return md;
      P.yaw += angDiff(P.yaw, Math.atan2(mx, mz)) * (1 - Math.exp(-dt * 6));
      let nx = P.x + mx / md * sp * dt, nz = P.z + mz / md * sp * dt; [nx, nz] = collideCircle(W, nx, nz, 0.45); P.x = nx; P.z = nz; P.phase += dt * sp * 2.5; return md;
    };
    if (P.stun > 0) return;
    if (P.state === 'patrol' || P.state === 'return') {
      if (sees || d < 1.8) { P.state = 'alert'; P.t = 0; Sfx.alert(); UI.toast('병마용에게 발각되었다! 달리거나 기둥 뒤에 숨어라!', '站住！', true); return; }
      const [tx, tz] = PATROL_WP[P.wp];
      if (move(tx, tz, P.state === 'return' ? 2.6 : 2.0) < 0.4) { P.wp = (P.wp + 1) % PATROL_WP.length; P.state = 'patrol'; }
    } else if (P.state === 'alert') {
      P.t += dt; P.yaw += angDiff(P.yaw, Math.atan2(dx, dz)) * (1 - Math.exp(-dt * 8));
      if (P.t > 0.7) { P.state = 'chase'; P.lost = 0; }
    } else if (P.state === 'chase') {
      P.lost = sees || d < 3 ? 0 : P.lost + dt;
      if (P.lost > 2.2) {
        P.state = 'return'; let bi = 0, bd = 1e9; PATROL_WP.forEach((w, i) => { const dd = Math.hypot(w[0] - P.x, w[1] - P.z); if (dd < bd) { bd = dd; bi = i; } }); P.wp = bi;
        UI.toast('병마용을 따돌렸다! 휴…', '安全了！'); return;
      }
      move(p.x, p.z, 5.2);
      if (d < 1.05) {
        const res = this.hurt('patrol');
        if (res === true) { Player.reset(31, 128.4, 0); this.invuln = 2; }
        P.state = 'return'; P.stun = 2;
      }
    }
  },
  // ---------- 그리기 ----------
  lights(L, t) {
    const S = G.S; if (!S) return;
    const A = this.arrowT;
    if (A.state === 'warn') L.push({ x: 28.6, y: 2.3, z: 97, r: 7, c: [1, 0.08, 0.04], i: (Math.sin(t * 20) > 0 ? 2.2 : 0.4), d: -5 });
    if (S.lOpen) L.push({ x: 57, y: 2.5, z: 65, r: 7, c: [0.4, 1, 0.6], i: 0.9, d: (57 - Player.x) ** 2 + (65 - Player.z) ** 2 });
    if (this.patrol && this.patrol.state !== 'stand' && G.zone === 2) L.push({ x: this.patrol.x, y: 2.1, z: this.patrol.z, r: 4, c: [1, 0.1, 0.05], i: this.patrol.state === 'chase' ? 1.5 : 0.7, d: -4 });
  },
  render(t) {
    const S = G.S, W = G.W; if (!S) return;
    // 아이템
    Object.entries(W.items).forEach(([id, it]) => {
      if (S.items[id]) return;
      const bob = Math.sin(t * 2.4 + it.x) * 0.08;
      const M = id === 'torch' ? M4.chain(M4.trans(it.x, it.y, it.z), M4.rotZ(-0.35)) : M4.chain(M4.trans(it.x, it.y + bob, it.z), M4.rotY(t * 1.3));
      R.draw(W.dyn.item[id], M, null, 0.15);
      R.draw(W.dyn.ring, M4.chain(M4.trans(id === 'torch' ? it.px : it.x, 0, id === 'torch' ? it.pz : it.z), M4.rotY(t * 0.6), M4.scale(1 + 0.08 * Math.sin(t * 3), 1, 1 + 0.08 * Math.sin(t * 3))), null, 0.5);
    });
    // 획득 효과
    this.fx.forEach(f => R.draw(W.dyn.ring, M4.chain(M4.trans(f.x, f.y - 0.6 + f.t * 1.5, f.z), M4.scale(1 + f.t * 3, 1, 1 + f.t * 3)), null, 1.5 - f.t));
    // 손에 든 횃불
    if (S.items.torch && G.state !== 'title') {
      const bob = Math.abs(Math.cos(Player.phase)) * 0.05 * Math.min(1, Player.speed / 3);
      R.draw(W.dyn.item.torch, M4.chain(M4.trans(Player.x, Player.y, Player.z), M4.rotY(Player.facing), M4.trans(-0.34, 1.05 + bob, 0.28), M4.rotX(0.35)), null, 0.3);
    }
    // 잠긴 청동 문
    const L = W.doors.L; if (L && L.open < 0.99) R.draw(W.dyn.lockdoor, M4.chain(M4.trans(52.35, -smooth(L.open) * L.h, 65), M4.scale(1, L.h, 1)));
    // 무너지는 발판
    [38, 40].forEach(r => [14, 15, 16].forEach(c => {
      const tl = this.tiles[r + '_' + c]; let y = 0, sx = 0;
      if (tl && tl.state === 'crack') sx = Math.sin(t * 60) * 0.03;
      if (tl && tl.state === 'fall') y = -Math.min(6, tl.t * tl.t * 9);
      if (y > -5.9) R.draw(W.dyn.tile, M4.trans(cellX(c) + sx, y, cellZ(r)));
    }));
    // 화살 경고등 / 화살
    const warn = this.arrowT.state === 'warn' && Math.sin(t * 20) > 0;
    W.arrowLamps.forEach(l => R.draw(W.dyn.lamp, M4.trans(l.x, l.y, l.z), warn ? null : new Float32Array([0.35, 0.3, 0.3, 1]), warn ? 1.5 : 0));
    this.arrows.forEach(a => R.draw(W.dyn.arrow, M4.chain(M4.trans(a.x, a.y, a.z), M4.rotY(Math.PI))));
    // 굴러오는 돌
    const B = this.boulder; if (B.active) R.draw(W.dyn.boulder, M4.chain(M4.trans(B.x, 1.0, 51), M4.rotZ(-B.x)));
    // 순찰 병마용
    const P = this.patrol; if (P) {
      const sw = Math.sin(P.phase) * 0.04;
      const M = M4.chain(M4.trans(P.x, Math.abs(sw), P.z), M4.rotY(P.yaw), M4.rotZ(sw), M4.scale(1.15, 1.15, 1.15));
      R.draw(W.dyn.patrolBody, M); R.draw(W.dyn.headMaze, M4.chain(M, M4.trans(0, 1.62, 0)));
      if (P.state !== 'stand') {
        if (P.state === 'alert' || P.state === 'chase') R.draw(W.dyn.alert, M4.chain(M4.trans(P.x, 3.0 + Math.sin(t * 8) * 0.05, P.z), M4.rotY(t * 3)), null, 1);
        R.blend(true, true); R.draw(W.dyn.cone, M4.chain(M4.trans(P.x, 0, P.z), M4.rotY(P.yaw), M4.scale(10, 1, 10)), new Float32Array([1, 1, 1, P.state === 'chase' ? 0.3 : 0.16])); R.blend(false);
      }
    }
    // 황제 문양판의 옥새 조각
    if (S.emblem) { R.draw(W.dyn.item.seal1, M4.trans(30.82, 1.5, 10.2), null, 0.5 + 0.3 * Math.sin(t * 3)); R.draw(W.dyn.item.seal1, M4.trans(31.18, 1.5, 10.2), null, 0.5 + 0.3 * Math.sin(t * 3)); }
  },
  renderDecals() {
    const W = G.W; if (!G.S) return;
    Object.entries(W.signs).forEach(([id, sg]) => { const s = this.signTex[id]; if (s) R.draw(s.mesh, sg.M, null, G.S.signs[id] ? 0.2 : 0.45, s.tex); });
  },
};
// 순찰 병마용 시야: 벽과 기둥에 가려지는지 확인
function patrolLOS(W, x0, z0, x1, z1) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.4);
  for (let i = 1; i < n; i++) {
    const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
    if (solidCell(W, Math.floor(z / T), Math.floor(x / T))) return false;
    for (const ci of W.circles) if (ci.r >= 0.9 && Math.hypot(x - ci.x, z - ci.z) < ci.r) return false;
  }
  return true;
}
// 미로의 안전 경로 (지도 아이템)
function bfsPath(W, s, e) {
  const key = (r, c) => r * MW + c, prev = new Map(), q = [s]; prev.set(key(...s), null);
  while (q.length) {
    const [r, c] = q.shift(); if (r === e[0] && c === e[1]) break;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
      const nr = r + dr, nc = c + dc; if (nr < 8 || nr > 27) return; const ch = W.at(nr, nc);
      if (ch === '#' || prev.has(key(nr, nc))) return; prev.set(key(nr, nc), [r, c]); q.push([nr, nc]);
    });
  }
  const path = new Set(); let cur = e; while (cur) { path.add(key(...cur)); cur = prev.get(key(...cur)); }
  return path;
}
