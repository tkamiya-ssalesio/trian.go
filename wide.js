// trian.go 0° ≦ θ ≦ 180° の練習（04-05 三角比の拡張，04-06 三角方程式・直線の傾き，04-07 相互関係#02）
//   wideVal ：0°〜180° の有名角の三角比の値（0°・90°・180° も）
//   wideComp：鈍角の三角比を 45° 以下の角で表す（sin156° = sin24°，tan117° = −1/tan27°）
//   eq      ：三角方程式（0° ≦ θ ≦ 180°．答えが2つのことがある）
//   slope   ：直線と x 軸の正の向きとのなす角 ⇔ 直線の傾き
//   rel2    ：1つの値から残りの2つ（0° ≦ θ ≦ 180°．sin を与えるときは鋭角か鈍角かを指定）
//   expr2   ：180° − θ・90° − θ を使う式の値
// 値は { s, n2, d2 }：s√(n2/d2)（s は 1，−1，0）．判定は core の judgeRatio に符号を足したもの．
// ブラウザでは window.TrianWide，Node では require('./wide.js')
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./relation.js'));
  else root.TrianWide = factory(root.TrianCore, root.TrianRelation);
}(typeof self !== 'undefined' ? self : this, function (C, RL) {
  'use strict';

  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const FN = ['sin', 'cos', 'tan'];
  const ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180];
  const deg = d => d + '^\\circ';
  const tx = t => '$' + t + '$';
  const gcd = C.gcd;

  // ---------- 値 ----------
  // 鋭角の大きさ（辺の長さの2乗の比）．0° と 90° は別に
  const MAG = { 30: { sin: [1, 4], cos: [3, 4], tan: [1, 3] }, 45: { sin: [1, 2], cos: [1, 2], tan: [1, 1] }, 60: { sin: [3, 4], cos: [1, 4], tan: [3, 1] } };
  function value(f, d) {
    if (f === 'tan' && d === 90) return null;
    const r = d <= 90 ? d : 180 - d; // 基準の角（0°〜90°）
    let mag;
    if (r === 0) mag = { sin: [0, 1], cos: [1, 1], tan: [0, 1] }[f];
    else if (r === 90) mag = { sin: [1, 1], cos: [0, 1] }[f];
    else mag = MAG[r][f];
    if (mag[0] === 0) return { s: 0, n2: 0, d2: 1 };
    const s = f === 'sin' || d < 90 ? 1 : -1;
    return { s, n2: mag[0], d2: mag[1] };
  }
  const sameVal = (u, v) => u.s === v.s && (u.s === 0 || u.n2 * v.d2 === v.n2 * u.d2);
  // 値の TeX．rat なら有理化した形
  function valTex(v, rat) {
    if (v.s === 0) return '0';
    return (v.s < 0 ? '-' : '') + RL.form(v.n2, v.d2, !!rat).tex;
  }
  const hasRootDen = v => v.s !== 0 && C.simplifySqrt(RL.form(v.n2, v.d2, false).D2).m !== 1;
  const paren = t => (t.charAt(0) === '-' ? `\\left(${t}\\right)` : t);
  const sq = t => (/\\frac|\\sqrt|^-/.test(t) ? `\\left(${t}\\right)^2` : `${t}^2`);
  const fracTex = (n, d) => { const g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : `\\frac{${n}}{${d}}`; };
  const sqrtFracTex = (n, d) => { const g = gcd(n, d); n /= g; d /= g; return d === 1 ? `\\sqrt{${n}}` : `\\sqrt{\\frac{${n}}{${d}}}`; };

  // 角度を1つ読む：全角・°・度を許す．空欄 → null，読めない → NaN
  function readDeg(text) {
    const s = String(text || '')
      .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .replace(/[°度º˚\s]/g, '');
    if (s === '') return null;
    if (!/^\d+$/.test(s)) return NaN;
    return parseInt(s, 10);
  }

  // 符号つきの値の判定．ans = { a, b, c, d, numRoot, frac, denRoot, neg }，target = { s, n2, d2 }
  function judgeSigned(ans, target) {
    const plain = !ans.numRoot && !ans.frac;
    if (ans.a === 0) {
      if (target.s !== 0) return { status: 'wrong', hint: '' };
      return plain && !ans.neg ? { status: 'correct', hint: '' } : { status: 'form', hint: '0 はそのまま 0 と書きましょう（− も付けません）．' };
    }
    if (target.s === 0) {
      const filled = (ans.numRoot && ans.b != null) || (ans.frac && ans.c != null);
      if ((ans.a === null || ans.a === undefined) && !filled) return { status: 'empty', hint: '空いている欄があります．' };
      return Number.isNaN(ans.a) ? { status: 'invalid', hint: '整数を入れてください．' } : { status: 'wrong', hint: '' };
    }
    const r = C.judgeRatio(ans, { n: target.n2, d: target.d2 });
    if (r.status === 'invalid') return { status: 'invalid', hint: '分母と √ の中には 1 以上の整数を入れてください．' };
    if (r.status === 'empty' || r.status === 'wrong') return r;
    // 大きさは合っている．符号を確かめる
    if (!!ans.neg !== (target.s < 0)) {
      return { status: 'wrong', hint: target.s < 0 ? '符号を確かめましょう．この値は負です．' : '符号を確かめましょう．この値は正です．' };
    }
    if (r.note && target.s < 0) r.note = r.note.replace('有理化して ', '有理化して −');
    return r;
  }

  // ---------- ⑪ 0°〜180° の三角比の値 ----------
  function generateVal(rng) {
    rng = rng || Math.random;
    let d, f;
    do { d = pick(rng, ANGLES); f = pick(rng, FN); } while (f === 'tan' && d === 90);
    return { kind: 'wideVal', deg: d, fn: f, target: value(f, d) };
  }
  function valLines(p) {
    const d = p.deg, L = [];
    const x = valTex(value('cos', d)), y = valTex(value('sin', d));
    L.push({ text: `単位円の上で ${tx('\\angle\\mathrm{AOP} = ' + deg(d))} となる点 P の座標は ${tx(`(${x},\\ ${y})`)}．`, tex: '' });
    const def = { sin: 'y', cos: 'x', tan: '\\frac{y}{x}' }[p.fn];
    const ans = valTex(p.target);
    let mid = '';
    if (p.fn === 'tan' && p.target.s !== 0) mid = ` = ${y} \\div ${paren(x)}`;
    L.push({ text: '', tex: `\\${p.fn}\\,${deg(d)} = ${def}${mid} = ${ans}` });
    if (d > 90 && d < 180) {
      const r = 180 - d, sign = p.fn === 'sin' ? '' : '-';
      L.push({ text: '180° − θ の三角比を使っても求められる．', tex: `\\${p.fn}\\,${deg(d)} = \\${p.fn}(180^\\circ - ${deg(r)}) = ${sign}\\${p.fn}\\,${deg(r)} = ${ans}` });
    }
    return L;
  }

  // ---------- ⑫ 鈍角を 45° 以下の角で表す ----------
  // 答え ans = { neg, fn: 'sin'|'cos'|'tan'|'rtan', deg }
  function generateComp(rng) {
    rng = rng || Math.random;
    let d;
    do { d = 91 + Math.floor(rng() * 89); } while (d === 135); // 91〜179（135° は sin45° = cos45° で答えが2通りになるので除く）
    const f = pick(rng, FN);
    return Object.assign({ kind: 'wideComp', fn: f, deg: d }, compAnswer(f, d));
  }
  function compAnswer(f, d) {
    const a = 180 - d;
    if (a < 45) return { ans: { neg: f !== 'sin', fn: f, deg: a } };
    const b = d - 90; // = 90° − a
    return { ans: { neg: f !== 'sin', fn: { sin: 'cos', cos: 'sin', tan: 'rtan' }[f], deg: b } };
  }
  const fnTex = (f, d) => (f === 'rtan' ? `\\frac{1}{\\tan ${deg(d)}}` : `\\${f}\\,${deg(d)}`);
  const ansTex = a => (a.neg ? '-' : '') + fnTex(a.fn, a.deg);
  function judgeComp(p, ans) {
    const v = readDeg(ans.deg);
    if (!ans.fn) return { status: 'empty', hint: 'sin・cos・tan・1/tan のどれかを選んでください．' };
    if (v === null) return { status: 'empty', hint: '角度を入れてください．' };
    if (Number.isNaN(v)) return { status: 'invalid', hint: '角度は整数で入れてください（° は書かなくてよい）．' };
    const A = p.ans, neg = !!ans.neg;
    if (ans.fn === A.fn && v === A.deg && neg === A.neg) return { status: 'correct', hint: '' };
    if (ans.fn === p.fn && v === p.deg && !neg) return { status: 'form', hint: `そのままです．${p.deg}° = 180° − ${180 - p.deg}° と見て，45° 以下の角で表しましょう．` };
    if (ans.fn === A.fn && v === A.deg) return { status: 'wrong', hint: '符号を確かめましょう．180° − θ にすると sin はそのまま，cos と tan には − が付きます．' };
    const a = 180 - p.deg;
    if (a > 45 && ans.fn === p.fn && v === a) {
      return neg === A.neg
        ? { status: 'form', hint: `${a}° は 45° より大きい角です．${a}° = 90° − ${90 - a}° と見て，もう一度書きかえましょう．` }
        : { status: 'wrong', hint: '符号を確かめましょう．180° − θ にすると cos と tan には − が付きます．' };
    }
    return { status: 'wrong', hint: '' };
  }
  function compLines(p) {
    const f = p.fn, d = p.deg, a = 180 - d, sign = f === 'sin' ? '' : '-';
    const L = [{ text: `${tx('\\sin(180^\\circ - \\theta) = \\sin\\theta')}，${tx('\\cos(180^\\circ - \\theta) = -\\cos\\theta')}，${tx('\\tan(180^\\circ - \\theta) = -\\tan\\theta')} を使う．`, tex: '' }];
    if (a < 45) {
      L.push({ text: '', tex: `\\${f}\\,${deg(d)} = \\${f}(180^\\circ - ${deg(a)}) = ${ansTex(p.ans)}` });
    } else {
      const b = 90 - a;
      L.push({ text: `${a}° は 45° より大きいので，さらに 90° − θ の三角比で書きかえる．`, tex: `\\${f}\\,${deg(d)} = \\${f}(180^\\circ - ${deg(a)}) = ${sign}\\${f}\\,${deg(a)} = ${sign}\\${f}(90^\\circ - ${deg(b)}) = ${ansTex(p.ans)}` });
      L.push({ text: `別解：${tx('\\sin(90^\\circ + \\theta) = \\cos\\theta')}，${tx('\\cos(90^\\circ + \\theta) = -\\sin\\theta')}，${tx('\\tan(90^\\circ + \\theta) = -\\frac{1}{\\tan\\theta}')} から`, tex: `\\${f}\\,${deg(d)} = \\${f}(90^\\circ + ${deg(b)}) = ${ansTex(p.ans)}` });
    }
    return L;
  }

  // ---------- ⑬ 三角方程式 ----------
  // 三角比ごとに，値が同じになる角をまとめる
  const GROUPS = {};
  FN.forEach(f => {
    GROUPS[f] = [];
    ANGLES.forEach(d => {
      const v = value(f, d);
      if (!v) return;
      const g = GROUPS[f].find(x => sameVal(x.v, v));
      if (g) g.angles.push(d); else GROUPS[f].push({ v, angles: [d] });
    });
  });
  function generateEq(rng) {
    rng = rng || Math.random;
    const f = pick(rng, FN);
    // 0°・90°・180° を含む値（0，±1 など）は少なめに
    const gs = GROUPS[f], w = gs.map(g => (g.angles.some(d => d % 90 === 0) ? 0.35 : 1));
    let t = rng() * w.reduce((x, y) => x + y, 0), i = 0;
    while (t > w[i]) { t -= w[i]; i++; }
    const g = gs[Math.min(i, gs.length - 1)];
    return Object.assign({ kind: 'eq', fn: f, v: g.v, angles: g.angles.slice() }, eqForm(f, g.v, rng));
  }
  // 方程式の書き方：そのまま（sinθ = 1/2）／分母を払う（2sinθ = 1）／右辺を 0 に（2sinθ − 1 = 0）
  function eqForm(f, v, rng) {
    const F = `\\${f}\\theta`;
    if (v.s === 0) return { form: 'plain', eqTex: `${F} = 0` };
    const fm = RL.form(v.n2, v.d2, false);
    const num = C.sqrtTex(fm.N2), den = C.sqrtTex(fm.D2);
    const r = rng();
    if (r < 0.4 || (fm.D2 === 1 && r < 0.6)) {
      const rat = hasRootDen(v) && rng() < 0.35;
      return { form: 'plain', eqTex: `${F} = ${valTex(v, rat)}`, rat };
    }
    const coef = fm.D2 === 1 ? '' : den;
    if (fm.D2 !== 1 && r < 0.7) return { form: 'coef', eqTex: `${coef}${F} = ${v.s < 0 ? '-' : ''}${num}` };
    return { form: 'zero', eqTex: `${coef}${F} ${v.s > 0 ? '-' : '+'} ${num} = 0` };
  }
  // ans：入力した角度の文字列の配列
  function judgeEq(p, list) {
    const vals = list.map(readDeg).filter(v => v !== null);
    if (!vals.length) return { status: 'empty', hint: '角度を入れてください．' };
    if (vals.some(v => Number.isNaN(v))) return { status: 'invalid', hint: '角度は整数で入れてください（° は書かなくてよい）．' };
    if (vals.some(v => v > 180)) return { status: 'invalid', hint: 'θ は 0° 以上 180° 以下の角です．' };
    const set = Array.from(new Set(vals));
    if (vals.length > set.length) return { status: 'form', hint: '同じ角が2つ入っています．' };
    const wrong = set.filter(v => p.angles.indexOf(v) < 0);
    if (!wrong.length) {
      if (set.length === p.angles.length) return { status: 'correct', hint: '' };
      return { status: 'form', hint: 'ほかにも答えがあります．0° ≦ θ ≦ 180° の中で，もう1つ探しましょう（「＋もう1つ」で欄を増やせます）．' };
    }
    // 0°・180° が答えの値（±1，0）では「鋭角／鈍角」と言えないので案内しない
    if ((p.fn === 'cos' || p.fn === 'tan') && p.angles.every(d => d % 90 !== 0) && wrong.some(v => p.angles.indexOf(180 - v) >= 0)) {
      return { status: 'wrong', hint: `${p.fn} θ が${p.v.s < 0 ? '負なら θ は鈍角' : '正なら θ は鋭角'}です．` };
    }
    return { status: 'wrong', hint: '' };
  }
  function eqLines(p) {
    const L = [];
    const v = valTex(p.v, p.rat); // 与えた形のまま（有理化してあればそのまま）
    // プリントと同じ「2sinθ = 1　よって sinθ = 1/2　したがって θ = …」の順
    if (p.form !== 'plain') L.push({ text: 'よって', tex: `\\${p.fn}\\theta = ${v}` });
    const where = { sin: `y 座標が ${tx(v)}`, cos: `x 座標が ${tx(v)}`, tan: `直線 OP の傾きが ${tx(v)}` }[p.fn];
    const two = p.angles.length === 2;
    L.push({ text: `単位円の上で，${where} となる点を${two ? ' P，Q とする．θ は図の ' + tx('\\angle\\mathrm{AOP}') + ' と ' + tx('\\angle\\mathrm{AOQ}') : ' P とする．θ は図の ' + tx('\\angle\\mathrm{AOP}')}．`, tex: '' });
    L.push({ text: 'したがって', tex: `\\theta = ${p.angles.map(deg).join(',\\ ')}` });
    return L;
  }

  // ---------- ⑭ 直線の傾き ----------
  const SLOPE_ANGLES = [30, 45, 60, 120, 135, 150];
  function slopeTex(v, rat) {
    // 傾きを x の係数として書く（1 → x，−1 → −x）
    if (v.n2 === v.d2) return (v.s < 0 ? '-' : '') + 'x';
    return valTex(v, rat) + 'x';
  }
  function generateSlope(rng) {
    rng = rng || Math.random;
    const d = pick(rng, SLOPE_ANGLES), m = value('tan', d);
    if (rng() < 0.5) {
      const rat = hasRootDen(m) && rng() < 0.3;
      const b = rng() < 0.6 ? 0 : pick(rng, [1, -1, 2, -2, 3]);
      const lineTex = `y = ${slopeTex(m, rat)}${b ? (b > 0 ? ' + ' : ' - ') + Math.abs(b) : ''}`;
      return { kind: 'slope', sub: 'angle', deg: d, m, lineTex, b, rat };
    }
    return { kind: 'slope', sub: 'slope', deg: d, m, target: m };
  }
  function judgeSlopeAngle(p, text) {
    const v = readDeg(text);
    if (v === null) return { status: 'empty', hint: '角度を入れてください．' };
    if (Number.isNaN(v)) return { status: 'invalid', hint: '角度は整数で入れてください（° は書かなくてよい）．' };
    if (v === p.deg) return { status: 'correct', hint: '' };
    if (v === 180 - p.deg) return { status: 'wrong', hint: '傾きが正なら θ は鋭角，負なら θ は鈍角です．' };
    return { status: 'wrong', hint: '' };
  }
  function slopeLines(p) {
    const m = valTex(p.m);
    if (p.sub === 'slope') return [{ text: '直線の傾きは tan θ に等しいので，求める直線の傾きは', tex: `\\tan ${deg(p.deg)} = ${m}` }];
    const L = [{ text: `直線の傾きが ${tx(m)} であるから`, tex: `\\tan\\theta = ${m}` }];
    if (p.b) L.push({ text: 'y 切片を変えても，直線は上下に平行移動するだけなので，角は変わらない．', tex: '' });
    L.push({ text: 'よって，x 軸の正の向きとのなす角 θ は', tex: `\\theta = ${deg(p.deg)}` });
    return L;
  }

  // ---------- ⑮ 1つから残りの2つ（0° ≦ θ ≦ 180°） ----------
  function generateRel2(rng) {
    rng = rng || Math.random;
    const base = RL.generateRelation(rng);
    const obtuse = rng() < 0.6;
    return fromBase(base, obtuse);
  }
  // relation.js の問題（鋭角）に符号を付ける
  function fromBase(base, obtuse) {
    const sg = obtuse ? -1 : 1;
    const targets = {
      sin: { s: 1, n2: base.opp2, d2: base.hyp2 },
      cos: { s: sg, n2: base.adj2, d2: base.hyp2 },
      tan: { s: sg, n2: base.opp2, d2: base.adj2 }
    };
    const neg = obtuse && base.given !== 'sin' ? '-' : '';
    return {
      kind: 'rel2', given: base.given, obtuse, asks: base.asks, rationalized: base.rationalized,
      givenTex: neg + base.givenTex, givenRecip: base.givenRecip, targets, base
    };
  }
  function rel2Lines(p) {
    const r = p.rationalized, t = p.targets;
    const mag = k => {
      const both = C.simplifySqrt(RL.form(t[k].n2, t[k].d2, false).N2).m !== 1 && C.simplifySqrt(RL.form(t[k].n2, t[k].d2, false).D2).m !== 1;
      const fm = RL.form(t[k].n2, t[k].d2, !!r || both);
      return { tex: fm.tex, recip: fm.recipTex };
    };
    const signed = (k, x) => (t[k].s < 0 ? '-' : '') + x;
    const sinT = signed('sin', mag('sin').tex), cosT = signed('cos', mag('cos').tex), tanT = signed('tan', mag('tan').tex);
    const g = p.givenTex, L = [];
    const red = k => { const gg = gcd(t[k].n2, t[k].d2); return [t[k].n2 / gg, t[k].d2 / gg]; };
    if (p.given === 'sin') {
      const [n, d] = red('cos');
      L.push({ text: `${tx('\\sin^2\\theta + \\cos^2\\theta = 1')} から`, tex: `\\cos^2\\theta = 1 - \\sin^2\\theta = 1 - ${sq(g)} = ${fracTex(n, d)}` });
      L.push({ text: p.obtuse ? `${tx('90^\\circ < \\theta < 180^\\circ')} であるから，${tx('\\cos\\theta < 0')}` : `${tx('0^\\circ < \\theta < 90^\\circ')} であるから，${tx('\\cos\\theta > 0')}`, tex: `\\cos\\theta = ${p.obtuse ? '-' : ''}${sqrtFracTex(n, d)} = ${cosT}` });
      const recip = signed('cos', mag('cos').recip);
      L.push({ text: 'また', tex: `\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta} = ${g} \\div ${paren(cosT)} = ${g} \\times ${paren(recip)} = ${tanT}` });
    } else if (p.given === 'cos') {
      const [n, d] = red('sin');
      L.push({ text: `${tx('\\sin^2\\theta + \\cos^2\\theta = 1')} から`, tex: `\\sin^2\\theta = 1 - \\cos^2\\theta = 1 - ${sq(g)} = ${fracTex(n, d)}` });
      L.push({ text: `${tx('0^\\circ \\leqq \\theta \\leqq 180^\\circ')} のとき ${tx('\\sin\\theta \\geqq 0')} であるから`, tex: `\\sin\\theta = ${sqrtFracTex(n, d)} = ${sinT}` });
      const recip = (p.obtuse ? '-' : '') + p.givenRecip;
      L.push({ text: 'また', tex: `\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta} = ${sinT} \\div ${paren(g)} = ${sinT} \\times ${paren(recip)} = ${tanT}` });
    } else {
      const [n, d] = red('cos');
      L.push({ text: '', tex: `\\frac{1}{\\cos^2\\theta} = 1 + \\tan^2\\theta = 1 + ${sq(g)} = ${fracTex(d, n)}` });
      L.push({ text: 'よって', tex: `\\cos^2\\theta = ${fracTex(n, d)}` });
      L.push({
        text: p.obtuse ? `${tx('\\tan\\theta < 0')} より ${tx('90^\\circ < \\theta < 180^\\circ')} であるから ${tx('\\cos\\theta < 0')}` : `${tx('\\tan\\theta > 0')} より ${tx('0^\\circ < \\theta < 90^\\circ')} であるから ${tx('\\cos\\theta > 0')}`,
        tex: ''
      });
      L.push({ text: 'ゆえに', tex: `\\cos\\theta = ${p.obtuse ? '-' : ''}${sqrtFracTex(n, d)} = ${cosT}` });
      L.push({ text: 'また', tex: `\\sin\\theta = \\tan\\theta\\cos\\theta = ${paren(g)} \\times ${paren(cosT)} = ${sinT}` });
    }
    return L;
  }

  // ---------- ⑯ 式の値（180° − θ） ----------
  const SMALL = [5, 10, 15, 20, 25, 35, 40]; // 30° は有名角の値で計算できてしまうので外す
  const EXPR = {
    // sin(90° − a)cos(180° − a) − cos(90° − a)sin(180° − a) = −1 など
    prod(rng) {
      const a = pick(rng, SMALL), P = 90 - a, Q = 180 - a, A = deg(a);
      const eqs = {
        sinP: `\\sin ${deg(P)} = \\sin(90^\\circ - ${A}) = \\cos ${A}`,
        cosP: `\\cos ${deg(P)} = \\cos(90^\\circ - ${A}) = \\sin ${A}`,
        sinQ: `\\sin ${deg(Q)} = \\sin(180^\\circ - ${A}) = \\sin ${A}`,
        cosQ: `\\cos ${deg(Q)} = \\cos(180^\\circ - ${A}) = -\\cos ${A}`
      };
      if (rng() < 0.8) {
        return {
          tex: `\\sin ${deg(P)}\\cos ${deg(Q)} - \\cos ${deg(P)}\\sin ${deg(Q)}`, value: -1,
          lines: [eqs.sinP, eqs.cosQ, eqs.cosP, eqs.sinQ].map(t => ({ text: '', tex: t })).concat([
            { text: 'よって', tex: `\\text{与式} = \\cos ${A}(-\\cos ${A}) - \\sin ${A}\\sin ${A}` },
            { text: '', tex: `= -(\\cos^2 ${A} + \\sin^2 ${A}) = -1` }
          ])
        };
      }
      return {
        tex: `\\sin ${deg(P)}\\sin ${deg(Q)} + \\cos ${deg(P)}\\cos ${deg(Q)}`, value: 0,
        lines: [eqs.sinP, eqs.sinQ, eqs.cosP, eqs.cosQ].map(t => ({ text: '', tex: t })).concat([
          { text: 'よって', tex: `\\text{与式} = \\cos ${A}\\sin ${A} + \\sin ${A}(-\\cos ${A}) = 0` }
        ])
      };
    },
    // sin20° + sin70° + cos110° + cos160° = 0 など
    sum4(rng) {
      const a = pick(rng, SMALL), B = 90 - a, Cc = 90 + a, Dd = 180 - a, A = deg(a);
      const cosC = `\\cos ${deg(Cc)} = \\cos(180^\\circ - ${deg(B)}) = -\\cos ${deg(B)} = -\\cos(90^\\circ - ${A}) = -\\sin ${A}`;
      const cosD = `\\cos ${deg(Dd)} = \\cos(180^\\circ - ${A}) = -\\cos ${A}`;
      if (rng() < 0.6) {
        return {
          tex: `\\sin ${A} + \\sin ${deg(B)} + \\cos ${deg(Cc)} + \\cos ${deg(Dd)}`, value: 0,
          lines: [`\\sin ${deg(B)} = \\sin(90^\\circ - ${A}) = \\cos ${A}`, cosC, cosD].map(t => ({ text: '', tex: t })).concat([
            { text: 'よって', tex: `\\text{与式} = \\sin ${A} + \\cos ${A} - \\sin ${A} - \\cos ${A} = 0` }
          ])
        };
      }
      return {
        tex: `\\cos ${A} + \\cos ${deg(B)} + \\cos ${deg(Cc)} + \\cos ${deg(Dd)}`, value: 0,
        lines: [`\\cos ${deg(B)} = \\cos(90^\\circ - ${A}) = \\sin ${A}`, cosC, cosD].map(t => ({ text: '', tex: t })).concat([
          { text: 'よって', tex: `\\text{与式} = \\cos ${A} + \\sin ${A} - \\sin ${A} - \\cos ${A} = 0` }
        ])
      };
    },
    // 1/tan²50° − 1/cos²40° = −1 など
    tanCos(rng) {
      const a = pick(rng, SMALL), B = 90 - a, A = deg(a);
      const flip = rng() < 0.3; // 引く順を逆に（答えは 1）
      if (rng() < 0.55) {
        const t1 = `\\frac{1}{\\tan^2 ${deg(B)}}`, t2 = `\\frac{1}{\\cos^2 ${A}}`;
        return {
          tex: flip ? `${t2} - ${t1}` : `${t1} - ${t2}`, value: flip ? 1 : -1,
          lines: [
            { text: '', tex: `${t1} = \\frac{1}{\\tan^2(90^\\circ - ${A})} = \\tan^2 ${A}` },
            { text: '', tex: `${t2} = 1 + \\tan^2 ${A}` },
            { text: 'よって', tex: flip ? `\\text{与式} = (1 + \\tan^2 ${A}) - \\tan^2 ${A} = 1` : `\\text{与式} = \\tan^2 ${A} - (1 + \\tan^2 ${A}) = -1` }
          ]
        };
      }
      // 鈍角を使う形：1/tan²(90° + a) − 1/cos²(180° − a)
      const Cc = 90 + a, Dd = 180 - a;
      const t1 = `\\frac{1}{\\tan^2 ${deg(Cc)}}`, t2 = `\\frac{1}{\\cos^2 ${deg(Dd)}}`;
      return {
        tex: flip ? `${t2} - ${t1}` : `${t1} - ${t2}`, value: flip ? 1 : -1,
        lines: [
          { text: '', tex: `\\tan ${deg(Cc)} = \\tan(180^\\circ - ${deg(B)}) = -\\tan ${deg(B)} = -\\tan(90^\\circ - ${A}) = -\\frac{1}{\\tan ${A}}` },
          { text: 'よって', tex: `${t1} = \\tan^2 ${A}` },
          { text: '', tex: `\\cos ${deg(Dd)} = \\cos(180^\\circ - ${A}) = -\\cos ${A}` },
          { text: 'よって', tex: `${t2} = \\frac{1}{\\cos^2 ${A}} = 1 + \\tan^2 ${A}` },
          { text: 'したがって', tex: flip ? `\\text{与式} = (1 + \\tan^2 ${A}) - \\tan^2 ${A} = 1` : `\\text{与式} = \\tan^2 ${A} - (1 + \\tan^2 ${A}) = -1` }
        ]
      };
    }
  };
  const EXPR_KEYS = Object.keys(EXPR);
  // 答えが 0 に偏らないように，いつも 0 になる sum4 は少なめに
  const EXPR_W = { prod: 0.45, sum4: 0.2, tanCos: 0.35 };
  function generateExpr2(rng) {
    rng = rng || Math.random;
    let t = rng(), type = EXPR_KEYS[EXPR_KEYS.length - 1];
    for (const k of EXPR_KEYS) { if (t < EXPR_W[k]) { type = k; break; } t -= EXPR_W[k]; }
    const e = EXPR[type](rng);
    const target = e.value === 0 ? { s: 0, n2: 0, d2: 1 } : { s: Math.sign(e.value), n2: 1, d2: 1 };
    return { kind: 'expr2', type, tex: e.tex, value: e.value, target, lines: e.lines };
  }

  // ---------- 単位円の図（半円） ----------
  // opts: { pts: [deg...], hline: { y, tex }, vline: { x, tex }, line: { deg } , coord: { deg, tex } }
  // 戻り値：{ W, H, svg（文字列）, labels: [{ p:[x,y], tex, cls }] }
  const SW = 360, SH = 230, O = [180, 190], R = 130;
  const RAD = Math.PI / 180;
  const at = (x, y) => [O[0] + R * x, O[1] - R * y];
  function semicircle(opts) {
    const f = v => v.toFixed(1);
    const seg = (a, b, cls) => `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" class="${cls}"/>`;
    let svg = '';
    const labels = [];
    // 軸と半円
    svg += seg([22, O[1]], [SW - 16, O[1]], 'uc-axis') + seg([O[0], O[1] + 14], [O[0], 14], 'uc-axis');
    svg += `<path d="M ${SW - 16} ${O[1]} l -8 -4 v 8 z" class="uc-arrow"/><path d="M ${O[0]} 14 l -4 8 h 8 z" class="uc-arrow"/>`;
    svg += `<path d="M ${f(O[0] + R)} ${O[1]} A ${R} ${R} 0 0 0 ${f(O[0] - R)} ${O[1]}" class="uc-circle"/>`;
    labels.push({ p: [O[0] - 10, O[1] + 14], tex: '\\mathrm{O}', cls: 'uc-lbl' });
    labels.push({ p: [O[0] + R + 4, O[1] + 14], tex: '1', cls: 'uc-lbl' });
    labels.push({ p: [O[0] - R - 2, O[1] + 14], tex: '-1', cls: 'uc-lbl' });
    labels.push({ p: [O[0] - 10, O[1] - R - 10], tex: '1', cls: 'uc-lbl' });
    labels.push({ p: [SW - 12, O[1] + 14], tex: 'x', cls: 'uc-lbl' });
    // A(1, 0)．P が A に重なる 0° のときは書かない
    if (!(opts.pts || []).some(d => d === 0)) labels.push({ p: [O[0] + R + 12, O[1] - 12], tex: '\\mathrm{A}', cls: 'uc-lbl uc-pt' });
    labels.push({ p: [O[0] + 12, 16], tex: 'y', cls: 'uc-lbl' });
    if (opts.hline) {
      const y = opts.hline.y;
      // y = 0 は x 軸そのものなので線も文字も描かない
      if (y !== 0) {
        svg += seg(at(-1.15, y), at(1.15, y), 'uc-guide');
        // 文字は線の下，右寄り（点 P の文字は線の上に来る）
        labels.push({ p: [SW - 36, at(0, y)[1] + 18], tex: opts.hline.tex, cls: 'uc-lbl uc-val' });
      }
    }
    if (opts.vline) {
      const x = opts.vline.x;
      svg += seg(at(x, 0), at(x, 1.08), 'uc-guide');
      labels.push({ p: [at(x, 0)[0], O[1] + 22], tex: opts.vline.tex, cls: 'uc-lbl uc-val' });
    }
    if (opts.line) {
      // 原点を通る直線（傾き tan θ）．半円の外まで少し伸ばす
      const c = Math.cos(opts.line.deg * RAD), s = Math.sin(opts.line.deg * RAD);
      svg += seg(at(-0.3 * c, -0.3 * s), at(1.25 * c, 1.25 * s), 'uc-guide');
    }
    (opts.pts || []).forEach((d, i) => {
      const c = d === 90 ? 0 : Math.cos(d * RAD), s = d === 0 || d === 180 ? 0 : Math.sin(d * RAD);
      const P = at(c, s);
      svg += seg(O, P, 'uc-radius');
      svg += `<circle cx="${f(P[0])}" cy="${f(P[1])}" r="4.5" class="uc-dot"/>`;
      if (d > 0) {
        const rr = 20 + 9 * i;
        const a0 = at(rr / R, 0), a1 = [O[0] + rr * c, O[1] - rr * s];
        svg += `<path d="M ${f(a0[0])} ${f(a0[1])} A ${rr} ${rr} 0 0 0 ${f(a1[0])} ${f(a1[1])}" class="uc-arc"/>`;
        // 角の文字：30° 未満や 150° 超の細い角は弧の外へ
        const m = d / 2, lr = rr + (d < 40 || d > 140 ? 30 : 20);
        labels.push({ p: [O[0] + lr * Math.cos(m * RAD) + (d > 140 ? 0 : 6), O[1] - lr * Math.sin(m * RAD) - (d < 40 ? 4 : 0)], tex: deg(d), cls: 'uc-lbl uc-ang' });
      }
      if (opts.coord) {
        // 座標つきの P は，半円の内側へ寄せて上に書く（左右の端で枠からはみ出さないように）
        // 60°・120° は y 軸の「1」とぶつかるので外側へ
        const dx = Math.abs(c) < 0.2 ? 52 : Math.abs(c) < 0.6 ? (c > 0 ? 50 : -50) : (c > 0 ? -34 : 34);
        labels.push({ p: [P[0] + dx, P[1] - (Math.abs(c) < 0.6 && Math.abs(c) >= 0.2 ? 14 : 22)], tex: '\\mathrm{P}' + opts.coord.tex, cls: 'uc-lbl uc-pt' });
      } else {
        // 直線を引く図では，P の文字を直線から垂直な向きに離す
        const off = opts.line ? (c >= 0 ? [-s, c] : [s, -c]) : null;
        labels.push({ p: off ? [P[0] + 22 * off[0], P[1] - 22 * off[1]] : [P[0] + (c >= 0 ? 12 : -12), P[1] - 12], tex: i === 0 ? '\\mathrm{P}' : '\\mathrm{Q}', cls: 'uc-lbl uc-pt' });
      }
    });
    return { W: SW, H: SH, svg, labels };
  }
  // 問題ごとの図
  function sceneFor(p) {
    if (p.kind === 'eq') {
      const v = p.v.s * Math.sqrt(p.v.n2 / p.v.d2), vt = valTex(p.v, p.rat);
      if (p.fn === 'sin') return semicircle({ pts: p.angles, hline: { y: v, tex: 'y = ' + vt } });
      if (p.fn === 'cos') return semicircle({ pts: p.angles, vline: { x: v, tex: 'x = ' + vt } });
      return semicircle({ pts: p.angles, line: { deg: p.angles[0] === 180 ? 0 : p.angles[0] } });
    }
    if (p.kind === 'wideVal') {
      const d = p.deg;
      return semicircle({ pts: [d], coord: { tex: `(${valTex(value('cos', d))},\\ ${valTex(value('sin', d))})` } });
    }
    if (p.kind === 'slope') return semicircle({ pts: [p.deg], line: { deg: p.deg } });
    return null;
  }

  return {
    ANGLES, FN, value, valTex, sameVal, readDeg, judgeSigned,
    generateVal, valLines,
    generateComp, compAnswer, judgeComp, compLines, ansTex,
    GROUPS, generateEq, eqForm, judgeEq, eqLines,
    SLOPE_ANGLES, generateSlope, judgeSlopeAngle, slopeLines,
    generateRel2, fromBase, rel2Lines,
    EXPR_KEYS, generateExpr2,
    semicircle, sceneFor
  };
}));
