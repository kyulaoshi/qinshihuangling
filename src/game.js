'use strict';
/* ===================== 게임 상태 / 메인 루프 ===================== */
const SAVE_KEY = 'qin_escape_save_v1', REC_KEY = 'qin_escape_records_v1';
const DIFF = { easy: { time: 1200, hints: Infinity, label: '简单 · 쉬움' }, normal: { time: 900, hints: 5, label: '普通 · 보통' }, hard: { time: 600, hints: 2, label: '困难 · 어려움' } };
const START = { x: 31, z: 151, yaw: 0 };

const G = {
  state: 'title', W: null, S: null, data: null, input: { f: 0, b: 0, l: 0, r: 0, run: 0, jump: false },
  time: 0, last: 0, introT: 0, cut: null, near: null, zone: 1, toastQ: [], saveT: 0, revealT: 0, fps: [], autoQ: false,
  redLight: 0, exitLight: 0, sessionIntroDone: false, overlay: null,
  mission_active() { return !$('#mission').classList.contains('hidden') || !$('#codepanel').classList.contains('hidden'); },
};

/* ---------- 새 게임 / 불러오기 ---------- */
function newState(name, diff) {
  return {
    v: 1, name, diff, seed: (Math.random() * 1e9) | 0, timeLeft: DIFF[diff].time, playTime: 0,
    pos: { x: START.x, z: START.z, yaw: START.yaw }, done: {}, mq: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, m5step: 0, codes: [],
    score: 0, correct: 0, wrong: 0, hints: 0, hintsLeft: DIFF[diff].hints === Infinity ? -1 : DIFF[diff].hints,
    trap: false, secret: false, seal: false, ev: {}, case: newCase(),
    items: {}, hearts: 3, cp: null, cpZone: null, signs: {}, signKo: {}, deaths: 0, lOpen: false, emblem: false, codeOk: false, log: [], status: 'playing', revealed: '', started: Date.now(), introSeen: false,
  };
}
function newCase() { return { started: false, found: {}, tl: {}, hints: 0, solved: false, attempts: 0, pick: null, reason: null, seal: false }; }
function saveGame() {
  const S = G.S; if (!S) return;
  if (G.state === 'play' || G.state === 'mission' || G.state === 'paused') { S.pos = { x: Player.x, z: Player.z, yaw: Player.cam.yaw }; }
  let rv = ''; for (let i = 0; i < G.W.revealed.length; i++) rv += G.W.revealed[i] ? '1' : '0';
  S.revealed = rv;
  store.set(SAVE_KEY, S);
}
function loadSave() { const s = store.get(SAVE_KEY, null); return s && s.v === 1 && s.status === 'playing' ? s : null; }

function applyState() {
  const S = G.S, W = G.W;
  G.data = genMissions(S.seed, S.name, S.diff);
  S.codesTarget = G.data.codes;
  const set = (id, v) => { W.doors[id].open = W.doors[id].target = v; };
  set('1', S.done[1] ? 1 : 0); set('2', S.done[2] ? 1 : 0); set('3', S.done[3] ? 1 : 0); set('4', S.done[4] ? 1 : 0);
  set('a', S.m5step >= 1 ? 1 : 0); set('b', S.m5step >= 2 ? 1 : 0); set('c', S.m5step >= 3 ? 1 : 0);
  set('T', S.trap ? 0 : 1); set('H', S.secret ? 1 : 0); set('X', 0);
  W.chest.open = !!S.done[4]; W.chest.lid = S.done[4] ? 1 : 0;
  setGuardPos(S.done[1] ? 1 : 0); G.guardRaiseT = S.done[1] ? 1 : 0;
  if (!S.case) S.case = newCase();
  ['items', 'signs', 'signKo'].forEach(k => { if (!S[k]) S[k] = {}; }); if (S.hearts == null) S.hearts = 3;
  { const fr = makeRng(S.seed + 99); S.floorSafe = [14 + fr.int(0, 2), 14 + fr.int(0, 2)]; }
  set('L', S.lOpen ? 1 : 0);
  ACT.reset(); ACT.buildSigns();
  if (S.case.solved && !S.done[2]) { // 정답 연출 도중 새로고침한 경우
    S.case.seal = true; S.items = S.items || {}; S.items.seal1 = true; S.done[2] = true; S.score += 200; S.codes.push(G.data.codes[1]);
    if (Object.keys(S.done).length === 5 && !S.ev.allBonus) { S.ev.allBonus = true; S.score += 500; }
    set('2', 1);
  }
  const cw = W.suspects.char; const sv = S.case.solved;
  cw.z = sv ? 119.3 : 121; cw.yaw = sv ? -0.5 : 0; cw.circle.z = cw.z; G.caseHatch = sv ? 1 : 0; G.sealY = sv ? 1 : -0.3; G.culpritGlow = sv;
  W.revealed.fill(0);
  if (S.revealed) for (let i = 0; i < S.revealed.length && i < W.revealed.length; i++) W.revealed[i] = S.revealed[i] === '1' ? 1 : 0;
  W.shadows.length = 0;
  Player.reset(S.pos.x, S.pos.z, S.pos.yaw);
  // 달력 텍스처 (실제 오늘 날짜)
  const now = new Date();
  if (!W.calDecal) {
    const cv = calendarTex(now.getMonth() + 1, now.getDate());
    const q = new Geo(); q.plane(3.4, 2.72, [1, 1, 1], MAT.PLAIN);
    W.calDecal = { mesh: R.upload(q), gltex: R.texFromCanvas(cv), M: M4.chain(M4.trans(W.calendarPos.x, W.calendarPos.y, W.calendarPos.z), M4.rotY(-Math.PI / 2)) };
  }
  updateStele();
  UI.hud();
}
function updateStele() {
  const W = G.W; const cv = steleTex(G.S ? G.S.codes : []);
  if (!W.steleTex) W.steleTex = R.texFromCanvas(cv); else R.updateTex(W.steleTex, cv);
}

/* ---------- 상호작용 대상 ---------- */
function buildInteractables() {
  const W = G.W, I = W.interact; I.length = 0;
  const add = o => I.push(Object.assign({ r: 2.6 }, o));
  W.warriors.forEach(w => {
    if (w.kind === 'suspect') { const sd = CASE.suspects.find(x => x.id === w.sid); add({ x: w.x, z: w.z + 0.6, r: 2.3, label: () => `용의자 ${sd.zh}(${sd.ko})에게 말을 건다`, act: () => UI.suspectTalk(sd) }); }
    if (w.kind === 'maze') add({ x: w.x, z: w.z, r: 2.8, label: () => G.S.m5step > w.step ? '미로의 병마용 (통과)' : '미로의 병마용에게 말을 건다', act: () => G.S.m5step > w.step ? UI.toast('병마용이 길을 비켜 주었다.') : openMission(5, w.step) });
  });
  add({ x: 31, z: 135.4, r: 3.6, when: () => !G.S.done[1] || Player.z > 133, label: () => G.S.done[1] ? '문지기 병마용 (임무 완료)' : '문지기 병마용에게 말을 건다', act: () => G.S.done[1] ? UI.toast('문지기: “去吧！(Qù ba!) 가거라!”', '去吧！') : openMission(1) });
  add({ x: 31, z: 116.4, r: 2.9, label: () => G.S.done[2] ? '황금 받침대 (옥새를 되찾았다)' : G.S.case.started ? '빈 받침대 — 사건 수첩을 연다' : '텅 빈 황금 받침대를 조사한다', act: () => G.S.done[2] ? UI.toast('옥새를 되찾고 비밀 통로가 열렸다.') : G.S.case.started ? UI.notebook() : startCase() });
  Object.entries(G.W.clues).forEach(([id, c]) => add({ x: c.x, z: c.z, r: c.type === 'stele' ? 2.6 : 2.1, label: () => (G.S.case.found[id] ? '다시 읽기: ' : '단서를 조사한다: ') + CASE.clues[id].ko, act: () => findClue(id) }));
  Object.entries(G.W.items).forEach(([id, it]) => { const key = id === 'seal2' ? 'seal' : id; const I = ITEMS[key];
    add({ x: it.px || it.x, z: it.pz || it.z, r: 2.1, when: () => !G.S.items[id], label: () => `${I.icon} ${I.ko}(${I.zh}) 줍기 ${I.need ? '[필수]' : '[선택]'}`, act: () => ACT.pickup(id) }); });
  Object.entries(G.W.signs).forEach(([id, sg]) => add({ x: sg.ix, z: sg.iz, r: 2.3, label: () => (G.S.signs[id] ? '📜 다시 읽기: ' : '📜 중국어 단서를 읽는다: ') + SIGN_TITLE[id].split(' · ')[1], act: () => UI.signDoc(id) }));
  add({ x: 50.9, z: 65, r: 2.2, when: () => !G.S.lOpen, label: () => G.S.items.bkey ? '🗝️ 청동 열쇠로 잠긴 문을 연다' : '🔒 잠긴 청동 문 (청동 열쇠 필요)', act: () => {
    if (!G.S.items.bkey) { Sfx.wrong(); UI.toast('굳게 잠겨 있다. 열쇠 구멍이 있다… 🗝️ 청동 열쇠(青铜钥匙)가 필요하다.', '锁住了'); return; }
    G.S.lOpen = true; Sfx.unlock(); setTimeout(() => openDoor('L'), 300); UI.toast('청동 열쇠를 돌리자 문이 바닥으로 가라앉는다!', '开了！'); saveGame(); } });
  add({ x: 48.6, z: 88, r: 3.0, label: () => G.S.done[3] ? '고대 돌 달력 (해독 완료)' : '벽의 고대 달력을 조사한다', act: () => G.S.done[3] ? UI.toast('달력의 빛이 사라졌다.') : openMission(3) });
  add({ x: 31, z: 66.2, r: 2.8, label: () => G.S.done[4] ? '열린 보물상자' : '보물상자를 조사한다', act: () => G.S.done[4] ? UI.toast('상자 안은 텅 비어 있다…') : openMission(4) });
  add({ x: 11, z: 65, r: 2.4, label: () => '벽의 용(龍) 문양을 조사한다', when: () => !G.S.secret, act: openSecret });
  add({ x: 5, z: 65, r: 2.4, label: () => G.S.seal ? '청동 호부 (이미 조사함)' : '빛나는 보물을 조사한다', when: () => G.S.secret, act: takeSeal });
  add({ x: 31, z: 88, r: 2.6, label: () => '낙서(洛书) 돌판을 살펴본다', act: () => UI.toast('가로·세로·대각선 숫자를 더하면 모두 十五(15)! 고대 중국의 마방진 “洛书(Luòshū)”', '洛书') });
  add({ x: 31, z: 12, r: 3.2, label: () => !G.S.emblem ? '💠 황제 문양판을 살펴본다' : (G.S.codeOk ? '🔑 황금 자물쇠를 연다' : '암호 입력 장치를 조작한다'), act: openCodePanel });
}

/* ---------- 미션 ---------- */
function openMission(m, step) {
  if (G.state !== 'play') return;
  G.state = 'mission'; G.mission = { m, step: step != null ? step : null, phase: G.S.mq[m] === 0 && step == null || (m === 5 && step === 0 && !G.S.ev.m5intro) ? 'intro' : 'q' };
  if (m === 5) G.S.ev.m5intro = true;
  UI.mission();
}
function curQuestion() {
  const { m, step } = G.mission; const qs = G.data.M[m].questions;
  return m === 5 ? qs[step] : qs[G.S.mq[m]];
}
function answerResult(ok) {
  const S = G.S, qs = curQuestion(); G.mission.tries = (G.mission.tries || 0) + 1;
  if (!ok) { S.wrong++; Sfx.wrong(); G.mission.firstWrong = true; saveGame(); return; }
  S.correct++; const first = !G.mission.firstWrong;
  const pts = 100 + (first ? 50 : 0); S.score += pts; Sfx.correct();
  S.log.push({ m: G.mission.m, zh: qs.zh, ok1: first, hint: !!G.mission.hinted });
  G.mission.lastPts = pts;
  setTimeout(() => Voice.say(qs.after.zh, 'clear'), 450);
  saveGame();
}
function nextQuestion() {
  const { m } = G.mission, S = G.S;
  G.mission.firstWrong = false; G.mission.hinted = false; G.mission.tries = 0;
  if (m === 5) { // 미로: 병마용 하나 = 문제 하나
    S.m5step++; const gate = ['a', 'b', 'c'][S.m5step - 1];
    if (S.m5step >= 3) { completeMission(5); return; }
    closeMission(); openDoor(gate); UI.toast('병마용이 고개를 끄덕이자 청동 창살이 올라간다!', '通过！'); saveGame(); return;
  }
  S.mq[m]++;
  if (S.mq[m] >= G.data.M[m].questions.length) { completeMission(m); return; }
  UI.mission(); saveGame();
}
function completeMission(m) {
  const S = G.S; S.done[m] = true; S.score += 200;
  const code = S.codesTarget[m - 1]; S.codes.push(code);
  if (Object.keys(S.done).length === 5 && !S.ev.allBonus) { S.ev.allBonus = true; S.score += 500; }
  G.mission.phase = 'success'; G.mission.code = code; UI.mission(); Sfx.codeGet();
  updateStele(); saveGame(); UI.hud();
}
function closeMission() {
  if (G.state !== 'mission') return;
  const m = G.mission; UI.hide('#mission'); G.state = 'play';
  if (m.phase === 'success' && !m.applied) {
    m.applied = true;
    const id = m.m;
    if (id === 4) chestEvent();
    else if (id === 5) { openDoor('c'); UI.toast('마지막 창살이 열렸다! 최종 탈출구로 가자!', '第五个密码'); }
    else if (id === 2) { openDoor('2'); UI.toast('북쪽 벽의 비밀 통로가 열렸다! 암호 ' + G.S.codes.length + '/5 획득', '秘密通道打开了！'); }
    else if (id === 1) startGuardCutscene();
    else { openDoor(String(id)); UI.toast(`석문이 열렸다! 암호 ${G.S.codes.length}/5 획득`, '石门打开了！'); }
  }
  speechSynthesis && speechSynthesis.cancel && speechSynthesis.cancel();
  UI.hud(); saveGame();
}
function openDoor(id) { const d = G.W.doors[id]; d.target = 1; Sfx.doorOpen(id === '1' || id === 'X' ? 3.5 : 2.5); Player.cam.shake = 0.5; }
function chestEvent() {
  // 이벤트 3: 보물상자를 열면 붉은 빛
  G.W.chest.open = true; G.redLight = 1; Sfx.redFlash(); UI.flashRed();
  UI.toast('상자에서 갑자기 붉은 빛이 터져 나왔다…!', '啊！');
  setTimeout(() => { Sfx.treasure(); openDoor('4'); UI.toast(`보물 속에서 암호를 찾았다! (${G.S.codes.length}/5) 미로의 문이 열렸다`, '宝藏！'); }, 1600);
}
function openSecret() {
  G.S.secret = true; openDoor('H'); Sfx.grind();
  UI.toast('용 문양을 누르자 벽이 바닥으로 가라앉는다… 숨겨진 방이다!', '密室'); saveGame();
}
function takeSeal() {
  if (G.S.seal) { UI.toast('虎符 hǔfú — 군대를 움직이는 청동 호랑이 부절'); return; }
  G.S.seal = true; G.S.score += 100; Sfx.treasure(); UI.hud();
  UI.toast('보너스 +100점! 虎符(hǔfú) = 군대를 움직일 때 쓰던 진나라의 청동 호랑이 부절', '虎符'); saveGame();
}

/* ---------- 최종 암호 ---------- */
function openCodePanel() {
  const S = G.S;
  if (!S.emblem) {
    const n = ACT.have('seal');
    if (n < 2) { Sfx.wrong(); UI.toast(`황제 문양판에 옥새 조각 두 개가 들어갈 홈이 있다… 💠 (${n}/2)`, '把玉玺放在这里'); return; }
    S.emblem = true; Sfx.treasure(); Player.cam.shake = 0.4; UI.toast('옥새 두 조각을 문양판에 맞추자 황제의 문양이 빛난다! 암호 장치가 깨어났다.', '纹章完成了！'); saveGame(); UI.hud(); return;
  }
  if (S.codeOk) { tryGoldKey(); return; }
  if (S.codes.length < 5) { UI.toast(`아직 암호가 부족하다… (${S.codes.length}/5)`, '密码不够'); return; }
  G.state = 'mission'; G.codeEntry = ''; UI.codePanel();
}
function tryGoldKey() {
  if (!G.S.items.gkey) { Sfx.wrong(); UI.toast('암호는 맞았지만 거대한 황금 자물쇠가 잠겨 있다… 🔑 황금 열쇠(黄金钥匙)가 필요하다!', '还需要钥匙！', true); return false; }
  Sfx.unlock(); startEscape(); return true;
}
function submitCode() {
  const want = G.S.codes.join('');
  if (G.codeEntry.length < 5) { UI.codeMsg('숫자 다섯 개를 모두 입력하세요.'); return; }
  if (G.codeEntry === want) {
    UI.hide('#codepanel'); Sfx.correct(); G.S.codeOk = true; G.state = 'play'; saveGame(); UI.hud();
    if (!tryGoldKey()) UI.toast('密码正确！ 암호가 맞았다! 하지만 황금 자물쇠가 남아 있다.', '密码正确！');
  } else {
    G.S.wrong++; Sfx.wrong(); UI.codeMsg('密码错误！<br>请再试一次！<div style="font-size:13px;color:#bca880;font-family:var(--ko)">암호가 틀렸습니다! 다시 시도하세요.</div>', true);
    G.codeEntry = ''; UI.codeSlots(); saveGame();
  }
}
function startEscape() {
  G.state = 'cutscene'; G.S.status = 'escaped';
  openDoor('X'); Sfx.bigDrums(); Player.cam.shake = 1.2;
  const p = Player; const pts = [[p.x < 31 ? 26.5 : 35.5, p.z], [p.x < 31 ? 26.5 : 35.5, 6.8], [31, 5.5], [31, 0.9]];
  G.cut = { t: 0, pts, i: 0 };
  UI.hide('#hud');
}

/* ---------- 이벤트 ---------- */
function events(dt) {
  const S = G.S, W = G.W, p = Player;
  const r = Math.floor(p.z / T), c = Math.floor(p.x / T);
  // 이벤트 2: 좁은 통로에서 뒤쪽 석문이 닫힘
  if (!S.trap && r <= 48 && r >= 46 && c === 15) {
    S.trap = true; W.doors.T.target = 0; setTimeout(() => { Sfx.doorSlam(); p.cam.shake = 1.0; }, 250);
    UI.toast('쿵!! 뒤에서 석문이 닫혔다… 이제 앞으로 나아갈 수밖에 없다!', '石门关上了！', true); saveGame();
  }
  // 병마용의 방 첫 진입 — 멀리서 움직이는 그림자
  if (!S.ev.hallShadow && r <= 62 && r >= 53) { S.ev.hallShadow = true; spawnShadow(25, 108, 1, 0, 6); setTimeout(() => UI.toast('저 멀리… 무언가 움직였다?', '谁？'), 600); }
  // MISSION 2: 병마용의 방에 들어서면 사건 발생
  if (!S.case.started && S.done[1] && r <= 63 && r >= 53 && !G.caseT) { G.caseT = setTimeout(() => { G.caseT = null; if (G.state === 'play' && !G.S.case.started) startCase(); }, 1800); }
  // 이벤트 4: 미로 막다른 길
  (W.deadEnds || []).forEach((d, i) => {
    const key = 'dead' + i;
    if (!S.ev[key] && r === d.r && c === d.c) { S.ev[key] = true; spawnShadow(d.sx, d.sz, d.dx, d.dz, 4); UI.toast('막다른 길이다… 멀리서 병마용의 그림자가 나타났다!', '死路！', true); }
  });
  // 이벤트 5: 마지막 탈출구 접근 → 거대한 북소리
  if (!S.ev.drums && r <= 7 && r >= 3) { S.ev.drums = true; Sfx.bigDrums(); p.cam.shake = 1.4; UI.toast('둥… 둥… 둥…! 거대한 북소리가 무덤을 울린다!', '咚！咚！咚！'); }
  // 문지기가 깨어남: 눈에 붉은 불, 미늘창을 엇갈려 석문을 막는다
  if (!S.ev.guardWake && Math.hypot(p.x - 31, p.z - 134.6) < 12) {
    S.ev.guardWake = true; G.guardWakeT = 0; Sfx.growl(); setTimeout(() => { Sfx.clang(); Player.cam.shake = 0.5; }, 900);
    UI.toast('문지기 병마용의 눈에 붉은 불이 켜졌다… 거대한 창이 석문을 가로막는다!', '站住！', true);
  }
  // 이벤트 1: 병마용 머리가 천천히 움직임
  W.warriors.forEach(w => {
    const dx = p.x - w.x, dz = p.z - w.z, d = Math.hypot(dx, dz);
    const look = Math.atan2(dx, dz) - w.yaw; let rel = angDiff(0, look);
    if (w.kind === 'hall') {
      if (d < 3.6) { if (Math.abs(w.headTarget) < 0.01 && G.time - (G.grindT || 0) > 2.2) { Sfx.grind(); G.grindT = G.time; } w.headTarget = clamp(rel, -1.1, 1.1); }
      else if (d > 7) w.headTarget = 0;
    } else if (w.kind !== 'statue') w.headTarget = d < 7 ? clamp(rel, -0.9, 0.9) : 0;
    w.headYaw += (w.headTarget - w.headYaw) * (1 - Math.exp(-dt * (w.kind === 'hall' ? 0.9 : 2.5)));
  });
}
/* ---------- MISSION 2: 추리 ---------- */
function startCase() {
  const C = G.S.case; if (C.started) return;
  C.started = true; saveGame(); UI.hud();
  Sfx.drum(0, 0.9); Sfx.redFlash(); Player.cam.shake = 0.6;
  UI.caseIntro();
}
function findClue(id) {
  const C = G.S.case; if (!C.started) { C.started = true; }
  const first = !C.found[id];
  if (first) { C.found[id] = true; G.S.score += 20; Sfx.codeGet(); }
  UI.clueDoc(id, first);
  if (first) { const n = Object.keys(C.found).length; UI.toast(`📒 단서를 사건 수첩에 기록했다! (${n}/6) +20점`, '找到线索！'); UI.pulseNotebook(); }
  UI.hud(); saveGame();
}
function submitDeduction() {
  const C = G.S.case, T0 = teacherCase();
  if (!C.pick || !C.reason) return false;
  const ok = T0 && C.pick === T0.c && C.reason === T0.r;
  if (!ok) { C.attempts++; G.S.wrong++; Sfx.wrong(); saveGame(); UI.hud(); return false; }
  const first = C.attempts === 0, pts = 100 + (first ? 50 : 0);
  G.S.correct++; G.S.score += pts; C.solved = true;
  G.S.log.push({ m: 2, zh: '推理：谁拿了玉玺？', ok1: first, hint: C.hints > 0 });
  Sfx.correct(); saveGame();
  setTimeout(() => { UI.closeOverlay(); startCaseCutscene(); }, 900);
  return true;
}
function startCaseCutscene() {
  G.state = 'cutscene'; G.cut = { kind: 'case', t: 0 };
  Player.reset(31, 124.8, 0.12); UI.prompt(null);
}
function caseCutscene(dt) {
  const C = G.cut, w = G.W.suspects.char; const t0 = C.t; C.t += dt; const t = C.t;
  const once = (k, at, fn) => { if (t0 < at && t >= at) fn(); };
  once('glow', 0.4, () => { G.culpritGlow = true; Sfx.redFlash(); UI.flashRed(); Player.cam.shake = 0.8; UI.toast('车兵의 눈이 붉게 빛난다…!', '是车兵！', true); });
  once('move', 1.2, () => Sfx.grind());
  const a = smooth(clamp((t - 1.2) / 2.4, 0, 1));
  w.z = 121 - 1.7 * a; w.yaw = -0.5 * a; w.circle.z = w.z;
  w.headTarget = w.headYaw = 0.6 * a;
  once('hatch', 3.8, () => { Sfx.doorOpen(1.5); });
  G.caseHatch = smooth(clamp((t - 3.8) / 1.2, 0, 1));
  G.sealY = lerp(-0.3, 1.0, smooth(clamp((t - 4.6) / 1.4, 0, 1)));
  once('seal', 5.0, () => { Sfx.treasure(); UI.toast('바닥 비밀칸에서 황제의 옥새가 떠올랐다!', '玉玺！'); });
  once('get', 7.0, () => {
    G.S.case.seal = true; G.S.items.seal1 = true; Sfx.codeGet(); UI.toast('옥새를 되찾았다! …그런데 반쪽뿐이다! 💠 옥새 조각 획득 (1/2) — 나머지 반쪽을 찾아야 한다.', '玉玺碎片！'); UI.hud();
    G.mission = { m: 2 }; G.state = 'mission'; completeMission(2);
  });
  Player.cam.yaw += angDiff(Player.cam.yaw, 0.12) * (1 - Math.exp(-dt * 3));
}
function spawnShadow(x, z, dx, dz, life) { G.W.shadows.push({ x, z, dx, dz, t: 0, life }); Sfx.shadow(); }

/* ---------- 메인 업데이트 ---------- */
function update(dt) {
  const W = G.W;
  for (const id in W.doors) {
    const d = W.doors[id], sp = d.kind === 'trap' ? 5 : d.kind === 'gate' ? 0.3 : d.kind === 'bars' ? 0.6 : 0.45;
    if (d.open < d.target) d.open = Math.min(d.target, d.open + sp * dt); else if (d.open > d.target) d.open = Math.max(d.target, d.open - sp * dt);
  }
  if (W.chest.open) W.chest.lid = Math.min(1, W.chest.lid + dt * 0.8);
  G.redLight = Math.max(0, G.redLight - dt * 0.25);
  if (G.guardWakeT != null && G.guardWakeT < 1) G.guardWakeT += dt * 0.9;

  W.shadows.forEach(s => { s.t += dt; s.x += s.dx * dt * 0.6; s.z += s.dz * dt * 0.6; });
  W.shadows = W.shadows.filter(s => s.t < s.life);

  if (G.state === 'play' || G.state === 'mission') {
    G.S.timeLeft -= dt; G.S.playTime += dt;
    const tl = G.S.timeLeft;
    [[300, '남은 시간 5분!', '还有五分钟！'], [180, '남은 시간 3분!', '还有三分钟！'], [60, '남은 시간 1분! 서둘러!', '还有一分钟！']].forEach(([s, ko, zh]) => {
      if (tl <= s && !G.S.ev['w' + s] && G.S.timeLeft + dt > s - 1) { G.S.ev['w' + s] = true; Sfx.warn(); UI.toast(ko, zh, true); }
    });
    if (tl <= 0) { G.S.timeLeft = 0; gameOver(); return; }
  }
  if (G.state === 'play') {
    if (!ACT.falling) Player.update(dt, G.input, W, false);
    events(dt); ACT.update(dt); if (G.state !== 'play') return;
    // 가까운 상호작용 대상
    let best = null, bd = 1e9;
    W.interact.forEach(o => { if (o.when && !o.when()) return; const d = Math.hypot(Player.x - o.x, Player.z - o.z); if (d < o.r && d < bd) { bd = d; best = o; } });
    G.near = best; UI.prompt(best);
    G.saveT += dt; if (G.saveT > 2) { G.saveT = 0; saveGame(); }
    G.revealT += dt; if (G.revealT > 0.25) { G.revealT = 0; reveal(); }
  } else if (G.state === 'mission') { Player.update(dt, G.input, W, true); }
  else if (G.state === 'cutscene') { if (G.cut && G.cut.kind === 'guards') guardCutscene(dt); else if (G.cut && G.cut.kind === 'case') caseCutscene(dt); else if (G.cut && G.cut.kind === 'death') ACT.deathCut(dt); else cutscene(dt); }
  // 구역
  const zr = Math.floor(Player.z / T), zc = Math.floor(Player.x / T);
  const z = (G.state === 'title' || G.state === 'intro' || G.state === 'setup') ? (G.state === 'intro' ? 2 : 1) : zoneOfCell(clamp(zr, 0, MH - 1), clamp(zc, 0, MW - 1));
  if (z !== G.zone) { G.zone = z; UI.zone(); if (G.state === 'play') ACT.setCheckpoint(z); }
  const Z = ZONES[z];
  for (let i = 0; i < 3; i++) R.amb[i] = lerp(R.amb[i], Z.amb[i] + G.exitLight * 0.6, 1 - Math.exp(-dt * 2));
  R.fogD = lerp(R.fogD, z === 5 ? 0.055 : z === 8 ? 0.06 : z === 7 ? 0.008 : z === 1 ? 0.025 : 0.036, 1 - Math.exp(-dt * 2));
  for (let i = 0; i < 3; i++) R.fogC[i] = lerp([0.02, 0.018, 0.02][i], [1, 0.97, 0.9][i], G.exitLight * G.exitLight);
}
function reveal() {
  const W = G.W, pr = Math.floor(Player.z / T), pc = Math.floor(Player.x / T), rad = 7;
  for (let r = pr - rad; r <= pr + rad; r++) for (let c = pc - rad; c <= pc + rad; c++) {
    if (r < 0 || c < 0 || r >= MH || c >= MW) continue;
    const i = r * MW + c; if (W.revealed[i]) continue;
    if ((r - pr) ** 2 + (c - pc) ** 2 > rad * rad) continue;
    if (W.at(r, c) === 'H' && !G.S.secret) continue;
    if (losCell(W, pr, pc, r, c)) W.revealed[i] = 1;
  }
}
function cutscene(dt) {
  const C = G.cut, p = Player; C.t += dt;
  G.exitLight = clamp((C.t - 1.5) / 4, 0, 1);
  if (C.t > 2.2 && C.i < C.pts.length) {
    const [tx, tz] = C.pts[C.i]; const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d < 0.3) C.i++;
    else { p.moveDir = [dx / d, dz / d]; p.facing += angDiff(p.facing, Math.atan2(dx, dz)) * (1 - Math.exp(-dt * 8)); p.speed = 3.6; p.x += dx / d * p.speed * dt; p.z += dz / d * p.speed * dt; p.phase += dt * p.speed * 2.1; p.moving = true; }
  } else { p.speed = 0; }
  p.cam.yaw += angDiff(p.cam.yaw, 0) * (1 - Math.exp(-dt * 2)); p.cam.pitch = lerp(p.cam.pitch, 0.18, dt);
  if (C.t > 7.5 && !C.faded) { C.faded = true; UI.fade(true, true); Sfx.escapeMusic(); }
  if (C.t > 9.5 && !C.done) { C.done = true; finishGame(true); }
}
function gameOver() {
  if (G.state === 'end') return;
  G.S.status = 'failed'; UI.hide('#mission'); UI.hide('#codepanel'); finishGame(false);
}
function finishGame(win) {
  const S = G.S; G.state = 'end';
  const total = S.correct + S.wrong, acc = total ? S.correct / total : 0;
  let grade = 'C';
  if (win) grade = (acc >= 0.9 && S.hints <= 1) ? 'S' : acc >= 0.75 ? 'A' : acc >= 0.55 ? 'B' : 'C';
  S.grade = grade; S.result = win ? 'escaped' : 'failed';
  const rec = { name: S.name, date: new Date().toLocaleString('ko-KR'), diff: S.diff, result: S.result, score: S.score, time: Math.round(S.playTime),
    correct: S.correct, wrong: S.wrong, hints: S.hints, missions: Object.keys(S.done).length, grade, log: S.log,
    items: ITEM_ORDER.reduce((n, k) => n + (k === 'seal' ? ACT.have('seal') / 2 : ACT.have(k) ? 1 : 0), 0), deaths: S.deaths || 0, signs: Object.keys(S.signs || {}).length };
  const recs = store.get(REC_KEY, []); recs.unshift(rec); store.set(REC_KEY, recs.slice(0, 40));
  store.del(SAVE_KEY);
  G.lastRec = rec;
  UI.hide('#hud'); UI.end(win, rec);
}

/* ---------- 렌더링 ---------- */
function render() {
  const W = G.W, t = G.time;
  R.resize();
  let view, camPos;
  if (G.state === 'title' || G.state === 'setup') {
    const a = t * 0.05; camPos = [31 + Math.sin(a) * 9, 3.2 + Math.sin(t * 0.13) * 0.4, 142 + Math.cos(a) * 7];
    view = M4.lookAt(camPos, [31, 3.2, 136], [0, 1, 0]);
  } else if (G.state === 'intro') {
    const k = clamp(G.introT / 26, 0, 1);
    camPos = [31 + Math.sin(G.introT * 0.15) * 1.5, lerp(5.5, 2.6, k), lerp(129, 120, k)];
    view = M4.lookAt(camPos, [31, lerp(2.5, 2.4, k), lerp(110, 112, k)], [0, 1, 0]);
  } else {
    Player.updateCamera(G.dt || 1 / 60, W, ZONES[G.zone].ceil); view = Player.view; camPos = Player.camPos;
  }
  const proj = M4.persp(1.05, R.canvas.width / R.canvas.height, 0.1, 150);
  // 조명 선택 (가장 가까운 것부터)
  const ref = (G.state === 'play' || G.state === 'mission' || G.state === 'cutscene' || G.state === 'paused' || G.state === 'end') ? [Player.x, Player.z] : [camPos[0], camPos[2] - 6];
  const L = [];
  W.lights.forEach(l => {
    let i = l.base * (0.82 + 0.1 * Math.sin(t * 11 + l.ph) + 0.08 * Math.sin(t * 23.7 + l.ph * 2));
    if (l.secret) i = G.S && G.S.secret ? l.base : 0;
    if (l.exit) i = G.exitLight * 3;
    if (i <= 0) return;
    const dd = (l.x - ref[0]) ** 2 + (l.z - ref[1]) ** 2;
    L.push({ x: l.x, y: l.y, z: l.z, r: l.r, c: l.c, i, d: l.pri && dd < 1000 ? -1 : dd });
  });
  if (G.culpritGlow && G.S && !G.S.done[2]) L.push({ x: 33, y: 2.2, z: W.suspects.char.z + 0.6, r: 6, c: [1, 0.1, 0.05], i: 1.6 + 0.4 * Math.sin(t * 6), d: -2 });
  if (G.S && G.S.case && G.S.case.solved && !G.S.case.seal) L.push({ x: 33, y: 1.5, z: 121, r: 7, c: [0.3, 1, 0.6], i: 2, d: -3 });
  { const { wake } = guardState(); if (wake > 0) W.warriors.forEach(w => { if (w.kind === 'guard') L.push({ x: w.x, y: w.y + 1.8 * w.s, z: w.z + 0.9, r: 5, c: [1, 0.12, 0.05], i: wake * (1.1 + 0.3 * Math.sin(t * 4 + w.x)), d: -6 }); }); }
  if (G.redLight > 0) L.push({ x: 31, y: 2.2, z: 65.5, r: 16, c: [1, 0.08, 0.04], i: G.redLight * 4 * (0.7 + 0.3 * Math.sin(t * 20)), d: -1 });
  ACT.lights(L, t);
  L.sort((a, b) => a.d - b.d);
  const lights = L.slice(0, R.maxLights - 1);
  if (G.state !== 'title' && G.state !== 'setup' && G.state !== 'intro') { const tch = G.S && G.S.items && G.S.items.torch; lights.push({ x: Player.x, y: tch ? 2.0 : 1.5, z: Player.z, r: tch ? 11 : 5, c: [1, tch ? 0.62 : 0.78, tch ? 0.3 : 0.5], i: tch ? 1.3 * (0.9 + 0.1 * Math.sin(t * 17)) : 0.55 }); }
  R.begin(view, proj, camPos, t, lights);
  R.draw(W.staticMesh);
  // 동적: 문
  for (const id in W.doors) {
    const d = W.doors[id]; const [r0, c0] = d.cells[0], cz = cellZ(r0);
    if (d.kind === 'gate') {
      const x0 = c0 * T, x1 = (d.cells[d.cells.length - 1][1] + 1) * T, a = smooth(d.open) * 1.75;
      R.draw(d.leaves[0], M4.chain(M4.trans(x0 + 0.05, 0, cz), M4.rotY(a)));
      R.draw(d.leaves[1], M4.chain(M4.trans(x1 - 0.05, 0, cz), M4.rotY(-a)));
    } else if (d.kind === 'locked') { /* ACT.render */ } else if (d.kind === 'secret') {
      if (d.open < 0.99) R.draw(W.dyn.secret, M4.chain(M4.trans(9.65, -smooth(d.open) * d.h, cellZ(r0)), M4.scale(1, d.h, 1)));
    } else {
      const mesh = d.kind === 'bars' ? W.dyn.bars : W.dyn.slab; const cx = cellX(c0);
      if (d.open < 0.99) R.draw(mesh, M4.chain(M4.trans(cx, smooth(d.open) * (d.h - 0.05), cz), M4.scale(1, d.h, 1)));
    }
  }
  // 병마용 머리
  W.warriors.forEach(w => {
    if (w.kind === 'guard') return;
    const mesh = w.kind === 'suspect' ? (w.sid === 'gen' ? W.dyn.headGeneral : (w.sid === 'char' && G.culpritGlow) ? W.dyn.headMaze : W.dyn.head) : w.kind === 'general' ? W.dyn.headGeneral : w.kind === 'statue' ? W.dyn.headStatue : w.kind === 'maze' ? W.dyn.headMaze : W.dyn.head;
    R.draw(mesh, M4.chain(M4.trans(w.x, w.y || 0, w.z), M4.rotY(w.yaw), M4.scale(w.s, w.s, w.s), M4.trans(0, 1.62, 0), M4.rotY(w.headYaw)));
  });
  R.draw(W.dyn.lid, M4.chain(M4.trans(31, 1.15, 64.48), M4.rotX(-smooth(W.chest.lid) * 1.9)));
  drawGuards(t);
  Object.values(W.suspects).forEach(w => R.draw(W.dyn.suspect[w.sid], M4.chain(M4.trans(w.x, 0, w.z), M4.rotY(w.yaw), M4.scale(w.s, w.s, w.s))));
  if (G.caseHatch > 0) R.draw(W.dyn.hole, M4.trans(33, 0.006, 121), null, 0.5 + 0.3 * Math.sin(t * 4));
  R.draw(W.dyn.hatch, M4.trans(33 + (G.caseHatch || 0) * 1.15, 0, 121));
  if (G.S && G.S.case && G.S.case.solved && !G.S.case.seal) R.draw(W.dyn.seal, M4.chain(M4.trans(33, G.sealY, 121), M4.rotY(t * 1.2)), null, 0.3);
  if (G.S && G.S.case && !G.S.done[2]) Object.entries(W.clues).forEach(([id, c]) => { if (G.S.case.found[id]) return; const y = c.type === 'stele' ? 3.3 : 0.35; R.draw(W.dyn.spark, M4.chain(M4.trans(c.x, y + Math.sin(t * 3 + c.x) * 0.08, c.z), M4.scale(1 + 0.4 * Math.sin(t * 5 + c.z), 1, 1)), null, 0.8); });
  if (G.state !== 'title' && G.state !== 'setup' && G.state !== 'intro') { Player.draw(); ACT.render(t); }
  // 미션 표시 마커
  if (G.S && G.state !== 'title' && G.state !== 'setup' && G.state !== 'intro') {
    const S = G.S, mk = [];
    if (!S.done[1]) mk.push([31, 4.2, 134.4]); if (!S.done[2] && !S.case.started) mk.push([31, 3.2, 115]);
    if (!S.done[3]) mk.push([48.6, 4.9, 88]); if (!S.done[4]) mk.push([31, 2.7, 65]);
    if (S.m5step < 3) { const w = W.warriors.find(w => w.kind === 'maze' && w.step === S.m5step); mk.push([w.x, 3.0, w.z]); }
    if (S.codes.length >= 5 && G.state !== 'cutscene') mk.push([31, 2.6, 11]);
    mk.forEach(([x, y, z]) => R.draw(W.dyn.marker, M4.chain(M4.trans(x, y + Math.sin(t * 2.5) * 0.12, z), M4.rotY(t * 1.5)), null, 0.6));
  }
  // 데칼 (현판, 문자, 달력)
  R.blend(true, false);
  R.draw(W.friezeMesh, null, null, 0, W.friezeTex);
  W.decals.forEach(d => { if (d.secret && G.S && G.S.secret) return; R.draw(d.mesh, d.M, null, d.emis || 0, d.gltex); });
  if (W.calDecal) R.draw(W.calDecal.mesh, W.calDecal.M, null, G.S && !G.S.done[3] ? 0.25 + 0.15 * Math.sin(t * 3) : 0, W.calDecal.gltex);
  if (W.steleTex) R.draw(W.steleDecal.mesh, W.steleDecal.M, null, 0.15, W.steleTex);
  ACT.renderDecals();
  // 그림자 병마용
  W.shadows.forEach(s => {
    const a = Math.sin(clamp(s.t / s.life, 0, 1) * Math.PI) * 0.85;
    R.draw(W.dyn.shadow, M4.chain(M4.trans(s.x, 0, s.z), M4.rotY(Math.atan2(s.dx, s.dz)), M4.scale(1.15, 1.15, 1.15)), new Float32Array([1, 1, 1, a]));
  });
  // 탈출구 빛
  if (G.exitLight > 0) { R.blend(true, true); R.draw(W.dyn.light, M4.trans(31, 4.5, 4.4), new Float32Array([1, 0.95, 0.85, G.exitLight * 0.6]), 1); }
  R.blend(false);
  R.mist(W.mist, G.zone === 4 ? [0.6, 0.5, 0.35] : G.zone === 3 ? [0.4, 0.55, 0.55] : [0.5, 0.47, 0.44]);
  R.particles(W.flames, 0);
  R.particles(W.dust, 1);
}

/* ---------- 문지기: 미션 성공 시 옆으로 비켜섬 ---------- */
function setGuardPos(k) {
  const W = G.W; W.warriors.forEach(w => { if (w.kind !== 'guard') return; w.x = lerp(w.bx, w.ox, k); w.circle.x = w.x; });
  W.guardBlock.r = k > 0.35 ? 0 : 0.75;
}
function startGuardCutscene() {
  G.state = 'cutscene'; G.cut = { kind: 'guards', t: 0 };
  Player.reset(31, 142.5, 0); Player.cam.pitch = 0.2; UI.prompt(null); G.guardRaiseT = 0;
  Sfx.clang(); UI.toast('문지기 병마용이 창을 거두었다…', '你可以过去了。');
}
function guardCutscene(dt) {
  const C = G.cut, t0 = C.t; C.t += dt; const t = C.t;
  const once = (at, fn) => { if (t0 < at && t >= at) fn(); };
  G.guardRaiseT = clamp(t / 1.0, 0, 1);                                // 1) 창을 들어 올림
  once(1.0, () => { Sfx.grind(); Sfx.rumble(2.6); Player.cam.shake = 0.6; });
  const k = smooth(clamp((t - 1.0) / 2.6, 0, 1));                     // 2) 받침대째 양옆으로 끌려가듯 이동
  setGuardPos(k); if (t > 1 && t < 3.6) Player.cam.shake = Math.max(Player.cam.shake, 0.25);
  G.W.warriors.forEach(w => { if (w.kind === 'guard') w.headYaw = w.headTarget = -w.side * 0.5 * Math.sin(k * Math.PI); });
  once(3.7, () => { Sfx.drum(0, 1.1); openDoor('1'); UI.toast(`문지기가 비켜서자 거대한 석문이 열린다! 암호 ${G.S.codes.length}/5 획득`, '石门打开了！'); }); // 3) 석문 열림
  if (t > 5.2) { G.state = 'play'; G.cut = null; saveGame(); UI.hud(); }
}

/* ---------- 문지기 병마용 그리기 ---------- */
function guardState() {
  const S = G.S, title = G.state === 'title' || G.state === 'setup' || G.state === 'intro';
  const wake = title ? 1 : (S && S.ev.guardWake ? clamp(G.guardWakeT == null ? 1 : G.guardWakeT, 0, 1) : 0);
  const raise = S && S.done[1] && !title ? clamp(G.guardRaiseT == null ? 1 : G.guardRaiseT, 0, 1) : 0;
  return { wake, raise };
}
function drawGuards(t) {
  const W = G.W, { wake, raise } = guardState();
  W.warriors.forEach(w => {
    if (w.kind !== 'guard') return;
    const breathe = 1 + 0.012 * Math.sin(t * 1.5 + w.x);
    const base = M4.chain(M4.trans(w.x, w.y, w.z), M4.rotY(w.yaw), M4.scale(w.s, w.s * breathe, w.s));
    R.draw(W.dyn.guardBase, M4.trans(w.x, 0, w.z));
    R.draw(W.dyn.guardBody, base);
    const head = M4.chain(base, M4.trans(0, 1.6, 0.02), M4.rotY(w.headYaw), M4.rotX(-0.08));
    R.draw(W.dyn.guardHead, head);
    const glow = 0.7 + wake * (1.1 + 0.35 * Math.sin(t * 4 + w.x));
    R.draw(W.dyn.guardEyes, head, null, glow);
    // 미늘창: 평소엔 곧게 → 깨어나면 엇갈려 석문을 막음 → 미션 성공 후 들어 올림
    const ang = lerp(lerp(-0.1, 0.62, smooth(wake)), -0.12, smooth(raise));
    const px = w.x + w.side * 0.36 * w.s, py = w.y + 1.0 * w.s, pz = w.z + 0.42 * w.s + (w.side > 0 ? 0.05 : -0.05);
    R.draw(W.dyn.halberd, M4.chain(M4.trans(px, py, pz), M4.rotZ(-w.side * ang)));
  });
}

/* ---------- 루프 ---------- */
function frame(ts) {
  const now = ts / 1000; let dt = Math.min(0.05, now - (G.last || now)); G.last = now; G.dt = dt;
  if (G.state !== 'paused') G.time += dt;
  if (G.state === 'intro') { G.introT += dt; UI.introTick(); }
  if (G.state !== 'paused' && G.state !== 'end') update(dt);
  else if (G.state === 'end') update(dt * 0.3);
  if (!window.__noRender) render();
  if (G.state === 'play') UI.hudTick();
  // 자동 저사양 전환
  if (G.state === 'play' && !G.autoQ && !Sfx.settings.lowGfx) {
    G.fps.push(dt); if (G.fps.length > 150) {
      const avg = G.fps.reduce((a, b) => a + b, 0) / G.fps.length; G.autoQ = true;
      if (avg > 1 / 26) { Sfx.settings.lowGfx = true; Sfx.save(); applyGfx(); UI.toast('컴퓨터 성능에 맞춰 저사양 모드로 전환했어요. (설정에서 변경 가능)'); }
    }
  }
  requestAnimationFrame(frame);
}
function applyGfx() { const low = Sfx.settings.lowGfx; R.pixelRatio = low ? 0.6 : 1; R.maxLights = low ? 6 : MAX_LIGHTS; }

/* ---------- 입력 ---------- */
function setupInput() {
  const keymap = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', ShiftLeft: 'run', ShiftRight: 'run' };
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') { if (e.code === 'Escape') e.target.blur(); else return; }
    if (keymap[e.code]) { G.input[keymap[e.code]] = 1; if (G.state === 'play') e.preventDefault(); }
    if (e.code === 'Space' && G.state === 'play') { if (!e.repeat) G.input.jump = true; e.preventDefault(); }
    if (e.code === 'KeyE' && G.state === 'play' && G.near && !e.repeat) G.near.act();
    if (e.code === 'KeyN' && !e.repeat) { if (G.overlay === 'notebook') UI.closeOverlay(); else if (G.state === 'play' && G.S && G.S.case.started && !G.S.done[2]) UI.notebook(); }
    if (e.code === 'Escape' && G.overlay) { UI.closeOverlay(); return; }
    if (e.code === 'Escape') {
      if (G.state === 'mission') { if (!$('#codepanel').classList.contains('hidden')) { UI.hide('#codepanel'); G.state = 'play'; } else closeMission(); }
      else if (G.state === 'play') UI.pause(); else if (G.state === 'paused') UI.resume();
      else if (!$('#modal').classList.contains('hidden')) UI.hide('#modal');
    }
    if (G.state === 'mission') UI.missionKey(e);
  });
  addEventListener('keyup', e => { if (keymap[e.code]) G.input[keymap[e.code]] = 0; });
  addEventListener('blur', () => { Object.assign(G.input, { f: 0, b: 0, l: 0, r: 0, run: 0 }); if (G.state === 'play') UI.pause(); });
  const cv = R.canvas; let drag = false, lx = 0, ly = 0;
  cv.addEventListener('mousedown', e => { drag = true; lx = e.clientX; ly = e.clientY; cv.classList.add('drag'); });
  addEventListener('mouseup', () => { drag = false; cv.classList.remove('drag'); });
  addEventListener('mousemove', e => {
    if (!drag || G.state !== 'play') return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    Player.cam.yaw -= dx * 0.006; Player.cam.pitch = clamp(Player.cam.pitch + dy * 0.004, -0.35, 1.1);
  });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('resize', () => R.resize());
}

/* ---------- 시작 ---------- */
function startPlay(S, withIntro) {
  G.S = S; applyState(); buildInteractables(); G.exitLight = 0; G.redLight = 0; G.cut = null;
  UI.fade(false);
  if (withIntro) { G.state = 'intro'; G.introT = 0; UI.intro(); }
  else beginPlay();
}
function beginPlay() {
  const fresh = G.S.playTime < 1;
  UI.hideScreens(); UI.show('#hud'); G.state = 'play'; G.S.introSeen = true; G.zone = -1; UI.seenZones = {};
  Sfx.init(); Sfx.startAmbience(); UI.hud(); saveGame();
  if (fresh) setTimeout(() => UI.toast('입구를 지키는 병마용에게 다가가 E 키를 눌러 보자!', '找到五个密码！'), 600);
  else UI.toast('저장된 위치에서 탐험을 이어 갑니다.', '欢迎回来！');
}

function boot() {
  const cv = $('#gl');
  if (!R.init(cv)) { $('#nogl').classList.remove('hidden'); return; }
  applyGfx(); R.resize();
  G.W = buildWorld();
  Player.build(); Player.reset(START.x, START.z, START.yaw);
  Voice.init();
  setupInput(); UI.init();
  // 저장된 진행이 있으면 같은 시드로 미리 맵 상태를 맞춰 둔다
  const sv = loadSave(); G.S = sv || newState('탐험가', 'normal'); applyState(); buildInteractables(); if (!sv) G.S = null;
  requestAnimationFrame(frame);
}
window.addEventListener('load', () => { (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve()).then(boot); });
