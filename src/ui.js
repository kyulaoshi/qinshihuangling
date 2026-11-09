'use strict';
/* ===================== 화면 / HUD / 미션 패널 ===================== */
const UI = {
  diff: 'normal', seenZones: {},
  show(s) { $(s).classList.remove('hidden'); }, hide(s) { $(s).classList.add('hidden'); },
  hideScreens() { ['#scr-title', '#scr-setup', '#scr-intro', '#scr-end', '#modal', '#mission', '#codepanel'].forEach(s => this.hide(s)); },
  init() {
    document.body.addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      Sfx.init(); Sfx.click(); this.act(b.dataset.act, b);
    });
    document.querySelectorAll('.diff').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.diff').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); this.diff = b.dataset.diff; Sfx.init(); Sfx.click();
    }));
    $('#inp-name').addEventListener('keydown', e => { if (e.key === 'Enter') this.act('newgame'); });
    // 암호 패드
    const pad = $('#codepanel .pad');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫'].forEach(k => {
      const b = el('button', '', k); b.addEventListener('click', () => { Sfx.click(); this.codeKey(k); }); pad.appendChild(b);
    });
    document.addEventListener('voice-ready', () => { if (G.state === 'mission' && G.mission) this.mission(); });
  },
  act(a) {
    switch (a) {
      case 'start': {
        this.hide('#scr-title'); this.show('#scr-setup'); G.state = 'setup';
        const sv = loadSave();
        if (sv) { $('#cont-info').textContent = `${sv.name} · ${DIFF[sv.diff].label} · 남은 시간 ${fmtTime(sv.timeLeft)} · 암호 ${sv.codes.length}/5`; this.show('#continue-box'); }
        else this.hide('#continue-box');
        const last = store.get('qin_last_name', ''); if (last && !$('#inp-name').value) $('#inp-name').value = last;
        setTimeout(() => $('#inp-name').focus(), 50); break;
      }
      case 'back': this.hide('#scr-setup'); this.show('#scr-title'); G.state = 'title'; break;
      case 'newgame': {
        const name = $('#inp-name').value.trim();
        if (!name) { $('#setup-msg').textContent = '이름을 입력해 주세요. (请写你的名字)'; $('#inp-name').focus(); return; }
        $('#setup-msg').textContent = ''; store.set('qin_last_name', name);
        this.hide('#scr-setup'); startPlay(newState(name, this.diff), true); break;
      }
      case 'continue': { const sv = loadSave(); if (sv) { this.hide('#scr-setup'); startPlay(sv, false); } break; }
      case 'skip': case 'begin': beginPlay(); break;
      case 'help': this.helpModal(); break;
      case 'sound': this.soundModal(); break;
      case 'records': this.recordsModal(); break;
      case 'modal-close': this.closeModal(); break;
      case 'mclose': closeMission(); break;
      case 'cclose': this.hide('#codepanel'); G.state = 'play'; break;
      case 'csubmit': submitCode(); break;
      case 'notebook': if (G.state === 'play') this.notebook(); break;
      case 'nb-close': case 'doc-close': this.closeOverlay(); break;
      case 'cluelog': if (G.state === 'play') this.clueLog(); break;
    }
  },
  // ---------- 토스트 / 프롬프트 ----------
  toast(ko, zh, red) {
    const t = el('div', 'toast' + (red ? ' red' : ''), (zh ? `<span class="zh">${zh}</span>` : '') + ko);
    const box = $('#toasts'); box.appendChild(t); while (box.children.length > 2) box.firstChild.remove();
    setTimeout(() => { t.style.transition = 'opacity .6s'; t.style.opacity = 0; setTimeout(() => t.remove(), 700); }, 4200);
  },
  prompt(o) {
    const p = $('#prompt');
    if (!o) { if (!p.classList.contains('hidden')) p.classList.add('hidden'); return; }
    const txt = o.label(); if ($('#prompt-txt').textContent !== txt) $('#prompt-txt').textContent = txt; p.classList.remove('hidden');
  },
  flashRed() { const f = $('#redflash'); f.style.opacity = 1; setTimeout(() => f.style.opacity = 0, 180); setTimeout(() => f.style.opacity = 0.7, 360); setTimeout(() => f.style.opacity = 0, 700); },
  fade(on, white) { const f = $('#fade'); f.classList.toggle('white', !!white); f.style.opacity = on ? 1 : 0; },
  // ---------- HUD ----------
  hud() {
    const S = G.S; if (!S) return;
    $('#score').textContent = S.score;
    $('#codes').innerHTML = [0, 1, 2, 3, 4].map(i => `<span class="code-chip${S.codes[i] != null ? ' on' : ''}">${S.codes[i] != null ? S.codes[i] : '?'}</span>`).join('');
    $('#hints-left').textContent = S.hintsLeft < 0 ? '∞' : S.hintsLeft;
    if (S.items) {
      const hs = $('#hearts'), prev = +hs.dataset.n; hs.innerHTML = [0, 1, 2].map(i => `<span class="${i < S.hearts ? '' : 'lost'}">❤️</span>`).join('');
      if (prev > S.hearts) { hs.classList.remove('hit'); void hs.offsetWidth; hs.classList.add('hit'); } hs.dataset.n = S.hearts;
      $('#inventory').innerHTML = ITEM_ORDER.map(k => { const I = ITEMS[k], n = ACT.have(k), on = k === 'seal' ? n > 0 : n;
        return `<div class="inv ${on ? 'on' : 'empty'}" data-k="${k}">${on ? I.icon : ''}${I.need ? '<span class="need">필수</span>' : ''}${k === 'seal' && n ? `<span class="cnt">${n}/2</span>` : ''}
          <div class="tip">${on ? `<b>${I.zh}</b> ${I.py}<br>${I.icon} ${I.ko}${k === 'seal' ? ` (${n}/2)` : ''}<br>${I.use}` : `<b>???</b><br>아직 찾지 못한 아이템 ${I.need ? '(필수)' : '(선택)'}`}</div></div>`; }).join('');
      $('#clue-count').textContent = `${Object.keys(S.signs).length}/8`;
    }
    let o;
    if (!S.done[1]) o = '입구를 지키는 <b>병마용 문지기</b>에게 말을 걸어라. (E 키)';
    else if (!S.done[2]) { const n = Object.keys(S.case.found).length; o = S.case.started ? `사라진 <b>옥새</b>의 범인을 찾아라! 단서를 모아 <b>사건 수첩</b>(N)에서 추리하라. <span style="color:#ffd27a">(단서 ${n}/6)</span>` : '병마용의 방 가운데의 <b>텅 빈 황금 받침대</b>를 조사하라.'; }
    else if (!S.done[3]) o = '비밀 암호의 방 벽에 새겨진 <b>고대 달력</b>을 조사하라.';
    else if (!S.done[4]) o = '황제의 보물창고에서 <b>보물상자</b>를 열어라.';
    else if (S.m5step < 3) o = `미로 속 <b>병마용 3명</b>의 질문에 답하라. (${S.m5step}/3)`;
    else if (!S.emblem) o = `최종 탈출구의 <b>황제 문양판</b>에 옥새 조각 2개를 맞춰라. (💠 ${ACT.have('seal')}/2)`;
    else if (!S.codeOk) o = '최종 탈출구의 <b>암호 장치</b>에 다섯 암호를 입력하라!';
    else o = '🔑 <b>황금 열쇠</b>로 최종 탈출문의 자물쇠를 열어라!';
    if (S.items && !S.done[5] && S.done[4] && !S.items.gkey) o += '<br><small style="color:#ffcf9a">🔑 황금 열쇠도 미로 어딘가에 있다…</small>';
    if (S.items && S.done[1] && !S.items.torch) o += '<br><small style="color:#ffcf9a">🔥 어두운 통로에는 횃불이 필요하다.</small>';
    $('#objective').innerHTML = '🎯 ' + o;
    const nbOn = S.case && S.case.started && !S.done[2];
    $('#nb-btn').classList.toggle('hidden', !nbOn);
    if (nbOn) $('#nb-count').textContent = `(단서 ${Object.keys(S.case.found).length}/6)`;
    this.zone();
  },
  zone() {
    if (!ZONES[G.zone]) return; const Z = ZONES[G.zone]; $('#zone-zh').textContent = Z.zh; $('#zone-ko').textContent = Z.ko;
    if (G.state === 'play' && !this.seenZones[G.zone] && G.zone !== 7) { this.seenZones[G.zone] = 1; this.toast(`${Z.ko} <span style="color:#bca880">${Z.py}</span>`, Z.zh); }
  },
  hudTick() {
    const S = G.S; const tm = $('#timer'); const s = fmtTime(S.timeLeft);
    if (tm.textContent !== s) tm.textContent = s;
    tm.parentElement.classList.toggle('warn', S.timeLeft <= 60);
    this.minimap();
  },
  minimap() {
    const cv = $('#minimap'), x = cv.getContext('2d'), W = G.W, S = G.S, sz = 200, cs = 6;
    const pr = Player.z / T, pc = Player.x / T;
    x.clearRect(0, 0, sz, sz); x.save(); x.beginPath(); x.arc(100, 100, 99, 0, 7); x.clip();
    x.fillStyle = 'rgba(8,6,4,.85)'; x.fillRect(0, 0, sz, sz);
    const toX = c => 100 + (c - pc) * cs, toY = r => 100 + (r - pr) * cs;
    const r0 = Math.floor(pr - 18), r1 = Math.ceil(pr + 18), c0 = Math.floor(pc - 18), c1 = Math.ceil(pc + 18);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (r < 0 || c < 0 || r >= MH || c >= MW || !W.revealed[r * MW + c]) continue;
      const ch = W.at(r, c); if (ch === '#') continue;
      const d = W.doors[ch];
      if (ch === 'H' && !S.secret) continue;
      x.fillStyle = d && d.open < 0.8 ? '#a3291c' : (zoneOfCell(r, c) === 5 ? '#3d3224' : '#5a4a32');
      x.fillRect(toX(c), toY(r), cs + 0.5, cs + 0.5);
      if (ch === 'o') { x.fillStyle = '#1c150e'; x.beginPath(); x.arc(toX(c) + cs / 2, toY(r) + cs / 2, cs * 0.4, 0, 7); x.fill(); }
    }
    // 지하 지도: 미로 전체 + 안전한 길 + 황금 열쇠
    if (S.items && S.items.map && ACT.mazePath) {
      for (let r = 8; r <= 27; r++) for (let c = 3; c <= 27; c++) {
        if (r < r0 || r > r1 || c < c0 || c > c1) continue; const ch = W.at(r, c); if (ch === '#') continue;
        const onPath = ACT.mazePath.has(r * MW + c);
        if (!W.revealed[r * MW + c]) { x.fillStyle = 'rgba(120,100,70,.55)'; x.fillRect(toX(c), toY(r), cs + 0.5, cs + 0.5); }
        if (onPath) { x.fillStyle = '#7fe08a'; x.beginPath(); x.arc(toX(c) + cs / 2, toY(r) + cs / 2, 1.8, 0, 7); x.fill(); }
      }
      if (!S.items.gkey) { x.fillStyle = '#ffd24a'; x.font = 'bold 13px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🔑', toX(25.5), toY(15.5)); }
    }
    // 미션 / 출구 표시
    const marks = [];
    if (!S.done[1]) marks.push([67.2, 15.5, '1']); if (!S.done[2]) marks.push([57.5, 15.5, '2']); if (!S.done[3]) marks.push([44, 24.3, '3']);
    if (!S.done[4]) marks.push([32.5, 15.5, '4']);
    if (S.m5step < 3) { const w = W.warriors.find(w => w.kind === 'maze' && w.step === S.m5step); marks.push([w.z / T, w.x / T, '5']); }
    x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    marks.forEach(([r, c, t]) => { const X = toX(c), Y = toY(r); x.fillStyle = '#d9ae55'; x.beginPath(); x.arc(X, Y, 7, 0, 7); x.fill(); x.fillStyle = '#1a1208'; x.fillText(t, X, Y + 0.5); });
    { const X = clamp(toX(15.5), 10, 190), Y = clamp(toY(2.5), 10, 190); x.fillStyle = '#ffe9a8'; x.font = 'bold 16px sans-serif'; x.fillText('★', X, Y); }
    // 플레이어
    x.save(); x.translate(100, 100); x.rotate(-Player.facing + Math.PI);
    x.fillStyle = '#7fe0ff'; x.beginPath(); x.moveTo(0, -8); x.lineTo(5.5, 6); x.lineTo(0, 3); x.lineTo(-5.5, 6); x.closePath(); x.fill(); x.restore();
    x.restore();
    x.fillStyle = '#d9ae55'; x.font = 'bold 12px serif'; x.textAlign = 'center'; x.fillText('北', 100, 12);
  },
  // ---------- 미션 패널 ----------
  mission() {
    const Mi = G.mission, md = G.data.M[Mi.m], S = G.S;
    this.show('#mission');
    $('#m-title').innerHTML = `${md.title}`;
    $('#m-sub').innerHTML = `${md.ko} · <span style="font-family:var(--zh)">${md.speaker}</span>`;
    const total = Mi.m === 5 ? 3 : md.questions.length, cur = Mi.m === 5 ? Mi.step : S.mq[Mi.m];
    $('#m-dots').innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < cur || Mi.phase === 'success' ? 'done' : i === cur ? 'cur' : ''}"></i>`).join('');
    const body = $('#m-body'); body.innerHTML = '';
    const icon = Mi.m === 3 ? '📜' : Mi.m === 4 ? '🧰' : '🗿';
    if (Mi.phase === 'intro') {
      body.innerHTML = `<div class="speech"><div class="who">${icon}</div><div><div class="q-zh" style="text-align:left;font-size:26px">${md.intro.zh}</div>
        <div class="q-py" style="text-align:left">${md.intro.py}</div><div class="q-ko" style="text-align:left">${md.intro.ko}</div></div></div>
        <div class="m-actions"><button class="btn gold" id="m-go"><b>开始</b><small>미션 시작</small></button></div>`;
      $('#m-go').onclick = () => { Sfx.click(); Mi.phase = 'q'; this.mission(); };
      Voice.say(md.intro.zh, MISSION_ROLE[Mi.m]); return;
    }
    if (Mi.phase === 'success') {
      body.innerHTML = `<div class="success"><div class="stamp">任务成功！</div><div style="margin-top:10px;font-size:18px">미션 성공!</div>
        <div class="codebox">${Mi.code}</div>
        <div style="font-family:var(--zh);font-size:20px;color:var(--gold2)">第${numZh(S.codes.length)}个密码</div>
        <div style="color:#bca880;margin-top:4px">${S.codes.length}번째 암호를 얻었다! (+200점${S.ev.allBonus && S.codes.length === 5 ? ', 모든 미션 완료 보너스 +500점' : ''})</div>
        ${Mi.m === 2 ? this.explainHtml() : ''}
        <div class="m-actions"><button class="btn gold" id="m-done"><b>继续</b><small>계속하기</small></button></div></div>`;
      $('#m-done').onclick = () => { Sfx.click(); closeMission(); };
      return;
    }
    this.renderQuestion(body, curQuestion());
  },
  renderQuestion(body, q) {
    const Mi = G.mission, S = G.S;
    Mi.sel = null; Mi.solved = false; Mi.order = [];
    const hintLeft = S.hintsLeft < 0 ? '∞' : S.hintsLeft;
    let h = '';
    h += `<div class="q-zh">${q.zh}</div>`;
    if (q.py && !q.hidePy) h += `<div class="q-py">${q.py}</div>`;
    if (q.ko && !q.hideKo) h += `<div class="q-ko">${q.ko}</div>`;
    if (q.inst) h += `<div class="q-inst">${q.inst}</div>`;
    if (q.pic) h += q.pic;
    if (q.blank) h += `<div class="q-blank">${q.blank}</div>`;
    const voiceOk = Voice.available() && !q.hidePy;
    h += `<div class="tools"><button class="tool" id="t-voice" ${voiceOk ? '' : 'disabled'} title="${Voice.ready ? '' : '이 브라우저에서는 중국어 음성을 지원하지 않아요'}">🔊 듣기 ${Voice.ready ? '' : '(지원 안 됨)'}</button>
      <button class="tool" id="t-hint" ${S.hintsLeft === 0 ? 'disabled' : ''}>💡 힌트 (${hintLeft}) <small>-20점</small></button></div>`;
    if (q.type === 'choice') {
      h += `<div class="opts">${q.options.map((o, i) => `<button class="opt${q.latin ? ' latin' : ''}${q.korean ? ' kor' : ''}" data-i="${i}"><span class="n">${'①②③④'[i]}</span><span><span class="t">${o.zh}</span>${o.py ? `<span class="p">${o.py}</span>` : ''}</span></button>`).join('')}</div>`;
    } else if (q.type === 'order') {
      h += `<div class="order-ans" id="o-ans"></div><div class="order-pool" id="o-pool"></div>`;
    } else {
      h += `<div class="inp-row"><input class="inp" id="i-ans" placeholder="여기에 입력 (한자 또는 병음)" autocomplete="off"></div>`;
    }
    h += `<div class="feedback" id="fb"></div><div id="after"></div>
      <div class="m-actions" id="acts"><button class="btn gold" id="b-check" ${q.type === 'input' ? '' : 'disabled'}><b>确认</b><small>정답 확인</small></button></div>`;
    body.innerHTML = h;
    const role = MISSION_ROLE[Mi.m];
    $('#t-voice').onclick = () => Voice.say(q.zh, role);
    $('#t-hint').onclick = () => this.useHint(q);
    if (q.type === 'choice') {
      body.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (Mi.solved || b.disabled) return; Sfx.click();
        body.querySelectorAll('.opt').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); Mi.sel = +b.dataset.i; $('#b-check').disabled = false;
      });
      body.querySelectorAll('.opt').forEach(b => b.ondblclick = () => { if (!Mi.solved && !b.disabled) this.check(q); });
    } else if (q.type === 'order') this.renderOrder(q);
    else { const inp = $('#i-ans'); setTimeout(() => inp.focus(), 50); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.stopPropagation(); this.check(q); } }); }
    $('#b-check').onclick = () => this.check(q);
    if (voiceOk) setTimeout(() => { if (G.mission === Mi && !Mi.solved) Voice.say(q.zh, role); }, 300);
  },
  renderOrder(q) {
    const Mi = G.mission, ans = $('#o-ans'), pool = $('#o-pool');
    ans.innerHTML = Mi.order.length ? '' : '<span style="color:#7c6c52;font-size:14px;align-self:center">아래 카드를 순서대로 누르세요</span>';
    pool.innerHTML = '';
    Mi.order.forEach((ti, k) => { const b = el('button', 'tile', q.tiles[ti]); b.onclick = () => { if (Mi.solved) return; Sfx.click(); Mi.order.splice(k, 1); this.renderOrder(q); }; ans.appendChild(b); });
    q.tiles.forEach((t, i) => { if (Mi.order.includes(i)) return; const b = el('button', 'tile', t); b.onclick = () => { if (Mi.solved) return; Sfx.click(); Mi.order.push(i); this.renderOrder(q); }; pool.appendChild(b); });
    $('#b-check').disabled = Mi.order.length !== q.tiles.length;
  },
  useHint(q) {
    const S = G.S, Mi = G.mission; if (Mi.hinted || S.hintsLeft === 0) return;
    if (S.hintsLeft > 0) S.hintsLeft--; S.hints++; S.score = Math.max(0, S.score - 20); Mi.hinted = true;
    const fb = $('#fb'); fb.className = 'feedback hint'; fb.innerHTML = '💡 ' + q.hint;
    $('#t-hint').disabled = true; this.hud(); saveGame();
  },
  check(q) {
    const Mi = G.mission; if (Mi.solved) return;
    let ok = false;
    if (q.type === 'choice') { if (Mi.sel == null) return; ok = Mi.sel === q.answer; }
    else if (q.type === 'order') { if (Mi.order.length !== q.tiles.length) return; ok = Mi.order.map(i => q.tiles[i]).join('|') === q.solution.join('|'); }
    else { const v = normAns($('#i-ans').value); if (!v) return; ok = q.accept.map(normAns).includes(v); }
    const fb = $('#fb');
    if (!ok) {
      answerResult(false);
      fb.className = 'feedback bad'; fb.innerHTML = '❌ 틀렸어요! 다시 도전해 보세요.' + (Mi.hinted || G.S.hintsLeft === 0 ? '' : ' <span style="color:#ffe7a8">💡 힌트를 사용해 볼까요?</span>');
      if (q.type === 'choice') { const b = $(`.opt[data-i="${Mi.sel}"]`); b.classList.remove('sel'); b.classList.add('bad'); b.disabled = true; Mi.sel = null; $('#b-check').disabled = true; }
      else if (q.type === 'order') { const a = $('#o-ans'); a.classList.add('bad'); setTimeout(() => { a.classList.remove('bad'); Mi.order = []; this.renderOrder(q); }, 450); }
      else { const i = $('#i-ans'); i.classList.remove('bad'); void i.offsetWidth; i.classList.add('bad'); i.select(); }
      this.hud(); return;
    }
    Mi.solved = true; answerResult(true);
    if (q.type === 'choice') { $(`.opt[data-i="${Mi.sel}"]`).classList.add('ok'); document.querySelectorAll('.opt').forEach(b => b.disabled = true); }
    else if (q.type === 'order') $('#o-ans').classList.add('ok'); else { $('#i-ans').classList.add('ok'); $('#i-ans').disabled = true; }
    fb.className = 'feedback'; fb.innerHTML = '';
    $('#after').innerHTML = `<div class="after">✅ <b>正确！ 정답!</b><div class="a-zh">${q.after.zh}</div><div class="a-py">${q.after.py}</div><div class="a-ko">${q.after.ko}</div>
      <div class="pts">+${Mi.lastPts}점${Mi.lastPts > 100 ? ' (첫 시도 보너스 +50)' : ''}</div></div>`;
    $('#acts').innerHTML = `<button class="tool" id="a-voice" ${Voice.available() ? '' : 'disabled'}>🔊 다시 듣기</button><button class="btn gold" id="b-next"><b>下一个</b><small>다음 ▶</small></button>`;
    $('#a-voice').onclick = () => Voice.say(q.after.zh, 'clear');
    $('#b-next').onclick = () => { Sfx.click(); nextQuestion(); };
    $('#t-hint').disabled = true;
    this.hud();
  },
  missionKey(e) {
    if (!$('#codepanel').classList.contains('hidden')) {
      if (/^Digit\d$|^Numpad\d$/.test(e.code)) this.codeKey(e.code.slice(-1));
      if (e.code === 'Backspace') this.codeKey('⌫'); if (e.code === 'Enter' || e.code === 'NumpadEnter') submitCode(); return;
    }
    const Mi = G.mission; if (!Mi || G.overlay || !G.mission_active()) return;
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      const nb = $('#b-next') || $('#m-go') || $('#m-done'); if (nb) { nb.click(); return; }
      const cb = $('#b-check'); if (cb && !cb.disabled) cb.click(); return;
    }
    const m = /^Digit([1-4])$/.exec(e.code);
    if (m) { const b = $(`.opt[data-i="${+m[1] - 1}"]`); if (b && !b.disabled) b.click(); }
  },
  // ---------- 암호 패널 ----------
  codePanel() { this.show('#codepanel'); $('#code-msg').innerHTML = ''; this.codeSlots(); },
  codeSlots() { $('#code-slots').innerHTML = [0, 1, 2, 3, 4].map(i => `<div class="${i === G.codeEntry.length ? 'cur' : ''}">${G.codeEntry[i] || ''}</div>`).join(''); },
  codeKey(k) {
    if (k === '⌫') G.codeEntry = G.codeEntry.slice(0, -1); else if (G.codeEntry.length < 5) G.codeEntry += k;
    $('#code-msg').innerHTML = ''; this.codeSlots();
  },
  codeMsg(html, bad) { $('#code-msg').innerHTML = html; if (bad) { const s = $('#code-slots'); s.classList.remove('bad'); void s.offsetWidth; s.classList.add('bad'); } },
  // ---------- 일시정지 / 모달 ----------
  modal(html, onClose) { $('#modal-body').innerHTML = html; this.show('#modal'); this.onModalClose = onClose || null; },
  closeModal() { this.hide('#modal'); const f = this.onModalClose; this.onModalClose = null; if (f) f(); },
  pause() {
    if (G.state !== 'play') return; G.state = 'paused'; saveGame();
    this.modal(`<h2>暂停 <small>일시정지</small></h2><div class="menu" style="max-width:none">
      <button class="btn gold" id="p-resume"><b>继续游戏</b><small>계속하기</small></button>
      <button class="btn" id="p-help"><b>游戏说明</b><small>게임 설명</small></button>
      <button class="btn" id="p-sound"><b>音效设置</b><small>사운드 · 그래픽 설정</small></button>
      <button class="btn" id="p-restart"><b>重新开始</b><small>처음부터 다시 시작</small></button>
      <button class="btn" id="p-home"><b>返回首页</b><small>처음 화면으로 (진행 저장)</small></button></div>
      <p style="margin-top:14px;font-size:13px;color:#a8946c">일시정지 중에는 시간이 멈춥니다. 진행 상황은 자동 저장돼요.</p>`, () => this.resume());
    $('#p-resume').onclick = () => this.closeModal();
    $('#p-help').onclick = () => { this.onModalClose = null; this.helpModal(() => { G.state = 'play'; this.pause(); }); };
    $('#p-sound').onclick = () => { this.onModalClose = null; this.soundModal(() => { G.state = 'play'; this.pause(); }); };
    $('#p-restart').onclick = () => { this.onModalClose = null; this.hide('#modal'); this.confirmBox('처음부터 다시 시작할까요? 지금까지의 진행은 사라집니다.', () => { startPlay(newState(G.S.name, G.S.diff), false); }, () => { G.state = 'play'; this.pause(); }); };
    $('#p-home').onclick = () => { this.onModalClose = null; this.hide('#modal'); this.goHome(); };
  },
  resume() { if (G.state === 'paused') { this.hide('#modal'); G.state = 'play'; G.last = performance.now() / 1000; } },
  confirmBox(msg, yes, no) {
    this.modal(`<h2>确认 <small>확인</small></h2><p>${msg}</p><div class="row-btns"><button class="btn" id="c-no"><b>不</b><small>아니요</small></button><button class="btn gold" id="c-yes"><b>好</b><small>네</small></button></div>`, no);
    $('#c-yes').onclick = () => { this.onModalClose = null; this.hide('#modal'); yes(); };
    $('#c-no').onclick = () => this.closeModal();
  },
  goHome() {
    if (G.S && G.S.status === 'playing' && G.state !== 'end') saveGame();
    this.hideScreens(); this.hide('#hud'); this.fade(false); G.state = 'title'; this.show('#scr-title');
    speechSynthesis && speechSynthesis.cancel && speechSynthesis.cancel();
  },
  helpModal(onClose) {
    this.modal(`<h2>游戏说明 <small>게임 설명</small></h2>
      <p>너는 진시황릉 지하 무덤에 갇힌 <b>탐험가</b>다. 다섯 구역의 <b>중국어 미션</b>을 해결하고 <b>암호 5개</b>를 모아 마지막 석문을 열어라!</p>
      <h3>🎮 조작 방법</h3>
      <table><tr><th>키</th><th>기능</th><th>키</th><th>기능</th></tr>
      <tr><td><kbd>W</kbd></td><td>앞으로</td><td><kbd>Shift</kbd></td><td>달리기</td></tr>
      <tr><td><kbd>S</kbd></td><td>뒤로</td><td><kbd>Space</kbd></td><td>점프</td></tr>
      <tr><td><kbd>A</kbd> / <kbd>D</kbd></td><td>왼쪽 / 오른쪽</td><td><kbd>E</kbd></td><td>조사 · 대화</td></tr>
      <tr><td>마우스 드래그</td><td>카메라 회전</td><td><kbd>ESC</kbd></td><td>일시정지 / 창 닫기</td></tr></table>
      <h3>🗺️ 탐험 순서</h3>
      <ul><li>① 지하 무덤 입구 — 인사와 자기소개</li><li>② 병마용의 방 — <b>사라진 황제의 옥새</b>: 단서 6개를 찾아 범인을 추리 (사건 수첩 <kbd>N</kbd>)</li><li>③ 비밀 암호의 방 — 날짜와 생일</li><li>④ 황제의 보물창고 — 날씨 · 가격 · 음식</li><li>⑤ 마지막 미로 — 종합 복습 (병마용 3명)</li><li>⑥ 최종 탈출구 — 옥새 조각 2개로 문양판 완성 → 암호 5개 입력 → 황금 열쇠로 탈출!</li></ul>
      <h3>🎒 아이템 · ❤️ 생명력</h3>
      <ul><li>반짝이는 고리 위의 아이템에 다가가 <kbd>E</kbd>로 줍습니다. [필수] 아이템이 없으면 앞으로 나아갈 수 없어요.</li>
      <li>함정(화살 · 무너지는 바닥 · 굴러오는 돌 · 순찰 병마용)에 당하면 ❤️가 1개 줄고, 모두 잃으면 그 구역의 체크포인트에서 다시 시작합니다.</li>
      <li>곳곳의 <b>중국어 비석</b>에 함정을 피하는 방법과 아이템 위치가 적혀 있어요. 꼭 읽고 해석하세요!</li></ul>
      <h3>⭐ 점수</h3>
      <ul><li>정답 +100점 · 첫 시도 정답 +50점 · 힌트 사용 −20점</li><li>미션 완료 +200점 · 모든 미션 완료 보너스 +500점</li></ul>
      <h3>💡 팁</h3>
      <ul><li>미션 창에서 숫자 키 1~4로 보기 선택, Enter로 정답 확인을 할 수 있어요.</li><li>오른쪽 아래 미니맵의 금색 숫자가 다음 미션 위치, ★이 출구예요.</li><li>틀려도 괜찮아요! 다시 도전할 수 있어요. 보물창고 어딘가에는 숨겨진 방도 있다는데…?</li></ul>`, onClose);
  },
  soundModal(onClose) {
    const s = Sfx.settings;
    const tg = (k, label, dis) => `<div class="setrow"><span>${label}</span><button class="toggle${s[k] ? ' on' : ''}" data-k="${k}" ${dis ? 'disabled' : ''}></button></div>`;
    this.modal(`<h2>音效设置 <small>사운드 · 그래픽 설정</small></h2>
      ${tg('sound', '🔊 전체 소리')}${tg('ambience', '🌬️ 배경 소리 (바람 · 북소리)')}
      ${tg('voice', '🗣️ 중국어 음성 읽기' + (Voice.ready ? '' : ' <small style="color:#ff8a6a">(이 브라우저는 중국어 음성 미지원 — 텍스트로 제공)</small>'), !Voice.ready)}
      <div class="setrow"><span>🎭 목소리 톤</span><span class="vstyle"><button class="tool${s.voiceStyle !== 'clear' ? ' on' : ''}" data-vs="tomb">🗿 무덤 분위기</button><button class="tool${s.voiceStyle === 'clear' ? ' on' : ''}" data-vs="clear">📖 또렷한 발음</button></span></div>
      <div class="vnote">무덤 분위기: 병마용은 낮고 느린 남자 목소리, 고대 달력·보물상자는 신비로운 목소리로 말합니다. 정답 문장은 항상 또렷한 발음으로 들려줘요.</div>
      <div class="setrow"><span>🎚️ 음량</span><input type="range" min="0" max="1" step="0.05" value="${s.volume}" id="vol"></div>
      ${tg('lowGfx', '🖥️ 저사양 모드 (느린 컴퓨터용)')}
      <div class="row-btns"><button class="tool" id="test-snd">효과음 테스트</button><button class="tool" id="test-voice" ${Voice.ready ? '' : 'disabled'}>음성 테스트 “站住！”</button></div>`, onClose);
    document.querySelectorAll('[data-vs]').forEach(b => b.onclick = () => { s.voiceStyle = b.dataset.vs; Sfx.save(); document.querySelectorAll('[data-vs]').forEach(x => x.classList.toggle('on', x === b)); Voice.say('站住！你是谁？', 'warrior'); });
    document.querySelectorAll('#modal .toggle').forEach(b => b.onclick = () => { const k = b.dataset.k; s[k] = !s[k]; b.classList.toggle('on', s[k]); Sfx.init(); Sfx.save(); if (k === 'lowGfx') applyGfx(); });
    $('#vol').oninput = e => { s.volume = +e.target.value; Sfx.init(); Sfx.save(); };
    $('#test-snd').onclick = () => { Sfx.init(); Sfx.correct(); };
    $('#test-voice').onclick = () => { Sfx.init(); Voice.say('站住！你是谁？', 'warrior'); };
  },
  recordsModal() {
    const recs = store.get(REC_KEY, []);
    const rows = recs.map((r, i) => `<tr><td>${r.date}</td><td>${r.name}</td><td>${DIFF[r.diff] ? DIFF[r.diff].label.split(' · ')[1] : ''}</td><td>${r.result === 'escaped' ? '🏆 탈출' : '💀 실패'}</td>
      <td>${r.score}</td><td>${r.result === 'escaped' ? r.grade : '-'}</td><td>${r.correct}/${r.wrong}</td><td>${fmtTime(r.time)}</td><td><button class="tool" data-ri="${i}">보기</button></td></tr>`).join('');
    this.modal(`<h2>学习记录 <small>학습 기록 (이 컴퓨터에만 저장)</small></h2>
      ${recs.length ? `<table><tr><th>날짜</th><th>이름</th><th>난이도</th><th>결과</th><th>점수</th><th>등급</th><th>정답/오답</th><th>시간</th><th></th></tr>${rows}</table>
      <div class="row-btns"><button class="tool" id="rec-clear">🗑️ 기록 모두 지우기</button></div>` : '<p>아직 기록이 없어요. 첫 탐험을 시작해 보세요!</p>'}`);
    document.querySelectorAll('[data-ri]').forEach(b => b.onclick = () => this.detailModal(recs[+b.dataset.ri], () => this.recordsModal()));
    const c = $('#rec-clear'); if (c) c.onclick = () => this.confirmBox('이 컴퓨터에 저장된 학습 기록을 모두 지울까요?', () => { store.del(REC_KEY); this.recordsModal(); }, () => this.recordsModal());
  },
  detailModal(r, onClose) {
    const ms = ['', '인사와 자기소개', '사라진 옥새 (추리)', '날짜와 생일', '날씨·가격·음식', '종합 복습'];
    this.modal(`<h2>查看成绩 <small>${r.name}의 결과</small></h2>
      <p>${r.date} · 점수 <b>${r.score}</b> · 정답 ${r.correct} · 오답 ${r.wrong} · 힌트 ${r.hints}회 · 완료 미션 ${r.missions}/5</p>
      <table><tr><th>미션</th><th>문제</th><th>결과</th></tr>${(r.log || []).map(l => `<tr><td>${l.m}. ${ms[l.m]}</td><td style="font-family:var(--zh)">${l.zh}</td><td>${l.ok1 ? '⭕ 한 번에 정답' : '🔺 다시 도전해서 정답'}${l.hint ? ' · 💡힌트' : ''}</td></tr>`).join('')}</table>
      <p style="margin-top:10px;font-size:13px;color:#a8946c">🔺 표시 문제는 교과서에서 한 번 더 복습해 보세요!</p>`, onClose);
  },
  // ---------- 인트로 ----------
  introLines: [
    ['两千多年前……', 'Liǎngqiān duō nián qián……', '2천여 년 전……'],
    ['秦始皇统一了中国。', 'Qín Shǐhuáng tǒngyī le Zhōngguó.', '진시황은 중국을 통일했다.'],
    ['这里是秦始皇陵。', 'Zhèlǐ shì Qín Shǐhuáng líng.', '이곳은 진시황릉이다.'],
    ['你是一名探险家。', 'Nǐ shì yì míng tànxiǎnjiā.', '너는 탐험가다.'],
    ['但是，你被困在这里了！', 'Dànshì, nǐ bèi kùn zài zhèlǐ le!', '그런데 너는 이곳에 갇혀 버렸다!'],
    ['只有完成五个任务，找到五个密码，才能逃出去！', 'Zhǐyǒu wánchéng wǔ gè rènwu, zhǎodào wǔ gè mìmǎ, cái néng táo chūqu!', '다섯 개의 임무를 완수하고 다섯 개의 암호를 찾아야만 탈출할 수 있다!'],
    ['准备好了吗？', 'Zhǔnbèi hǎo le ma?', '준비됐니?'],
  ],
  intro() {
    this.hideScreens(); this.show('#scr-intro'); this.hide('#btn-escape-start'); $('#intro-sub').innerHTML = ''; this.introIdx = -1;
    const f = $('#fade'); f.style.transition = 'none'; f.classList.remove('white'); f.style.opacity = 1; void f.offsetWidth; f.style.transition = 'opacity 4s'; f.style.opacity = 0;
    setTimeout(() => f.style.transition = '', 4200);
    Sfx.init(); Sfx.startAmbience(); Sfx.drum(0.2); Sfx.drum(1.0);
  },
  introTick() {
    const t = G.introT, idx = Math.floor((t - 1.8) / 3.6);
    if (idx !== this.introIdx && idx >= 0 && idx < this.introLines.length) {
      this.introIdx = idx; const [zh, py, ko] = this.introLines[idx]; const s = $('#intro-sub');
      s.style.opacity = 0;
      setTimeout(() => { s.innerHTML = `<div class="zh">${zh}</div><div class="py">${py}</div><div class="ko">${ko}</div>`; s.style.opacity = 1; Voice.say(zh, 'narrator'); }, 350);
      if (idx % 2 === 0) Sfx.drum(0, 0.8);
      if (idx === this.introLines.length - 1) setTimeout(() => this.show('#btn-escape-start'), 1200);
    }
  },
  invFlash(k) { setTimeout(() => { const e = document.querySelector(`.inv[data-k="${k}"]`); if (e) e.classList.add('flash'); }, 50); },
  // ---------- 중국어 단서 비석 ----------
  signDoc(id) {
    const S = G.S, first = !S.signs[id];
    if (first) { S.signs[id] = true; S.score += 10; Sfx.codeGet(); }
    const lines = signLines(id), free = S.diff === 'easy' || S.signKo[id];
    this.doc(`<div class="d-title">📜 ${SIGN_TITLE[id].split(' · ')[0]}</div><div class="d-sub">${SIGN_TITLE[id].split(' · ')[1]}</div>
      ${lines.map(l => `<div class="d-line"><div class="d-zh">${l.zh}</div><div class="d-py">${l.py}</div><div class="d-ko${free ? '' : ' hid'}">${l.ko}</div></div>`).join('')}
      ${free ? '' : `<div class="d-note">중국어를 직접 해석해 보세요! 한국어 뜻은 가려져 있습니다.</div><div class="m-actions ko-reveal"><button class="tool" id="d-reveal" ${S.hintsLeft === 0 ? 'disabled' : ''}>🔍 한국어 뜻 보기 (힌트 1회 · -20점)</button></div>`}
      <div class="d-saved">${first ? '📜 중국어 단서 목록에 기록했습니다! (+10점)' : ''}</div>
      <div class="m-actions"><button class="tool" id="d-voice" ${Voice.available() ? '' : 'disabled'}>🔊 듣기</button><button class="btn gold" data-act="doc-close"><b>关闭</b><small>닫기</small></button></div>`, lines.map(l => l.zh).join(''));
    const rv = $('#d-reveal'); if (rv) rv.onclick = () => { if (S.hintsLeft === 0) return; if (S.hintsLeft > 0) S.hintsLeft--; S.hints++; S.score = Math.max(0, S.score - 20); S.signKo[id] = true;
      document.querySelectorAll('#doc .d-ko').forEach(e => e.classList.remove('hid')); rv.parentElement.remove(); this.hud(); saveGame(); };
    $('#doc-body').querySelectorAll('.d-ko.hid').forEach(e => { e.onclick = null; e.title = '위의 버튼으로 뜻을 볼 수 있어요'; });
    this.hud(); saveGame();
  },
  clueLog() {
    const S = G.S, ids = Object.keys(G.W.signs);
    this.doc(`<div class="d-title">📜 线索</div><div class="d-sub">지금까지 읽은 중국어 단서 (${Object.keys(S.signs).length}/8)</div>
      ${ids.map(id => S.signs[id] ? `<div class="d-line" style="text-align:left"><b style="color:#6b1f12">${SIGN_TITLE[id]}</b>${signLines(id).map(l => `<div><span class="d-zh" style="font-size:20px">${l.zh}</span> <span class="d-py" style="font-size:14px">${l.py}</span>${S.diff === 'easy' || S.signKo[id] ? ` <span class="d-ko" style="font-size:14px">— ${l.ko}</span>` : ''}</div>`).join('')}</div>`
        : `<div class="d-line" style="color:#8c7a5a">❓ 아직 발견하지 못한 단서</div>`).join('')}
      <div class="m-actions"><button class="btn gold" data-act="doc-close"><b>关闭</b><small>닫기</small></button></div>`, '');
  },
  // ---------- MISSION 2: 단서 문서 / 사건 수첩 ----------
  openOverlay(id, kind) { this.show(id); G.overlay = kind; if (G.state === 'play') G.state = 'mission'; this.prompt(null); },
  closeOverlay() {
    const k = G.overlay; if (!k) return;
    this.hide(k === 'notebook' ? '#notebook' : '#doc'); G.overlay = null;
    if (G.state === 'mission' && !G.mission_active()) G.state = 'play';
    speechSynthesis && speechSynthesis.cancel && speechSynthesis.cancel(); this.hud(); saveGame();
  },
  pulseNotebook() { const b = $('#nb-btn'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); },
  lineHtml(l, hideKo) { return `<div class="d-line"><div class="d-zh">${l.zh}</div><div class="d-py">${l.py}</div><div class="d-ko${hideKo ? ' hid' : ''}" title="${hideKo ? '눌러서 한국어 뜻 보기' : ''}">${l.ko}</div></div>`; },
  doc(html, speak) {
    $('#doc-body').innerHTML = html; this.openOverlay('#doc', 'doc');
    $('#doc-body').querySelectorAll('.d-ko.hid').forEach(e => e.onclick = () => e.classList.remove('hid'));
    const v = $('#d-voice'); if (v) v.onclick = () => Voice.say(speak, 'narrator');
    const nb = $('#d-nb'); if (nb) nb.onclick = () => { Sfx.click(); this.hide('#doc'); G.overlay = null; this.notebook(); };
    if (speak) setTimeout(() => Voice.say(speak, 'narrator'), 300);
  },
  caseIntro() {
    const sus = CASE.suspects.map(s => `<span style="display:inline-block;margin:4px 8px;text-align:center"><span style="font-size:30px">${s.icon}</span><br><b style="font-family:var(--zh);font-size:20px">${s.zh}</b><br><small>${s.py} · ${s.ko}</small></span>`).join('');
    this.doc(`<div class="d-title">事件发生！</div><div class="d-sub">사건 발생 — 사라진 황제의 옥새</div>
      ${this.lineHtml({ zh: '玉玺不见了！', py: 'Yùxǐ bú jiàn le!', ko: '옥새가 사라졌다!' })}
      <p style="line-height:1.7;margin:8px 0">황금 받침대 위에 놓여 있던 <b>진시황의 옥새(玉玺)</b>가 사라졌다! 이 방을 지키던 네 명의 병마용이 용의자로 지목되었다.</p>
      <div style="text-align:center;margin:6px 0">${sus}</div>
      <p style="line-height:1.7;margin:8px 0">🔎 병마용의 방 곳곳에 흩어진 <b>단서 6개</b>(반짝이는 곳)를 찾아 <kbd>E</kbd>로 조사하라. 단서는 <b>사건 수첩</b>(<kbd>N</kbd>)에 자동으로 기록된다.<br>
      🕰️ 시간표를 정리하고, 범인과 그 <b>이유</b>를 함께 지목해야 옥새를 되찾을 수 있다.</p>
      <div class="m-actions"><button class="tool" id="d-nb">📒 사건 수첩 열기</button><button class="btn gold" data-act="doc-close"><b>开始调查</b><small>조사 시작</small></button></div>`, '玉玺不见了！');
    this.pulseNotebook();
  },
  clueDoc(id, first) {
    const c = CASE.clues[id], hard = G.S.diff === 'hard';
    this.doc(`<div class="d-title">${c.icon} ${c.title}</div><div class="d-sub">${c.ko}</div>
      ${c.lines.map(l => this.lineHtml(l, hard)).join('')}
      ${c.note ? `<div class="d-note">${c.note}</div>` : ''}
      ${hard ? '<div class="d-note">💡 어려움 모드: 흐린 한국어 뜻을 누르면 볼 수 있어요.</div>' : ''}
      <div class="d-saved">${first ? '📒 사건 수첩에 기록했습니다!' : '📒 이미 사건 수첩에 기록된 단서입니다.'}</div>
      <div class="m-actions"><button class="tool" id="d-voice" ${Voice.available() ? '' : 'disabled'}>🔊 듣기</button><button class="tool" id="d-nb">📒 사건 수첩</button><button class="btn gold" data-act="doc-close"><b>关闭</b><small>닫기</small></button></div>`,
      c.lines.map(l => l.zh).join(''));
  },
  suspectTalk(sd) {
    this.doc(`<div class="d-title">${sd.icon} ${sd.zh}</div><div class="d-sub">${sd.py} · 용의자 ${sd.ko}</div>${this.lineHtml(sd.say)}
      <div class="d-note">병마용은 그 이상 말하지 않는다… 행동 기록을 찾아야 한다.</div>
      <div class="m-actions"><button class="tool" id="d-voice" ${Voice.available() ? '' : 'disabled'}>🔊 듣기</button><button class="btn gold" data-act="doc-close"><b>关闭</b><small>닫기</small></button></div>`, '');
    Voice.say(sd.say.zh, sd.id === 'gen' ? 'general' : 'warrior');
    $('#d-voice').onclick = () => Voice.say(sd.say.zh, sd.id === 'gen' ? 'general' : 'warrior');
  },
  notebook(tab) {
    if (!G.S.case.started) return;
    this.nbTab = tab || this.nbTab || 'case';
    this.openOverlay('#notebook', 'notebook');
    document.querySelectorAll('.nb-tabs button').forEach(b => b.onclick = () => { Sfx.click(); this.nbTab = b.dataset.tab; this.renderNotebook(); });
    this.renderNotebook();
  },
  renderNotebook() {
    const C = G.S.case, body = $('#nb-body'), n = Object.keys(C.found).length;
    document.querySelectorAll('.nb-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === this.nbTab));
    $('#nb-clues').innerHTML = `발견한 단서 <b style="color:#ffd27a">${n}</b> / 6`;
    const susName = id => { const s = CASE.suspects.find(x => x.id === id); return `${s.zh}`; };
    if (this.nbTab === 'case') {
      body.innerHTML = `<h3>📜 사건 개요</h3>
        <p><b>무엇이?</b> 황금 받침대 위의 <span style="font-family:var(--zh)">玉玺</span>(yùxǐ, 옥새)가 사라졌다.</p>
        <p><b>언제?</b> ${C.found.incident ? `<span style="font-family:var(--zh);font-size:18px">下午两点</span> (xiàwǔ liǎng diǎn) — 바닥의 사건 기록에서 확인함` : '<span style="color:#7c6c52">??? — 바닥에 떨어진 사건 기록을 찾아보세요.</span>'}</p>
        <p><b>어디서?</b> <span style="font-family:var(--zh)">房间</span>(fángjiān) — 옥새가 놓여 있던 이 방</p>
        <p><b>누가?</b> 용의자 4명: ${CASE.suspects.map(s => `<span style="font-family:var(--zh)">${s.zh}</span>(${s.ko})`).join(', ')}</p>
        <h3>🪨 무덤의 규칙</h3>
        <p>${C.found.rule ? `<span style="font-family:var(--zh);font-size:18px">两个人以上在房间里的时候，谁也不能拿玉玺。</span><br><small>두 명 이상 방에 있을 때는 누구도 옥새를 가져갈 수 없다.</small>` : '<span style="color:#7c6c52">??? — 규칙이 새겨진 비석이 어딘가에 있다.</span>'}</p>
        <h3>🎯 해야 할 일</h3>
        <p>① 단서 찾기 (${n}/6) → ② <b>时间表</b>에 각 인물의 위치 정리 → ③ <b>推理结果</b>에서 범인과 이유 지목</p>`;
    } else if (this.nbTab === 'sus') {
      body.innerHTML = `<div class="sus-grid">${CASE.suspects.map(s => `<div class="sus"><div class="ic">${s.icon}</div><div class="zh">${s.zh}</div><div class="py">${s.py}</div><div>${s.ko}</div>
        <div class="st${C.found[s.id] ? '' : ' no'}">${C.found[s.id] ? '✔ 행동 기록 발견' : '✖ 행동 기록 없음'}</div></div>`).join('')}</div>
        <p style="margin-top:12px;font-size:14px;color:#bca880">용의자에게 다가가 <kbd>E</kbd>를 누르면 말을 걸 수 있어요. 하지만 진실은 행동 기록 속에 있습니다.</p>`;
    } else if (this.nbTab === 'clues') {
      body.innerHTML = CASE.clueOrder.map(id => { const c = CASE.clues[id];
        if (!C.found[id]) return `<div class="clue-card locked"><div class="ct">❓ ??? <small>아직 발견하지 못한 단서</small></div></div>`;
        return `<div class="clue-card"><div class="ct">${c.icon} ${c.title}<small>${c.ko}</small></div>${c.lines.map(l => `<div class="cl"><div class="cz">${l.zh}</div><div class="cp">${l.py}</div><div class="ck">${l.ko}</div></div>`).join('')}</div>`; }).join('');
    } else if (this.nbTab === 'time') this.renderTimeline(body);
    else this.renderSolve(body);
  },
  renderTimeline(body) {
    const C = G.S.case, P = CASE.places;
    const chip = p => `<span class="chip p-${p.k}${this.tlSel === p.k ? ' sel' : ''}" draggable="true" data-p="${p.k}"><b>${p.zh}</b>${p.ko}</span>`;
    const cell = (sid, tm) => {
      const lock = !C.found[sid], v = (C.tl[sid] || {})[tm.k], p = P.find(x => x.k === v);
      return `<td><div class="cell${tm.crime ? ' crime' : ''}${lock ? ' locked' : ''}" data-s="${sid}" data-t="${tm.k}">${lock ? '🔒 기록 없음' : p ? `<span class="pz p-${p.k}">${p.zh}</span>${p.ko}` : '·'}</div></td>`;
    };
    const inRoom = CASE.suspects.filter(s => (C.tl[s.id] || {}).t200 === 'room');
    body.innerHTML = `<div class="palette"><span style="color:#bca880;font-size:13px">장소 카드를 <b>끌어다 놓거나</b>, 카드를 누른 뒤 칸을 누르세요. (오른쪽 클릭 = 지우기)</span></div>
      <div class="palette">${P.map(chip).join('')}</div>
      <table class="tt"><tr><th></th>${CASE.times.map(t => `<th class="${t.crime ? 'crime' : ''}"><b>${t.zh}</b>${t.ko}${t.crime ? ' ⚠ 사건' : ''}</th>`).join('')}</tr>
      ${CASE.suspects.map(s => `<tr><td class="who">${s.icon} ${s.zh}<small>${s.ko}</small></td>${CASE.times.map(t => cell(s.id, t)).join('')}</tr>`).join('')}</table>
      <div class="tt-sum">🕑 내가 정리한 시간표에서 <b style="font-family:var(--zh)">下午两点</b>(오후 2시)에 <b style="font-family:var(--zh)">房间</b>(방)에 있던 인물:
        <b style="color:#ffd27a">${inRoom.length ? inRoom.map(s => s.zh + '(' + s.ko + ')').join(', ') + ` — ${inRoom.length}명` : '아직 없음'}</b></div>`;
    body.querySelectorAll('.chip').forEach(c => {
      c.onclick = () => { Sfx.click(); this.tlSel = this.tlSel === c.dataset.p ? null : c.dataset.p; this.renderTimeline(body); };
      c.ondragstart = e => { e.dataTransfer.setData('text/plain', c.dataset.p); e.dataTransfer.effectAllowed = 'copy'; };
    });
    const setCell = (s, t, v) => { C.tl[s] = C.tl[s] || {}; if (v) C.tl[s][t] = v; else delete C.tl[s][t]; Sfx.click(); saveGame(); this.renderTimeline(body); };
    body.querySelectorAll('.cell').forEach(el2 => {
      if (el2.classList.contains('locked')) { el2.onclick = () => this.toast('이 인물의 행동 기록을 먼저 찾아야 해요.'); return; }
      const s = el2.dataset.s, t = el2.dataset.t;
      el2.onclick = () => {
        const cur = (C.tl[s] || {})[t];
        if (this.tlSel) setCell(s, t, cur === this.tlSel ? null : this.tlSel);
        else { const ks = CASE.places.map(p => p.k); const i = ks.indexOf(cur); setCell(s, t, i === ks.length - 1 ? null : ks[i + 1]); }
      };
      el2.oncontextmenu = e => { e.preventDefault(); setCell(s, t, null); };
      el2.ondragover = e => { e.preventDefault(); el2.classList.add('over'); };
      el2.ondragleave = () => el2.classList.remove('over');
      el2.ondrop = e => { e.preventDefault(); const v = e.dataTransfer.getData('text/plain'); if (v) setCell(s, t, v); };
    });
  },
  renderSolve(body) {
    const C = G.S.case, n = Object.keys(C.found).length, S = G.S;
    const hintBtn = C.hints < 3 ? `<button class="tool" id="cs-hint" ${S.hintsLeft === 0 ? 'disabled' : ''}>💡 힌트 ${C.hints + 1}단계 보기 (-20점 · 남은 힌트 ${S.hintsLeft < 0 ? '∞' : S.hintsLeft})</button>` : '';
    body.innerHTML = `${n < 6 ? `<div class="hint-box" style="color:#ffcf9a">⚠ 아직 단서를 ${n}/6개만 찾았어요. 지금도 추리할 수 있지만, 정보가 부족하면 판단이 어려울 수 있어요.</div>` : ''}
      <div class="solve-step">💡 단계별 힌트</div>${CASE.hints.slice(0, C.hints).map((h, i) => `<div class="hint-box">힌트 ${i + 1}. ${h}</div>`).join('')}<div class="hint-row">${hintBtn}</div>
      <div class="solve-step">① 범인은 누구일까? <span style="font-family:var(--zh)">谁拿了玉玺？</span> <small style="font-weight:400;color:#bca880">Shéi ná le yùxǐ?</small></div>
      <div class="pick-grid">${CASE.suspects.map(s => `<button class="pick${C.pick === s.id ? ' sel' : ''}" data-id="${s.id}"><span style="font-size:26px">${s.icon}</span><span class="zh">${s.zh}</span><small>${s.ko}</small></button>`).join('')}</div>
      <div class="solve-step">② 그렇게 생각한 이유는? <span style="font-family:var(--zh)">为什么？</span></div>
      <div class="reasons">${makeRng(S.seed + 7).shuffle(CASE.reasons).map(r => `<button class="reason${C.reason === r.id ? ' sel' : ''}" data-id="${r.id}"><span class="zh">${r.zh}</span><span class="py">${r.py}</span><span class="ko">${r.ko}</span></button>`).join('')}</div>
      <div class="m-actions"><button class="btn gold" id="cs-go" ${C.pick && C.reason ? '' : 'disabled'}><b>推理！</b><small>범인 지목하기</small></button></div>
      <div id="cs-verdict"></div>`;
    body.querySelectorAll('.pick').forEach(b => b.onclick = () => { Sfx.click(); C.pick = b.dataset.id; saveGame(); this.renderSolve(body); });
    body.querySelectorAll('.reason').forEach(b => b.onclick = () => { Sfx.click(); C.reason = b.dataset.id; saveGame(); this.renderSolve(body); });
    const hb = $('#cs-hint'); if (hb) hb.onclick = () => {
      if (S.hintsLeft === 0) return; if (S.hintsLeft > 0) S.hintsLeft--; S.hints++; S.score = Math.max(0, S.score - 20); C.hints++; saveGame(); this.hud(); this.renderSolve(body);
    };
    $('#cs-go').onclick = () => {
      const ok = submitDeduction(); const v = $('#cs-verdict');
      if (ok) { v.className = 'verdict'; v.innerHTML = '<div class="stamp" style="font:900 34px var(--zh);color:#5ccf7a">推理正确！</div>'; $('#cs-go').disabled = true; }
      else { v.className = 'verdict bad'; v.innerHTML = `<b style="font-family:var(--zh);font-size:20px">推理错误！</b><br>추리가 맞지 않아요. <b>범인과 이유가 모두</b> 맞아야 합니다.<br>단서와 시간표를 다시 확인하고 재도전하세요. (시도 ${C.attempts}회)`; }
    };
  },
  explainHtml() {
    const T0 = teacherCase(); if (!T0) return '';
    return `<div class="explain"><b>🔍 사건 해설</b><br>${T0.e.replace(/→/g, '→').split('. ').join('.<br>')}</div>`;
  },
  // ---------- 결과 ----------
  end(win, r) {
    const S = G.S; this.hideScreens(); this.show('#scr-end');
    setTimeout(() => this.fade(false), 300);
    const gl = { S: '완벽한 탐험가', A: '뛰어난 탐험가', B: '훌륭한 도전자', C: '다시 도전해 보세요!' };
    const stats = `<div class="stats"><div>⏱️ 총 플레이 시간 <b>${fmtTime(r.time)}</b></div><div>⭐ 획득 점수 <b>${r.score}</b></div>
      <div>⭕ 정답 개수 <b>${r.correct}</b></div><div>❌ 오답 개수 <b>${r.wrong}</b></div><div>💡 힌트 사용 <b>${r.hints}회</b></div><div>🗝️ 완료한 미션 <b>${r.missions} / 5</b></div>
      <div>🎒 모은 아이템 <b>${r.items != null ? r.items : '-'} / 6</b></div><div>💀 쓰러진 횟수 <b>${r.deaths || 0}회</b></div></div>`;
    $('#end-body').innerHTML = win ? `<div class="end-title">恭喜你！成功逃脱！</div><div class="end-ko">진시황릉 탈출 성공!</div>
      <div style="color:#bca880">탐험가 <b style="color:#fff">${r.name}</b> · ${DIFF[r.diff].label}</div>
      <div class="grade"><div class="g">${r.grade}</div><div class="gt">${gl[r.grade]}<div style="font-size:13px;font-weight:400;color:#bca880">최종 등급</div></div></div>${stats}
      <div class="row-btns"><button class="btn gold" id="e-again"><b>再玩一次</b><small>다시 플레이</small></button><button class="btn" id="e-view"><b>查看成绩</b><small>결과 확인</small></button><button class="btn" id="e-home"><b>返回首页</b><small>처음으로</small></button></div>`
      : `<div class="end-title fail">很遗憾！</div><div class="end-ko" style="font-family:var(--zh)">你没有成功逃出去……</div><div style="color:#bca880;margin-bottom:10px">아쉽게도 시간 안에 탈출하지 못했어요… (${r.name})</div>${stats}
      <div class="row-btns"><button class="btn gold" id="e-again"><b>重新开始</b><small>다시 시작</small></button><button class="btn" id="e-view"><b>查看成绩</b><small>결과 확인</small></button><button class="btn" id="e-home"><b>返回首页</b><small>처음으로</small></button></div>`;
    $('#e-again').onclick = () => { Sfx.click(); this.hideScreens(); startPlay(newState(S.name, S.diff), false); };
    $('#e-view').onclick = () => { Sfx.click(); this.detailModal(r); };
    $('#e-home').onclick = () => { Sfx.click(); this.goHome(); };
    if (!win) { Sfx.drum(0, 0.6); Sfx.tone(110, 2, { type: 'sawtooth', gain: 0.08, f2: 55 }); }
  },
};
