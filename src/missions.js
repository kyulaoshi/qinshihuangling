'use strict';
/* ===================== 중국어 미션 데이터 ===================== */
// 문제 형식: type 'choice' | 'order' | 'input'
// zh / py / ko : 질문 (한자 / 병음 / 한국어 뜻)
// options: [{zh, py}] , answer: 정답 인덱스
// after: 정답 후 보여주고 읽어줄 문장

const pic = {
  emoji(big, cap) { return `<div class="pic"><div class="pic-emoji">${big}</div>${cap ? `<div class="pic-cap">${cap}</div>` : ''}</div>`; },
  family(title, members) {
    return `<div class="pic"><div class="pic-title">${title}</div><div class="fam">${members.map(m =>
      `<div class="fam-m${m.me ? ' me' : ''}"><div class="fam-e">${m.e}</div><div class="fam-l">${m.l}</div></div>`).join('')}</div></div>`;
  },
  warriors(n) {
    const one = `<svg viewBox="0 0 40 80" class="wsvg"><circle cx="20" cy="11" r="8" fill="#b9805a"/><circle cx="24" cy="4" r="3.5" fill="#6b4630"/>
      <rect x="9" y="20" width="22" height="24" rx="4" fill="#a9714d"/><rect x="8" y="24" width="24" height="4" fill="#6f4a33"/><rect x="8" y="32" width="24" height="4" fill="#6f4a33"/>
      <path d="M7 44 L33 44 L35 60 L5 60Z" fill="#9b6745"/><rect x="11" y="60" width="7" height="14" fill="#8b5c3e"/><rect x="22" y="60" width="7" height="14" fill="#8b5c3e"/>
      <rect x="2" y="21" width="7" height="20" rx="3" fill="#a9714d"/><rect x="31" y="21" width="7" height="20" rx="3" fill="#a9714d"/></svg>`;
    return `<div class="pic"><div class="pic-row">${one.repeat(n)}</div></div>`;
  },
  calendar(m, d) {
    return `<div class="pic"><div class="calpic"><div class="cal-m">${m}월</div><div class="cal-d">${d}</div><div class="cal-t">오늘 · 今天</div></div></div>`;
  },
};


function genMissions(seed, name, diff) {
  const rng = makeRng(seed);
  const nm = name || '탐험가';
  const M = {};
  const q = o => Object.assign({ type: 'choice' }, o);
  const hard = diff === 'hard';

  // ---------- MISSION 1 : 인사와 자기소개 ----------
  const age = 14;
  M[1] = {
    title: '第一关 · 你好！', ko: 'MISSION 1 · 인사와 자기소개', speaker: '守门兵马俑 (문지기 병마용)',
    intro: { zh: '站住！你是谁？回答我的问题！', py: 'Zhànzhù! Nǐ shì shéi? Huídá wǒ de wèntí!', ko: '멈춰라! 너는 누구냐? 내 질문에 대답해라!' },
    questions: [
      q({ zh: '你好！请选择正确的回答。', py: 'Nǐ hǎo! Qǐng xuǎnzé zhèngquè de huídá.', ko: '안녕! 알맞은 대답을 고르세요.',
        options: [{ zh: '再见。', py: 'Zàijiàn.' }, { zh: '你好！', py: 'Nǐ hǎo!' }, { zh: '谢谢。', py: 'Xièxie.' }, { zh: '对不起。', py: 'Duìbuqǐ.' }], answer: 1,
        hint: '처음 만났을 때 하는 인사에는 같은 인사로 대답해요.', after: { zh: '你好！', py: 'Nǐ hǎo!', ko: '안녕!' } }),
      hard ? q({ type: 'order', zh: '你叫什么名字？', py: 'Nǐ jiào shénme míngzi?', ko: '너의 이름은 무엇이니?', inst: '단어 카드를 순서대로 눌러 대답을 완성하세요.',
        tiles: ['我', '叫', nm, '。'], hint: '“나는 ~라고 불러” → 我 + 叫 + 이름', after: { zh: `我叫${nm}。`, py: `Wǒ jiào ${nm}.`, ko: `내 이름은 ${nm}이야.` } })
      : q({ zh: '你叫什么名字？', py: 'Nǐ jiào shénme míngzi?', ko: '너의 이름은 무엇이니?',
        options: [{ zh: `我叫${nm}。`, py: `Wǒ jiào ${nm}.` }, { zh: '我十四岁。', py: 'Wǒ shísì suì.' }, { zh: '我是韩国人。', py: 'Wǒ shì Hánguó rén.' }, { zh: '我很好。', py: 'Wǒ hěn hǎo.' }], answer: 0,
        hint: '이름을 물을 때는 “我叫 + 이름”으로 대답해요.', after: { zh: `我叫${nm}。`, py: `Wǒ jiào ${nm}.`, ko: `내 이름은 ${nm}이야.` } }),
      hard ? q({ type: 'input', zh: '你是哪国人？', py: 'Nǐ shì nǎ guó rén?', ko: '너는 어느 나라 사람이니?', inst: '빈칸에 들어갈 말을 한자 또는 병음으로 입력하세요.',
        blank: '我是 ____ 人。', pic: pic.emoji('🇰🇷'), accept: ['韩国', 'hanguo', '韩国人', 'hanguoren'], hint: '한국 = 韩国 (Hánguó)', after: { zh: '我是韩国人。', py: 'Wǒ shì Hánguó rén.', ko: '나는 한국 사람이야.' } })
      : q({ zh: '你是哪国人？', py: 'Nǐ shì nǎ guó rén?', ko: '너는 어느 나라 사람이니?', pic: pic.emoji('🇰🇷'),
        options: [{ zh: '我是韩国人。', py: 'Wǒ shì Hánguó rén.' }, { zh: '我是老师。', py: 'Wǒ shì lǎoshī.' }, { zh: '我去北京。', py: 'Wǒ qù Běijīng.' }, { zh: '我是学生。', py: 'Wǒ shì xuésheng.' }], answer: 0,
        hint: '哪国人 = 어느 나라 사람. 나라 이름이 들어간 대답을 찾아요.', after: { zh: '我是韩国人。', py: 'Wǒ shì Hánguó rén.', ko: '나는 한국 사람이야.' } }),
      q({ zh: '你几岁？', py: 'Nǐ jǐ suì?', ko: '너는 몇 살이니?', pic: pic.emoji('🎂', `<b class="big-n">${age}</b> 살`),
        options: [{ zh: '我十四岁。', py: 'Wǒ shísì suì.' }, { zh: '我四十岁。', py: 'Wǒ sìshí suì.' }, { zh: '我十岁。', py: 'Wǒ shí suì.' }, { zh: '我四岁。', py: 'Wǒ sì suì.' }], answer: 0,
        hint: '14 = 十(10) + 四(4) → 十四. 四十는 40이에요.', after: { zh: '我十四岁。', py: 'Wǒ shísì suì.', ko: '나는 14살이야.' } }),
    ],
  };

  // ---------- MISSION 2 : 사라진 황제의 옥새 (추리 미션, 문제 데이터는 CASE 참고) ----------
  M[2] = { title: '第二关 · 玉玺不见了！', ko: 'MISSION 2 · 사라진 황제의 옥새', speaker: '兵马俑坑 (병마용의 방)', questions: [], deduction: true };

  // ---------- MISSION 3 : 날짜와 생일 ----------
  const now = new Date(); const tm = now.getMonth() + 1, td = now.getDate();
  const dateOpt = (m, d) => ({ zh: `今天${dateZh(m, d)}。`, py: `Jīntiān ${datePy(m, d)}.` });
  const todayAlts = [];
  const pushAlt = (m, d) => { if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && !(m === tm && d === td) && !todayAlts.some(a => a[0] === m && a[1] === d)) todayAlts.push([m, d]); };
  pushAlt(td, tm); pushAlt(tm, td + 10 > 31 ? td - 10 : td + 10); pushAlt(tm === 12 ? 11 : tm + 1, td); pushAlt(tm, td > 1 ? td - 1 : td + 1); pushAlt(tm === 1 ? 2 : tm - 1, td);
  const bm = rng.int(1, 12), bd = rng.pick([2, 5, 8, 12, 15, 20, 21, 25, 28]);
  const bAlts = [[bd <= 12 ? bd : (bm % 12) + 1, bd <= 12 ? bm : bd], [bm, bd + 1 <= 28 ? bd + 1 : bd - 3], [bm === 12 ? 2 : bm + 2, bd]]
    .filter((a, i, arr) => !(a[0] === bm && a[1] === bd));
  while (bAlts.length < 3) bAlts.push([((bm + bAlts.length * 3) % 12) + 1, bd]);
  const bdayOpt = (m, d) => ({ zh: `我的生日是${dateZh(m, d)}。`, py: `Wǒ de shēngrì shì ${datePy(m, d)}.` });
  const ordDates = []; while (ordDates.length < 4) { const m = rng.int(1, 12), d = rng.int(1, 28); if (!ordDates.some(a => a[0] === m)) ordDates.push([m, d]); }
  const sorted = ordDates.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  M[3] = {
    title: '第三关 · 密码室', ko: 'MISSION 3 · 날짜와 생일', speaker: '古代石历 (고대 돌 달력)',
    intro: { zh: '墙上的古历发出了光……', py: 'Qiáng shang de gǔ lì fāchū le guāng……', ko: '벽의 고대 달력이 빛나기 시작했다……' },
    questions: [
      q({ zh: '今天几月几号？', py: 'Jīntiān jǐ yuè jǐ hào?', ko: '오늘은 몇 월 며칠이니?', pic: pic.calendar(tm, td),
        options: [dateOpt(tm, td), ...todayAlts.slice(0, 3).map(a => dateOpt(a[0], a[1]))], answer: 0,
        hint: '중국어 날짜 순서는 “월(月) → 일(号)”이에요. 달력의 빨간 동그라미가 오늘!', after: { zh: `今天${dateZh(tm, td)}。`, py: `Jīntiān ${datePy(tm, td)}.`, ko: `오늘은 ${dateKo(tm, td)}이야.` } }),
      q({ zh: '你的生日是几月几号？', py: 'Nǐ de shēngrì shì jǐ yuè jǐ hào?', ko: '너의 생일은 몇 월 며칠이니?', pic: pic.emoji('🎂', `내 생일: <b class="big-n">${bm}월 ${bd}일</b>`),
        options: [bdayOpt(bm, bd), ...bAlts.slice(0, 3).map(a => bdayOpt(a[0], a[1]))], answer: 0,
        hint: `${bm}월 = ${numZh(bm)}月, ${bd}일 = ${numZh(bd)}号`, after: { zh: `我的生日是${dateZh(bm, bd)}。`, py: `Wǒ de shēngrì shì ${datePy(bm, bd)}.`, ko: `내 생일은 ${dateKo(bm, bd)}이야.` } }),
      hard ? q({ type: 'input', zh: '8月15号', py: '', ko: '', inst: '위 날짜를 병음으로 입력하세요. (성조 생략 가능, 예: ba yue …)', hidePy: true,
        accept: ['bayueshiwuhao', '八月十五号'], hint: '8 = bā, 15 = shíwǔ, 월 = yuè, 일 = hào', after: { zh: '八月十五号', py: 'bā yuè shíwǔ hào', ko: '8월 15일' } })
      : q({ zh: '8月15号', py: '', ko: '', inst: '알맞은 병음과 한국어 뜻을 고르세요.', hidePy: true,
        options: [{ zh: 'bā yuè shíwǔ hào', py: '8월 15일' }, { zh: 'bā yuè wǔshí hào', py: '8월 15일' }, { zh: 'bā yuè shíwǔ hào', py: '8월 5일' }, { zh: 'sì yuè shíwǔ hào', py: '4월 15일' }], answer: 0, latin: true,
        hint: '15는 十五(shíwǔ), 50은 五十(wǔshí). 병음과 뜻이 모두 맞아야 해요.', after: { zh: '八月十五号', py: 'bā yuè shíwǔ hào', ko: '8월 15일' } }),
      q({ type: 'order', zh: '请按顺序排列。', py: 'Qǐng àn shùnxù páiliè.', ko: '순서대로 배열하세요.', inst: '날짜가 빠른 순서(1월 → 12월)대로 카드를 누르세요.',
        tiles: ordDates.map(a => dateZh(a[0], a[1])), solution: sorted.map(a => dateZh(a[0], a[1])), sep: ' → ',
        hint: '一月 → 二月 → … → 十二月. 먼저 “月” 앞의 숫자를 비교하세요.', after: { zh: sorted.map(a => dateZh(a[0], a[1])).join('，'), py: sorted.map(a => datePy(a[0], a[1])).join(', '), ko: sorted.map(a => dateKo(a[0], a[1])).join(' → ') } }),
    ],
  };

  // ---------- MISSION 4 : 날씨 / 가격 / 음식 ----------
  const W4 = [
    { e: '☀️', cap: '22°C', zh: '今天是晴天。', py: 'Jīntiān shì qíngtiān.', ko: '오늘은 맑아.' },
    { e: '🌧️☔', cap: '', zh: '今天下雨。', py: 'Jīntiān xià yǔ.', ko: '오늘은 비가 와.' },
    { e: '🥶❄️', cap: '-10°C', zh: '今天很冷。', py: 'Jīntiān hěn lěng.', ko: '오늘은 아주 추워.' },
    { e: '🥵🔥', cap: '38°C', zh: '今天很热。', py: 'Jīntiān hěn rè.', ko: '오늘은 아주 더워.' },
  ];
  const wi = rng.int(0, 3);
  const FOOD = [{ e: '🥟', zh: '饺子', py: 'jiǎozi', ko: '만두' }, { e: '🍜', zh: '面条', py: 'miàntiáo', ko: '국수' }, { e: '🍚', zh: '米饭', py: 'mǐfàn', ko: '밥' }];
  const fi = rng.int(0, 2), fOther = FOOD[(fi + 1 + rng.int(0, 1)) % 3];
  const DRINK = [{ e: '🥤', zh: '可乐', py: 'kělè', ko: '콜라' }, { e: '🍵', zh: '茶', py: 'chá', ko: '차' }, { e: '🥛', zh: '牛奶', py: 'niúnǎi', ko: '우유' }, { e: '🧃', zh: '果汁', py: 'guǒzhī', ko: '주스' }];
  const di = rng.int(0, 3);
  const foodOpts = rng.shuffle([FOOD[fi], fOther]).map(f => ({ zh: `我要${f.zh}。`, py: `Wǒ yào ${f.py}.`, ok: f === FOOD[fi] }))
    .concat([{ zh: '我要老师。', py: 'Wǒ yào lǎoshī.' }, { zh: '我要学生。', py: 'Wǒ yào xuésheng.' }]);
  M[4] = {
    title: '第四关 · 皇帝宝库', ko: 'MISSION 4 · 날씨와 가격, 음식', speaker: '宝箱 (보물상자)',
    intro: { zh: '宝箱上有五把锁。回答问题，打开宝箱！', py: 'Bǎoxiāng shang yǒu wǔ bǎ suǒ. Huídá wèntí, dǎkāi bǎoxiāng!', ko: '보물상자에 자물쇠가 다섯 개 있다. 문제에 답해 상자를 열어라!' },
    questions: [
      q({ zh: '今天天气怎么样？', py: 'Jīntiān tiānqì zěnmeyàng?', ko: '오늘 날씨 어때?', pic: pic.emoji(W4[wi].e, W4[wi].cap),
        options: W4.map(w => ({ zh: w.zh, py: w.py })), answer: wi,
        hint: '晴天 맑음 · 下雨 비가 옴 · 冷 추움 · 热 더움', after: W4[wi] }),
      q({ zh: '一个苹果十块钱。这个多少钱？', py: 'Yí gè píngguǒ shí kuài qián. Zhège duōshao qián?', ko: '사과 한 개에 10위안이에요. 이건 얼마예요?', pic: pic.emoji('🍎'),
        options: [{ zh: '10元', py: 'shí kuài qián' }, { zh: '4元', py: 'sì kuài qián' }, { zh: '100元', py: 'yìbǎi kuài qián' }, { zh: '1元', py: 'yí kuài qián' }], answer: 0,
        hint: '十 = 10, 块钱 = 위안(元)을 말로 할 때 쓰는 표현', after: { zh: '这个十块钱。', py: 'Zhège shí kuài qián.', ko: '이건 10위안이에요.' } }),
      hard ? q({ type: 'input', zh: '你要吃什么？', py: 'Nǐ yào chī shénme?', ko: '너 뭐 먹을래?', pic: pic.emoji(FOOD[fi].e), inst: '그림 속 음식을 한자 또는 병음으로 입력하세요.',
        blank: '我要 ____ 。', accept: [FOOD[fi].zh, normAns(FOOD[fi].py)], hint: `${FOOD[fi].ko} = ${FOOD[fi].zh} (${FOOD[fi].py})`, after: { zh: `我要${FOOD[fi].zh}。`, py: `Wǒ yào ${FOOD[fi].py}.`, ko: `나는 ${FOOD[fi].ko}를 먹을래.` } })
      : q({ zh: '你要吃什么？', py: 'Nǐ yào chī shénme?', ko: '너 뭐 먹을래?', pic: pic.emoji(FOOD[fi].e),
        options: foodOpts.map(o => ({ zh: o.zh, py: o.py })), answer: foodOpts.findIndex(o => o.ok),
        hint: `그림은 ${FOOD[fi].ko}예요. 饺子 만두 · 面条 국수 · 米饭 밥`, after: { zh: `我要${FOOD[fi].zh}。`, py: `Wǒ yào ${FOOD[fi].py}.`, ko: `나는 ${FOOD[fi].ko}를 먹을래.` } }),
      q({ zh: '你要喝什么？', py: 'Nǐ yào hē shénme?', ko: '너 뭐 마실래?', pic: pic.emoji(DRINK[di].e),
        options: DRINK.map(d => ({ zh: `我要喝${d.zh}。`, py: `Wǒ yào hē ${d.py}.` })), answer: di,
        hint: '可乐 콜라 · 茶 차 · 牛奶 우유 · 果汁 주스', after: { zh: `我要喝${DRINK[di].zh}。`, py: `Wǒ yào hē ${DRINK[di].py}.`, ko: `나는 ${DRINK[di].ko}를 마실래.` } }),
      q({ zh: '太贵了！', py: 'Tài guì le!', ko: '', hideKo: true, inst: '이 표현의 알맞은 뜻을 고르세요.',
        options: [{ zh: '너무 비싸요!', py: '' }, { zh: '너무 싸요!', py: '' }, { zh: '정말 맛있어요!', py: '' }, { zh: '얼마예요?', py: '' }], answer: 0, korean: true,
        hint: '贵(guì) = 비싸다, 太 … 了 = 너무 ~하다', after: { zh: '太贵了！', py: 'Tài guì le!', ko: '너무 비싸요!' } }),
    ],
  };

  // ---------- MISSION 5 : 종합 (병마용 3명이 1문제씩) ----------
  const p5 = rng.int(20, 60) ;
  const price5 = [15, 50, 5, 500];
  const pool = [
    q({ zh: '你叫什么名字？', py: 'Nǐ jiào shénme míngzi?', ko: '너의 이름은 무엇이니?',
      options: [{ zh: `我叫${nm}。`, py: `Wǒ jiào ${nm}.` }, { zh: `我是${nm}的老师。`, py: `Wǒ shì ${nm} de lǎoshī.` }, { zh: '我去学校。', py: 'Wǒ qù xuéxiào.' }, { zh: '我没有名字。', py: 'Wǒ méiyǒu míngzi.' }], answer: 0,
      hint: '我叫 + 이름', after: { zh: `我叫${nm}。`, py: `Wǒ jiào ${nm}.`, ko: `내 이름은 ${nm}이야.` } }),
    q({ zh: '你去哪儿？', py: 'Nǐ qù nǎr?', ko: '너 어디 가니?', pic: pic.emoji('🏫', '학교'),
      options: [{ zh: '我去学校。', py: 'Wǒ qù xuéxiào.' }, { zh: '我是学生。', py: 'Wǒ shì xuésheng.' }, { zh: '我叫学校。', py: 'Wǒ jiào xuéxiào.' }, { zh: '我有学校。', py: 'Wǒ yǒu xuéxiào.' }], answer: 0,
      hint: '去 = 가다. “我去 + 장소”', after: { zh: '我去学校。', py: 'Wǒ qù xuéxiào.', ko: '나는 학교에 가.' } }),
    q({ zh: '这个多少钱？', py: 'Zhège duōshao qián?', ko: '이거 얼마예요?', pic: pic.emoji('👜', '<b class="big-n">50</b>元'),
      options: [{ zh: '五十块钱。', py: 'Wǔshí kuài qián.' }, { zh: '十五块钱。', py: 'Shíwǔ kuài qián.' }, { zh: '五块钱。', py: 'Wǔ kuài qián.' }, { zh: '五百块钱。', py: 'Wǔbǎi kuài qián.' }], answer: 0,
      hint: '50 = 五 × 十 → 五十', after: { zh: '五十块钱。', py: 'Wǔshí kuài qián.', ko: '50위안이에요.' } }),
    q({ zh: '你有没有姐姐？', py: 'Nǐ yǒu méiyǒu jiějie?', ko: '너는 언니(누나)가 있니?', pic: pic.family('나의 가족', [{ e: '👨', l: '아빠' }, { e: '👩', l: '엄마' }, { e: '👧', l: '언니·누나' }, { e: '🙂', l: '나', me: true }]),
      options: [{ zh: '我有姐姐。', py: 'Wǒ yǒu jiějie.' }, { zh: '我没有姐姐。', py: 'Wǒ méiyǒu jiějie.' }, { zh: '我是姐姐。', py: 'Wǒ shì jiějie.' }, { zh: '我叫姐姐。', py: 'Wǒ jiào jiějie.' }], answer: 0,
      hint: '姐姐(jiějie) = 언니/누나. 그림 속 가족을 확인하세요.', after: { zh: '我有姐姐。', py: 'Wǒ yǒu jiějie.', ko: '나는 언니(누나)가 있어.' } }),
    q({ zh: '你的生日是几月几号？', py: 'Nǐ de shēngrì shì jǐ yuè jǐ hào?', ko: '너의 생일은 몇 월 며칠이니?', pic: pic.emoji('🎂', '내 생일: <b class="big-n">3월 8일</b>'),
      options: [bdayOpt(3, 8), bdayOpt(8, 3), bdayOpt(3, 18), bdayOpt(10, 8)], answer: 0,
      hint: '3월 = 三月, 8일 = 八号', after: { zh: '我的生日是三月八号。', py: 'Wǒ de shēngrì shì sān yuè bā hào.', ko: '내 생일은 3월 8일이야.' } }),
    q({ zh: '你要吃什么？', py: 'Nǐ yào chī shénme?', ko: '너 뭐 먹을래?', pic: pic.emoji('🍜'),
      options: [{ zh: '我要面条。', py: 'Wǒ yào miàntiáo.' }, { zh: '我要饺子。', py: 'Wǒ yào jiǎozi.' }, { zh: '我要米饭。', py: 'Wǒ yào mǐfàn.' }, { zh: '我要可乐。', py: 'Wǒ yào kělè.' }], answer: 0,
      hint: '面条(miàntiáo) = 국수', after: { zh: '我要面条。', py: 'Wǒ yào miàntiáo.', ko: '나는 국수를 먹을래.' } }),
    q({ type: 'order', zh: '你是哪国人？', py: 'Nǐ shì nǎ guó rén?', ko: '너는 어느 나라 사람이니?', inst: '단어 카드를 순서대로 눌러 대답을 완성하세요.',
      tiles: ['人', '我', '韩国', '是'], solution: ['我', '是', '韩国', '人'], hint: '我 + 是 + 나라 + 人', after: { zh: '我是韩国人。', py: 'Wǒ shì Hánguó rén.', ko: '나는 한국 사람이야.' } }),
    q({ zh: '今天天气怎么样？', py: 'Jīntiān tiānqì zěnmeyàng?', ko: '오늘 날씨 어때?', pic: pic.emoji('🌧️☔'),
      options: [{ zh: '今天下雨。', py: 'Jīntiān xià yǔ.' }, { zh: '今天是晴天。', py: 'Jīntiān shì qíngtiān.' }, { zh: '今天很热。', py: 'Jīntiān hěn rè.' }, { zh: '今天星期一。', py: 'Jīntiān xīngqīyī.' }], answer: 0,
      hint: '下雨 = 비가 오다', after: { zh: '今天下雨。', py: 'Jīntiān xià yǔ.', ko: '오늘은 비가 와.' } }),
    q({ type: 'order', zh: '你有没有哥哥？', py: 'Nǐ yǒu méiyǒu gēge?', ko: '너는 형(오빠)이 있니?', inst: '“나는 형(오빠)이 한 명 있어.”가 되도록 카드를 누르세요.',
      tiles: ['哥哥', '有', '一个', '我'], solution: ['我', '有', '一个', '哥哥'], hint: '我 + 有 + 一个 + 가족', after: { zh: '我有一个哥哥。', py: 'Wǒ yǒu yí gè gēge.', ko: '나는 형(오빠)이 한 명 있어.' } }),
  ];
  const pick5 = rng.shuffle(pool.map((_, i) => i)).slice(0, 3).map(i => pool[i]);
  M[5] = {
    title: '第五关 · 最后的迷宫', ko: 'MISSION 5 · 종합 미션', speaker: '迷宫守卫 (미로의 병마용)',
    intro: { zh: '想过去吗？先回答我的问题！', py: 'Xiǎng guòqu ma? Xiān huídá wǒ de wèntí!', ko: '지나가고 싶으냐? 먼저 내 질문에 답하라!' },
    questions: pick5, perStep: true,
  };
  // order 타입 기본값 보정
  Object.values(M).forEach(m => m.questions.forEach(qq => { if (qq.type === 'order' && !qq.solution) qq.solution = qq.tiles.slice(); }));
  // 섞기 & 난이도별 보기 개수
  Object.values(M).forEach(m => m.questions.forEach(qq => {
    if (qq.type === 'order') { let t; do { t = rng.shuffle(qq.tiles); } while (t.join() === qq.solution.join()); qq.tiles = t; return; }
    if (qq.type !== 'choice') return;
    let opts = qq.options.map((o, i) => Object.assign({}, o, { ok: i === qq.answer }));
    if (diff !== 'easy' && !qq.keep && opts.length === 4 && rng() < 0.6) {
      const wrong = opts.filter(o => !o.ok); opts = opts.filter(o => o !== wrong[rng.int(0, wrong.length - 1)]);
    }
    opts = rng.shuffle(opts); qq.options = opts; qq.answer = opts.findIndex(o => o.ok);
  }));
  const codes = [1, 2, 3, 4, 5].map(() => rng.int(1, 9));
  return { M, codes };
}

/* ===================== MISSION 2 사건 데이터 ===================== */
const CASE = {
  time: { zh: '下午两点', py: 'xiàwǔ liǎng diǎn', ko: '오후 2시' },
  suspects: [
    { id: 'gen', zh: '将军', py: 'jiāngjūn', ko: '장군', icon: '🎖️', say: { zh: '我是将军。不是我！', py: 'Wǒ shì jiāngjūn. Bú shì wǒ!', ko: '나는 장군이다. 내가 아니다!' } },
    { id: 'arch', zh: '弓箭手', py: 'gōngjiànshǒu', ko: '궁수', icon: '🏹', say: { zh: '我是弓箭手。我不知道。', py: 'Wǒ shì gōngjiànshǒu. Wǒ bù zhīdào.', ko: '나는 궁수다. 나는 모른다.' } },
    { id: 'char', zh: '车兵', py: 'chēbīng', ko: '전차병', icon: '🛞', say: { zh: '我是车兵。不……不是我。', py: 'Wǒ shì chēbīng. Bù…… bú shì wǒ.', ko: '나는 전차병이다. 내…… 내가 아니야.' } },
    { id: 'inf', zh: '步兵', py: 'bùbīng', ko: '보병', icon: '🛡️', say: { zh: '我是步兵。你问别人吧！', py: 'Wǒ shì bùbīng. Nǐ wèn biérén ba!', ko: '나는 보병이다. 다른 사람에게 물어봐라!' } },
  ],
  clues: {
    incident: { title: '事件记录', ko: '바닥에 떨어진 사건 기록', icon: '📄', lines: [
      { zh: '下午两点，玉玺不见了。', py: 'Xiàwǔ liǎng diǎn, yùxǐ bú jiàn le.', ko: '오후 2시, 옥새가 사라졌다.' }] },
    gen: { title: '将军的行动记录', ko: '장군의 행동 기록', icon: '🎋', who: 'gen', lines: [
      { zh: '将军一点去东门。', py: 'Jiāngjūn yì diǎn qù dōngmén.', ko: '장군은 1시에 동문에 갔다.' },
      { zh: '将军两点半回来。', py: 'Jiāngjūn liǎng diǎn bàn huílai.', ko: '장군은 2시 30분에 돌아왔다.' }] },
    arch: { title: '弓箭手的行动记录', ko: '궁수의 행동 기록', icon: '🎋', who: 'arch', lines: [
      { zh: '弓箭手一点去练习场。', py: 'Gōngjiànshǒu yì diǎn qù liànxíchǎng.', ko: '궁수는 1시에 연습장에 갔다.' },
      { zh: '弓箭手两点半回来。', py: 'Gōngjiànshǒu liǎng diǎn bàn huílai.', ko: '궁수는 2시 30분에 돌아왔다.' }] },
    char: { title: '车兵的行动记录', ko: '전차병의 행동 기록', icon: '🎋', who: 'char', lines: [
      { zh: '车兵一点半回房间。', py: 'Chēbīng yì diǎn bàn huí fángjiān.', ko: '전차병은 1시 30분에 방으로 돌아왔다.' },
      { zh: '车兵两点半去西门。', py: 'Chēbīng liǎng diǎn bàn qù xīmén.', ko: '전차병은 2시 30분에 서문에 갔다.' }] },
    inf: { title: '步兵的行动记录', ko: '보병의 행동 기록', icon: '🎋', who: 'inf', lines: [
      { zh: '步兵一点半去西门。', py: 'Bùbīng yì diǎn bàn qù xīmén.', ko: '보병은 1시 30분에 서문에 갔다.' },
      { zh: '步兵两点半回房间。', py: 'Bùbīng liǎng diǎn bàn huí fángjiān.', ko: '보병은 2시 30분에 방으로 돌아왔다.' }] },
    rule: { title: '墓规', ko: '무덤의 규칙이 새겨진 비석', icon: '🪨', lines: [
      { zh: '两个人以上在房间里的时候，谁也不能拿玉玺。', py: 'Liǎng ge rén yǐshàng zài fángjiān li de shíhou, shéi yě bù néng ná yùxǐ.', ko: '두 명 이상 방에 있을 때는 누구도 옥새를 가져갈 수 없다.' }],
      note: '※ 房间(fángjiān): 옥새가 놓여 있던 바로 이 방' },
  },
  clueOrder: ['incident', 'gen', 'arch', 'char', 'inf', 'rule'],
  times: [{ k: 't100', zh: '一点', ko: '1:00' }, { k: 't130', zh: '一点半', ko: '1:30' }, { k: 't200', zh: '两点', ko: '2:00', crime: true }, { k: 't230', zh: '两点半', ko: '2:30' }],
  places: [{ k: 'room', zh: '房间', py: 'fángjiān', ko: '방' }, { k: 'east', zh: '东门', py: 'dōngmén', ko: '동문' }, { k: 'west', zh: '西门', py: 'xīmén', ko: '서문' },
    { k: 'field', zh: '练习场', py: 'liànxíchǎng', ko: '연습장' }, { k: 'unk', zh: '？', py: '', ko: '모름' }],
  reasons: [
    { id: 'r1', zh: '下午两点，他一个人在房间里。', py: 'Xiàwǔ liǎng diǎn, tā yí ge rén zài fángjiān li.', ko: '오후 2시에 그는 혼자 방에 있었다.' },
    { id: 'r2', zh: '两点半，他去了西门。', py: 'Liǎng diǎn bàn, tā qù le xīmén.', ko: '2시 30분에 그는 서문으로 갔다. (도망쳤다)' },
    { id: 'r3', zh: '一点，他去了东门。', py: 'Yì diǎn, tā qù le dōngmén.', ko: '1시에 그는 동문으로 갔다.' },
    { id: 'r4', zh: '两点半，他回来了。', py: 'Liǎng diǎn bàn, tā huílai le.', ko: '2시 30분에 그는 돌아왔다.' },
    { id: 'r5', zh: '下午两点，他不在房间里。', py: 'Xiàwǔ liǎng diǎn, tā bú zài fángjiān li.', ko: '오후 2시에 그는 방에 없었다.' },
  ],
  hints: [
    '옥새가 사라진 시간은 <b>오후 2시</b>입니다. 각 병마용의 행동 기록을 다시 확인해 보세요.',
    '<b>一点半</b>은 1시 30분, <b>两点半</b>은 2시 30분입니다. 이 시간 사이에 각 인물이 어디에 있었는지 정리해 보세요.',
    '두 명 이상이 방에 있으면 옥새를 가져갈 수 없습니다. <b>오후 2시에 방에 혼자 있었던 인물</b>을 찾아보세요.',
  ],
};
// ---- 교사용 정답·해설 데이터 (학생 화면에는 추리 완료 전까지 표시되지 않음, 소스에서도 바로 읽히지 않게 인코딩) ----
const TEACHER_CASE = 'eyJjIjoiY2hhciIsInIiOiJyMSIsImUiOiLsnqXqtbDsnYAgMeyLnOyXkCDrj5nrrLjsl5AsIOq2geyImOuKlCAx7Iuc7JeQIOyXsOyKteyepeyXkCDqsJTri6TqsIAgMuyLnCAzMOu2hOyXkOyVvCDrj4zslYTsmZTri6Qg4oaSIOyYpO2bhCAy7Iuc7JeQ64qUIOuwqeyXkCDsl4bsl4jri6QuIOuztOuzkeydgCAx7IucIDMw67aE7JeQIOyEnOusuOycvOuhnCDqsJTri6TqsIAgMuyLnCAzMOu2hOyXkOyVvCDrsKnsnLzroZwg64+M7JWE7JmU64ukIOKGkiDsmKTtm4QgMuyLnOyXkOuKlCDshJzrrLjsl5Ag7J6I7JeI64ukLiDsoITssKjrs5HsnYAgMeyLnCAzMOu2hOyXkCDrsKnsnLzroZwg64+M7JWE7JmA7IScIDLsi5wgMzDrtoTsl5Ag7ISc66y47Jy866GcIOqwlOuLpCDihpIg7Jik7ZuEIDLsi5zsl5Ag67Cp7JeQIO2YvOyekCDsnojsl4jri6QuIOuRkCDrqoUg7J207IOB7J20IOyXhuyXiOycvOuvgOuhnCDsmKXsg4jrpbwg6rCA7KC46rCIIOyImCDsnojsl4jri6QuIOKGkiDrspTsnbg6IOi9puWFtSJ9';
function teacherCase() { try { return JSON.parse(decodeURIComponent(escape(atob(TEACHER_CASE)))); } catch (e) { return null; } }
