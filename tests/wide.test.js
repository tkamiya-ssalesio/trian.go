// node tests/wide.test.js で実行する．失敗があれば exit 1．
const W = require('../wide.js');
const R = require('../relation.js');

let fails = 0;
function ok(cond, msg) { if (!cond) { fails++; if (fails <= 30) console.error('NG:', msg); } }
const rad = Math.PI / 180;
const fnv = { sin: x => Math.sin(x * rad), cos: x => Math.cos(x * rad), tan: x => Math.tan(x * rad) };
const num = v => v.s * Math.sqrt(v.n2 / v.d2);
// 答えの入力 a√b/(c√d)，neg で −
const ans = (neg, a, b, c, d) => ({ a, b, c, d, numRoot: b !== 1, frac: c !== 1 || d !== 1, denRoot: d !== 1, neg });
const zero = () => ({ a: 0, b: null, c: null, d: null, numRoot: false, frac: false, denRoot: false, neg: false });

// 1. 04-05［1］：0°〜180° の表
for (const d of W.ANGLES) for (const f of W.FN) {
  const v = W.value(f, d);
  if (f === 'tan' && d === 90) { ok(v === null, 'tan90° は値なし'); continue; }
  ok(Math.abs(num(v) - fnv[f](d)) < 1e-9, `値 ${f}${d}° = ${num(v)}`);
}
const st = (v, a) => W.judgeSigned(a, v).status;
ok(st(W.value('cos', 150), ans(true, 1, 3, 2, 1)) === 'correct', 'cos150° = −√3/2');
ok(st(W.value('cos', 150), ans(false, 1, 3, 2, 1)) === 'wrong', '符号なしは不正解');
ok(/負/.test(W.judgeSigned(ans(false, 1, 3, 2, 1), W.value('cos', 150)).hint), '符号の案内');
ok(st(W.value('tan', 150), ans(true, 1, 1, 1, 3)) === 'correct' && st(W.value('tan', 150), ans(true, 1, 3, 3, 1)) === 'correct', 'tan150° = −1/√3 = −√3/3');
ok(st(W.value('tan', 120), ans(true, 1, 3, 1, 1)) === 'correct', 'tan120° = −√3');
ok(st(W.value('cos', 180), ans(true, 1, 1, 1, 1)) === 'correct', 'cos180° = −1');
ok(st(W.value('sin', 0), zero()) === 'correct' && st(W.value('sin', 180), zero()) === 'correct' && st(W.value('cos', 90), zero()) === 'correct', '0 は正解');
ok(st(W.value('sin', 0), Object.assign(zero(), { neg: true })) === 'form', '−0 は書き方ミス');
ok(st(W.value('sin', 30), zero()) === 'wrong' && st(W.value('sin', 0), ans(false, 1, 1, 1, 1)) === 'wrong', '0 との取り違え');
ok(st(W.value('cos', 135), ans(true, 2, 1, 2, 2)) === 'form', '−2/(2√2) は約分できる');
ok(st(W.value('cos', 135), ans(true, 1, 2, 2, 1)) === 'correct', '−√2/2 は正解');

// 2. 04-05［2］：45° 以下の角で表す
[['sin', 156, false, 'sin', 24], ['cos', 156, true, 'cos', 24], ['tan', 156, true, 'tan', 24],
 ['sin', 110, false, 'cos', 20], ['cos', 93, true, 'sin', 3], ['tan', 117, true, 'rtan', 27]].forEach(([f, d, neg, af, ad]) => {
  const p = Object.assign({ kind: 'wideComp', fn: f, deg: d }, W.compAnswer(f, d));
  const s = (n, fn, dd) => W.judgeComp(p, { neg: n, fn, deg: String(dd) }).status;
  ok(s(neg, af, ad) === 'correct', `プリント04-05［2］ ${f}${d}° = ${neg ? '−' : ''}${af}${ad}°`);
  ok(s(!neg, af, ad) === 'wrong', '符号ちがいは不正解 ' + f + d);
  ok(s(false, f, d) === 'form', 'そのまま書いたら書き方ミス ' + f + d);
  if (180 - d > 45) ok(s(neg, f, 180 - d) === 'form', 'まだ 45° より大きい ' + f + d);
  const L = W.compLines(p);
  ok(L.every(l => !/undefined|NaN/.test(l.text + l.tex)), '解説');
});

// 3. 04-06［1］［2］：三角方程式
const eqOf = (f, v) => {
  const g = W.GROUPS[f].find(x => W.sameVal(x.v, v));
  return { kind: 'eq', fn: f, v: g.v, angles: g.angles, form: 'plain', eqTex: '' };
};
const se = (p, list) => W.judgeEq(p, list).status;
const sv = (s, n2, d2) => ({ s, n2, d2 });
[[eqOf('sin', sv(1, 1, 2)), ['45', '135']], [eqOf('cos', sv(-1, 3, 4)), ['150']], [eqOf('tan', sv(-1, 1, 1)), ['135']],
 [eqOf('sin', sv(1, 1, 2)), ['135', '45']], [eqOf('cos', sv(1, 1, 4)), ['60']], [eqOf('sin', sv(1, 1, 4)), ['30', '150']],
 [eqOf('tan', sv(1, 1, 3)), ['30']], [eqOf('sin', sv(0, 0, 1)), ['0', '180']], [eqOf('sin', sv(1, 1, 1)), ['90']]]
  .forEach(([p, a]) => ok(se(p, a) === 'correct', `三角方程式 ${p.fn}=${JSON.stringify(p.v)} → ${a}`));
ok(se(eqOf('sin', sv(1, 1, 2)), ['45']) === 'form', '1つだけは「ほかにもある」');
ok(se(eqOf('sin', sv(1, 1, 2)), ['45', '']) === 'form', '2つ目が空欄でも同じ');
ok(se(eqOf('sin', sv(1, 1, 2)), ['45', '45']) === 'form', '同じ角を2回');
ok(se(eqOf('sin', sv(1, 1, 1)), ['90', '90']) === 'form', '答えが1つでも同じ角を2回は書き方ミス');
ok(st(W.value('sin', 180), { a: null, b: 3, c: null, d: null, numRoot: true, frac: false, denRoot: false, neg: false }) === 'wrong', '0 の問題に √3 は不正解（空欄ではない）');
ok(se(eqOf('cos', sv(-1, 3, 4)), ['30']) === 'wrong' && /鈍角/.test(W.judgeEq(eqOf('cos', sv(-1, 3, 4)), ['30']).hint), 'cos が負なら鈍角の案内');
ok(se(eqOf('cos', sv(-1, 3, 4)), ['150', '30']) === 'wrong', '余分な角は不正解');
ok(se(eqOf('cos', sv(-1, 3, 4)), ['', '']) === 'empty' && se(eqOf('cos', sv(-1, 3, 4)), ['200']) === 'invalid', '空欄と範囲外');
// 方程式の書き方：解が変わらない
const Rng = seed => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
{
  const rng = Rng(7);
  for (let i = 0; i < 3000; i++) {
    const p = W.generateEq(rng);
    // 方程式の TeX を数に直して，答えの角で成り立つか
    const js = p.eqTex.replace(/\\(sin|cos|tan)\\theta/g, 'F.$1(t)').replace(/\\sqrt\{(\d+)\}/g, 'Math.sqrt($1)')
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))').replace(/(\d|\))\s*(?=Math|F\.|\()/g, '$1*').replace(/=/, '-(') + ')';
    for (const d of p.angles) {
      const val = Function('F', 't', 'return ' + js)(fnv, d);
      ok(Math.abs(val) < 1e-9, `方程式 ${p.eqTex} が θ=${d} で成り立たない（${js}）`);
    }
    // 答えになる角は表の角すべての中でちょうどこれだけ
    const all = W.ANGLES.filter(d => !(p.fn === 'tan' && d === 90) && W.sameVal(W.value(p.fn, d), p.v));
    ok(all.join() === p.angles.join(), '解の数 ' + p.eqTex);
    ok(se(p, p.angles.map(String)) === 'correct', '正解');
    ok(W.eqLines(p).every(l => !/undefined|NaN/.test(l.text + l.tex)), '方程式の解説');
    ok(W.sceneFor(p).labels.every(l => l.p[0] >= 0 && l.p[0] <= 360 && l.p[1] >= 0 && l.p[1] <= 230), '図のラベルが枠外 ' + p.eqTex);
  }
}

// 4. 04-06［3］〜［5］：直線の傾き
const sl = (d, lineTex) => ({ kind: 'slope', sub: 'angle', deg: d, m: W.value('tan', d), lineTex, b: 0 });
ok(W.judgeSlopeAngle(sl(45), '45').status === 'correct' && W.judgeSlopeAngle(sl(150), '150').status === 'correct', 'プリント［3］');
ok(W.judgeSlopeAngle(sl(150), '30').status === 'wrong' && /鈍角/.test(W.judgeSlopeAngle(sl(150), '30').hint), '傾きが負なのに鋭角');
ok(st(W.value('tan', 60), ans(false, 1, 3, 1, 1)) === 'correct' && st(W.value('tan', 45), ans(false, 1, 1, 1, 1)) === 'correct' && st(W.value('tan', 120), ans(true, 1, 3, 1, 1)) === 'correct', 'プリント［5］');
{
  const rng = Rng(11);
  for (let i = 0; i < 2000; i++) {
    const p = W.generateSlope(rng);
    if (p.sub === 'angle') {
      // y = mx + b の m を読み直して tan と比べる
      const coef = p.lineTex.replace(/^y = /, '').replace(/ [+-] \d+$/, '').replace(/x$/, '');
      const m = coef === '' ? 1 : coef === '-' ? -1 : Function('return ' + coef.replace(/\\sqrt\{(\d+)\}/g, 'Math.sqrt($1)').replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))').replace(/(\d|\))(?=Math|\()/g, '$1*'))();
      ok(Math.abs(m - Math.tan(p.deg * rad)) < 1e-9, '直線の傾き ' + p.lineTex);
      ok(W.judgeSlopeAngle(p, String(p.deg)).status === 'correct', '角');
    }
    ok(W.slopeLines(p).every(l => !/undefined|NaN/.test(l.text + l.tex)), '傾きの解説');
  }
}

// 5. 04-07［1］［2］：0° ≦ θ ≦ 180° の相互関係
// [与える, 値², 分母², 鈍角か, 与える形, { 答え: [neg, a, b, c, d] }]
const cases = [
  ['sin', 1, 16, false, '\\frac{1}{4}', { cos: [false, 1, 15, 4, 1], tan: [false, 1, 1, 1, 15] }],
  ['sin', 1, 16, true, '\\frac{1}{4}', { cos: [true, 1, 15, 4, 1], tan: [true, 1, 1, 1, 15] }],
  ['sin', 4, 25, true, '\\frac{2}{5}', { cos: [true, 1, 21, 5, 1], tan: [true, 2, 1, 1, 21] }],
  ['cos', 9, 25, true, '-\\frac{3}{5}', { sin: [false, 4, 1, 5, 1], tan: [true, 4, 1, 3, 1] }],
  ['tan', 36, 1, false, '6', { sin: [false, 6, 1, 1, 37], cos: [false, 1, 1, 1, 37] }],
  ['tan', 4, 5, true, '-\\frac{2}{\\sqrt{5}}', { sin: [false, 2, 1, 3, 1], cos: [true, 1, 5, 3, 1] }]
];
for (const [g, n, d, ob, tex, answers] of cases) {
  const p = W.fromBase(R.build(g, n, d, false), ob);
  ok(p.givenTex === tex, `与える形 ${p.givenTex}（プリントは ${tex}）`);
  for (const [k, a] of Object.entries(answers)) ok(st(p.targets[k], ans(...a)) === 'correct', `プリント04-07 ${g}=${tex} → ${k}`);
  ok(W.rel2Lines(p).every(l => !/undefined|NaN/.test(l.text + l.tex)), '相互関係の解説');
}
{
  const rng = Rng(3);
  let ob = 0;
  for (let i = 0; i < 3000; i++) {
    const p = W.generateRel2(rng);
    if (p.obtuse) ob++;
    const t = p.targets, v = k => num(t[k]);
    ok(Math.abs(v('sin') ** 2 + v('cos') ** 2 - 1) < 1e-9 && Math.abs(v('tan') - v('sin') / v('cos')) < 1e-9, '相互関係が成り立つ');
    ok(v('sin') > 0 && (p.obtuse ? v('cos') < 0 : v('cos') > 0), '符号');
    const L = W.rel2Lines(p);
    ok(L.every(l => !/undefined|NaN/.test(l.text + l.tex)), '解説');
    // 解説の最後の行に，求めた値の形が出る
    const last = L[L.length - 1].tex;
    ok(/= [^=]+$/.test(last), '解説の結論');
  }
  ok(ob > 1500 && ob < 2100, '鈍角の割合 ' + ob);
}

// 6. 04-07［3］：式の値
function evalTex(tex) {
  let js = tex
    .replace(/\\frac\{1\}\{\\(tan|cos)\^2 (\d+)\^\\circ\}/g, '(1/F.$1($2)**2)')
    .replace(/\\(sin|cos|tan)\s*(\d+)\^\\circ/g, 'F.$1($2)')
    .replace(/\)\s*(?=F\.|\()/g, ')*');
  return Function('F', 'return ' + js)(fnv);
}
ok(Math.abs(evalTex('\\sin 80^\\circ\\cos 170^\\circ - \\cos 80^\\circ\\sin 170^\\circ') + 1) < 1e-9, 'プリント04-07［3］(1)');
ok(Math.abs(evalTex('\\sin 20^\\circ + \\sin 70^\\circ + \\cos 110^\\circ + \\cos 160^\\circ')) < 1e-9, 'プリント04-07［3］(2)');
ok(Math.abs(evalTex('\\frac{1}{\\tan^2 50^\\circ} - \\frac{1}{\\cos^2 40^\\circ}') + 1) < 1e-9, 'プリント04-07［3］(3)');
{
  const rng = Rng(5), cnt = {};
  for (let i = 0; i < 3000; i++) {
    const p = W.generateExpr2(rng);
    cnt[p.type] = (cnt[p.type] || 0) + 1;
    ok(Math.abs(evalTex(p.tex) - p.value) < 1e-9, `式の値 ${p.tex} = ${evalTex(p.tex)}（答え ${p.value}）`);
    ok(p.lines.every(l => !/undefined|NaN/.test(l.text + l.tex)), '式の解説');
    ok(p.lines[p.lines.length - 1].tex.endsWith(String(p.value)), '解説の結論 ' + p.tex);
    const a = p.value === 0 ? zero() : ans(p.value < 0, 1, 1, 1, 1);
    ok(W.judgeSigned(a, p.target).status === 'correct', '式の値：正解');
  }
  W.EXPR_KEYS.forEach(k => ok(cnt[k] > (k === 'sum4' ? 400 : 800), '型の割合 ' + JSON.stringify(cnt)));
}

// 7. 総当たり：⑪ ⑫
{
  const rng = Rng(9);
  for (let i = 0; i < 3000; i++) {
    const p = W.generateVal(rng);
    ok(!(p.fn === 'tan' && p.deg === 90), 'tan90° は出さない');
    ok(W.valLines(p).every(l => !/undefined|NaN/.test(l.text + l.tex)), '値の解説');
    ok(W.sceneFor(p).labels.every(l => l.p[0] >= 0 && l.p[0] <= 360 && l.p[1] >= 0 && l.p[1] <= 230), '図のラベルが枠外 ' + p.fn + p.deg);
    const q = W.generateComp(rng);
    ok(q.deg > 90 && q.deg < 180 && q.deg !== 135 && q.ans.deg >= 1 && q.ans.deg < 45, '鈍角の角 ' + JSON.stringify(q));
    const lhs = fnv[q.fn](q.deg), a = q.ans;
    const rhs = (a.neg ? -1 : 1) * (a.fn === 'rtan' ? 1 / Math.tan(a.deg * rad) : fnv[a.fn](a.deg));
    ok(Math.abs(lhs - rhs) < 1e-9, '45° 以下で表した値が等しい ' + JSON.stringify(q));
    ok(W.judgeComp(q, { neg: a.neg, fn: a.fn, deg: String(a.deg) }).status === 'correct', '鈍角：正解');
    ok(W.compLines(q).every(l => !/undefined|NaN/.test(l.text + l.tex)), '鈍角の解説');
  }
}

console.log(`checked wide problems; ${fails} failures`);
process.exit(fails ? 1 : 0);
