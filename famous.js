// trian.go 有名角（30°・45°・60°）の三角比と，余角（90° − θ）の三角比
//   famous：30°・45°・60° の三角比の値を答える／値から角を答える
//   comp  ：45° 以下の角の三角比で表す（sin64° = cos26°，tan83° = 1/tan7°）
//   expr  ：余角の関係を使って式の値を求める（プリント［3］の型）
// ブラウザでは window.TrianFamous，Node では require('./famous.js')
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.TrianFamous = factory(root.TrianCore);
}(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const FN = ['sin', 'cos', 'tan'];
  const DEG = [30, 45, 60];
  const deg = d => d + '^\\circ';

  // 三角定規（θ = 30°，45°，60° の直角三角形）．辺の長さの2乗
  const TRI = {
    30: { opp2: 1, adj2: 3, hyp2: 4 },
    45: { opp2: 1, adj2: 1, hyp2: 2 },
    60: { opp2: 3, adj2: 1, hyp2: 4 }
  };
  // 値の書き方：natural（プリントの表と同じ）と，有理化した形
  const VAL_TEX = {
    30: { sin: ['\\frac{1}{2}'], cos: ['\\frac{\\sqrt{3}}{2}'], tan: ['\\frac{1}{\\sqrt{3}}', '\\frac{\\sqrt{3}}{3}'] },
    45: { sin: ['\\frac{1}{\\sqrt{2}}', '\\frac{\\sqrt{2}}{2}'], cos: ['\\frac{1}{\\sqrt{2}}', '\\frac{\\sqrt{2}}{2}'], tan: ['1'] },
    60: { sin: ['\\frac{\\sqrt{3}}{2}'], cos: ['\\frac{1}{2}'], tan: ['\\sqrt{3}'] }
  };
  const ratioOf = (d, fn) => {
    const t = TRI[d];
    return { sin: [t.opp2, t.hyp2], cos: [t.adj2, t.hyp2], tan: [t.opp2, t.adj2] }[fn];
  };

  // ---------- ① 有名角 ----------
  // sub 'value'：sin60° の値を答える（判定は core の judgeRatio）
  // sub 'angle'：sinθ = 1/2（θ は鋭角）の θ を答える
  function generateFamous(rng) {
    rng = rng || Math.random;
    const d = pick(rng, DEG), fn = pick(rng, FN);
    const base = Object.assign({ kind: 'famous', deg: d, fn, orient: { mode: 'axis', phi: 0, flip: false } }, TRI[d]);
    if (rng() < 0.5) return Object.assign(base, { sub: 'value' });
    const forms = VAL_TEX[d][fn];
    // 有理化した形は 3 回に 1 回くらい
    const valTex = forms.length > 1 && rng() < 0.35 ? forms[1] : forms[0];
    return Object.assign(base, { sub: 'angle', valTex });
  }

  // 角度を1つ読む：全角・°・度を許す．空欄 → null，読めない → NaN
  function readDeg(text) {
    const s = String(text || '')
      .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .replace(/[°度º˚\s]/g, '');
    if (s === '') return null;
    if (!/^\d+$/.test(s)) return NaN;
    return parseInt(s, 10);
  }

  // 値から角を答える問題の判定
  function judgeAngle(p, text) {
    const v = readDeg(text);
    if (v === null) return { status: 'empty', hint: '角度を入れてください．' };
    if (Number.isNaN(v)) return { status: 'invalid', hint: '角度は整数で入れてください（° は書かなくてよい）．' };
    if (v === p.deg) return { status: 'correct', hint: '' };
    // 別の三角比の値と取り違えた（sinθ = 1/2 に 60° など）
    const [n, dd] = ratioOf(p.deg, p.fn);
    const other = DEG.find(e => e !== p.deg && e === v && FN.some(f => f !== p.fn && ratioOf(e, f)[0] * dd === n * ratioOf(e, f)[1]));
    if (other) {
      const f = FN.find(g => g !== p.fn && ratioOf(other, g)[0] * dd === n * ratioOf(other, g)[1]);
      return { status: 'wrong', hint: `${v}° は ${f} の値が ${plainVal(p.deg, p.fn)} になる角です．${p.fn} の行を見直しましょう．` };
    }
    return { status: 'wrong', hint: '' };
  }
  const plainVal = (d, fn) => ({ 30: { sin: '1/2', cos: '√3/2', tan: '1/√3' }, 45: { sin: '1/√2', cos: '1/√2', tan: '1' }, 60: { sin: '√3/2', cos: '1/2', tan: '√3' } })[d][fn];

  // 解説：[{ text, tex }]
  function famousLines(p) {
    const ratio = { 30: '\\mathrm{BC} : \\mathrm{AB} : \\mathrm{AC} = 1 : 2 : \\sqrt{3}', 45: '\\mathrm{BC} : \\mathrm{AC} : \\mathrm{AB} = 1 : 1 : \\sqrt{2}', 60: '\\mathrm{BC} : \\mathrm{AB} : \\mathrm{AC} = \\sqrt{3} : 2 : 1' }[p.deg];
    const side = { sin: '\\frac{\\text{向かい}}{\\text{斜辺}}', cos: '\\frac{\\text{となり}}{\\text{斜辺}}', tan: '\\frac{\\text{向かい}}{\\text{となり}}' }[p.fn];
    const S = { opp: C.sqrtTex(p.opp2), adj: C.sqrtTex(p.adj2), hyp: C.sqrtTex(p.hyp2) };
    const frac = { sin: [S.opp, S.hyp], cos: [S.adj, S.hyp], tan: [S.opp, S.adj] }[p.fn];
    const v = VAL_TEX[p.deg][p.fn][0];
    const fracTex = frac[1] === '1' ? frac[0] : `\\frac{${frac[0]}}{${frac[1]}}`;
    const L = [];
    L.push({ text: `図の三角定規（${tx(ratio)}）で`, tex: `\\${p.fn}\\,${deg(p.deg)} = ${side} = ${fracTex}${fracTex === v ? '' : ' = ' + v}` });
    if (p.sub === 'angle') {
      L.push({ text: `よって，${tx('\\' + p.fn + '\\theta = ' + p.valTex)} となる鋭角 θ は`, tex: `\\theta = ${deg(p.deg)}` });
      if (p.valTex !== v) L.push({ text: `${tx(v)} を有理化すると ${tx(p.valTex)}．同じ値であることに気づけるかがポイントです．`, tex: '' });
    }
    return L;
  }
  function tx(t) { return '$' + t + '$'; }

  // ---------- ② 45° 以下の角で表す ----------
  // 答え ans = { fn: 'sin'|'cos'|'tan'|'rtan', deg } （rtan は 1/tan）
  const COMP = { sin: 'cos', cos: 'sin', tan: 'rtan' };
  function generateComp(rng) {
    rng = rng || Math.random;
    const fn = pick(rng, FN);
    const d = 46 + Math.floor(rng() * 44); // 46〜89
    return { kind: 'comp', fn, deg: d, ansFn: COMP[fn], ansDeg: 90 - d };
  }
  const fnName = f => f === 'rtan' ? '1/tan' : f;
  function judgeComp(p, ans) {
    const v = readDeg(ans.deg);
    if (!ans.fn) return { status: 'empty', hint: 'sin・cos・tan・1/tan のどれかを選んでください．' };
    if (v === null) return { status: 'empty', hint: '角度を入れてください．' };
    if (Number.isNaN(v)) return { status: 'invalid', hint: '角度は整数で入れてください（° は書かなくてよい）．' };
    if (ans.fn === p.ansFn && v === p.ansDeg) return { status: 'correct', hint: '' };
    // 同じものをそのまま書いた（値は合っているが 45° 以下でない）
    if (ans.fn === p.fn && v === p.deg) return { status: 'form', hint: `そのままです．${p.deg}° = 90° − ${p.ansDeg}° と見て，45° 以下の角で表しましょう．` };
    if (v === p.ansDeg) {
      if (p.fn === 'tan' && ans.fn === 'tan') return { status: 'wrong', hint: 'tan(90° − θ) = 1/tan θ です．tan のままにはなりません．' };
      if (ans.fn === p.fn) return { status: 'wrong', hint: `90° − θ にすると ${p.fn} は ${fnName(p.ansFn)} に変わります．` };
      return { status: 'wrong', hint: `${p.fn}(90° − θ) = ${fnName(p.ansFn)} θ です．` };
    }
    if (ans.fn === p.ansFn && v !== p.ansDeg) return { status: 'wrong', hint: `角は 90° − ${p.deg}° です．` };
    return { status: 'wrong', hint: '' };
  }
  function compAnswerTex(p) {
    return p.ansFn === 'rtan' ? `\\frac{1}{\\tan ${deg(p.ansDeg)}}` : `\\${p.ansFn}\\,${deg(p.ansDeg)}`;
  }
  function compLines(p) {
    const formula = { sin: '\\sin(90^\\circ - \\theta) = \\cos\\theta', cos: '\\cos(90^\\circ - \\theta) = \\sin\\theta', tan: '\\tan(90^\\circ - \\theta) = \\frac{1}{\\tan\\theta}' }[p.fn];
    return [
      { text: `${tx(formula)} を使う．${tx(deg(p.deg) + ' = 90^\\circ - ' + deg(p.ansDeg))} だから`, tex: `\\${p.fn}\\,${deg(p.deg)} = \\${p.fn}(90^\\circ - ${deg(p.ansDeg)}) = ${compAnswerTex(p)}` }
    ];
  }

  // ---------- ③ 式の値 ----------
  // value = { n, d }（答えの分子・分母．0 もある）
  const STEP5 = [5, 10, 15, 20, 25, 30, 35, 40]; // 45° より小さい側
  const pickSmall = (rng, avoid) => { let a; do { a = pick(rng, STEP5); } while (avoid && avoid.indexOf(a) >= 0); return a; };
  // 2つの角の組 (a, 90° − a) を，45° より大きい方を「90° − 小さい角」に書きかえて読む
  //   head：書きかえた形，tail：小さい角の三角比にした形（どちらも元の並び順）
  function pairForms(p, f, sq) {
    const small = Math.min(p, 90 - p), S = deg(small);
    const pw = sq ? '^2' : '';
    const g = { sin: 'cos', cos: 'sin' }[f];
    const one = a => a === small
      ? { head: `\\${f}${pw} ${S}`, tail: `\\${f}${pw} ${S}` }
      : { head: `\\${f}${pw}(90^\\circ - ${S})`, tail: f === 'tan' ? `\\frac{1}{\\tan ${S}}` : `\\${g}${pw} ${S}` };
    return [one(p), one(90 - p)];
  }
  const EXPR = {
    // sin²A + sin²(90° − A) = 1
    sqPair(rng) {
      const f = pick(rng, ['sin', 'cos']), g = f === 'sin' ? 'cos' : 'sin';
      const s = pickSmall(rng), [p, q] = rng() < 0.5 ? [s, 90 - s] : [90 - s, s];
      return {
        tex: `\\${f}^2 ${deg(p)} + \\${f}^2 ${deg(q)}`,
        value: { n: 1, d: 1 },
        lines: (() => {
          const [x, y] = pairForms(p, f, true);
          return [`与式 = ${x.head} + ${y.head} = ${x.tail} + ${y.tail} = 1`];
        })()
      };
    },
    // tanA tan(90° − A) ± tanB tan(90° − B)
    tanPair(rng) {
      const a = pickSmall(rng), b = pickSmall(rng, [a]);
      const [p, r] = [rng() < 0.5 ? a : 90 - a, rng() < 0.5 ? b : 90 - b];
      const plus = rng() < 0.4;
      const op = plus ? '+' : '-';
      return {
        tex: `\\tan ${deg(p)}\\tan ${deg(90 - p)} ${op} \\tan ${deg(r)}\\tan ${deg(90 - r)}`,
        value: plus ? { n: 2, d: 1 } : { n: 0, d: 1 },
        lines: (() => {
          const [a1, a2] = pairForms(p, 'tan', false), [b1, b2] = pairForms(r, 'tan', false);
          return [
            `与式 = ${a1.head}\\,${a2.head} ${op} ${b1.head}\\,${b2.head}`,
            `= ${a1.tail} \\cdot ${a2.tail} ${op} ${b1.tail} \\cdot ${b2.tail} = 1 ${op} 1 = ${plus ? 2 : 0}`
          ];
        })()
      };
    },
    // (sinA + sin(90° − A))² − 2 tanA cos²A = 1
    squareTan(rng) {
      const f = pick(rng, ['sin', 'cos']), g = f === 'sin' ? 'cos' : 'sin';
      const s = pickSmall(rng), p = rng() < 0.5 ? s : 90 - s, q = 90 - p;
      const P = deg(p);
      return {
        tex: `(\\${f} ${P} + \\${f} ${deg(q)})^2 - 2\\tan ${P}\\cos^2 ${P}`,
        value: { n: 1, d: 1 },
        lines: [
          `与式 = \\left\\{\\${f} ${P} + \\${f}(90^\\circ - ${P})\\right\\}^2 - 2 \\cdot \\frac{\\sin ${P}}{\\cos ${P}} \\cdot \\cos^2 ${P}`,
          `= (\\${f} ${P} + \\${g} ${P})^2 - 2\\sin ${P}\\cos ${P}`,
          `= (\\${f}^2 ${P} + 2\\sin ${P}\\cos ${P} + \\${g}^2 ${P}) - 2\\sin ${P}\\cos ${P}`,
          `= \\${f}^2 ${P} + \\${g}^2 ${P} = 1`
        ]
      };
    },
    // cos²20° + cos²35° + cos²45° + cos²55° + cos²70° = 5/2
    sqSum(rng) {
      const f = pick(rng, ['sin', 'cos']), g = f === 'sin' ? 'cos' : 'sin';
      const k = rng() < 0.6 ? 2 : 1;
      const with45 = k === 1 ? true : rng() < 0.6;
      const small = [];
      while (small.length < k) { const a = pickSmall(rng, small); small.push(a); }
      small.sort((x, y) => x - y);
      const angles = small.concat(small.map(a => 90 - a), with45 ? [45] : []).sort((x, y) => x - y);
      const value = with45 ? { n: 2 * k + 1, d: 2 } : { n: k, d: 1 };
      const big = angles.filter(a => a > 45);
      const lines = [];
      lines.push({ text: `${big.map(a => tx(`\\${f} ${deg(a)} = \\${f}(90^\\circ - ${deg(90 - a)}) = \\${g} ${deg(90 - a)}`)).join('，')}`, tex: '' });
      const rewritten = angles.map(a => a > 45 ? `\\${g}^2 ${deg(90 - a)}` : `\\${f}^2 ${deg(a)}`).join(' + ');
      const grouped = small.map(a => `(\\sin^2 ${deg(a)} + \\cos^2 ${deg(a)})`).concat(with45 ? [`\\${f}^2 45^\\circ`] : []).join(' + ');
      const ones = small.map(() => '1').concat(with45 ? ['\\left(\\frac{1}{\\sqrt{2}}\\right)^2'] : []).join(' + ');
      const valTex = value.d === 1 ? String(value.n) : `\\frac{${value.n}}{${value.d}}`;
      lines.push({ text: 'よって', tex: `\\text{与式} = ${rewritten}` });
      lines.push({ text: '', tex: `= ${grouped}` });
      lines.push({ text: '', tex: `= ${ones} = ${valTex}` });
      return { tex: angles.map(a => `\\${f}^2 ${deg(a)}`).join(' + '), value, lines };
    }
  };
  const EXPR_KEYS = Object.keys(EXPR);

  function generateExpr(rng) {
    rng = rng || Math.random;
    const type = pick(rng, EXPR_KEYS);
    const e = EXPR[type](rng);
    // lines は { text, tex } にそろえる（「与式」は数式の外に出す）
    const lines = e.lines.map(l => typeof l === 'string' ? splitYoshiki(l) : l);
    return { kind: 'expr', type, tex: e.tex, value: e.value, lines };
  }
  function splitYoshiki(s) {
    return s.indexOf('与式 = ') === 0 ? { text: '', tex: '\\text{与式} ' + s.slice(3) } : { text: '', tex: s };
  }
  const valueTex = v => v.d === 1 ? String(v.n) : `\\frac{${v.n}}{${v.d}}`;

  // 式の値の判定．ans は judgeRatio と同じ形 { a, b, c, d, numRoot, frac, denRoot }
  function judgeValue(p, ans) {
    const v = p.value;
    const plain = !ans.numRoot && !ans.frac;
    if (ans.a === 0) {
      if (v.n !== 0) return { status: 'wrong', hint: '' };
      return plain ? { status: 'correct', hint: '' } : { status: 'form', hint: '0 はそのまま 0 と書きましょう．' };
    }
    if (v.n === 0) {
      if (ans.a === null || ans.a === undefined) return { status: 'empty', hint: '空いている欄があります．' };
      return Number.isNaN(ans.a) ? { status: 'invalid', hint: '整数を入れてください．' } : { status: 'wrong', hint: '' };
    }
    const r = C.judgeRatio(ans, { n: v.n * v.n, d: v.d * v.d });
    return r.status === 'invalid' ? { status: 'invalid', hint: '分母と √ の中には 1 以上の整数を入れてください．' } : r;
  }

  return {
    TRI, VAL_TEX, DEG, FN,
    generateFamous, judgeAngle, famousLines, readDeg,
    generateComp, judgeComp, compLines, compAnswerTex,
    generateExpr, judgeValue, valueTex, EXPR_KEYS, _EXPR: EXPR
  };
}));
