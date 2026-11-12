// node tests/famous.test.js で実行する．失敗があれば exit 1．
const C = require('../core.js');
const F = require('../famous.js');

let fails = 0;
function ok(cond, msg) { if (!cond) { fails++; if (fails <= 30) console.error('NG:', msg); } }
const ans = (a, b, c, d) => ({ a, b, c, d, numRoot: b !== 1, frac: c !== 1 || d !== 1, denRoot: d !== 1 });
const rad = Math.PI / 180;
const fnv = { sin: x => Math.sin(x * rad), cos: x => Math.cos(x * rad), tan: x => Math.tan(x * rad) };

// 1. プリント［1］：30°・45°・60° の表（有理化した形も正解）
const table = {
  30: { sin: [[1, 1, 2, 1]], cos: [[1, 3, 2, 1]], tan: [[1, 1, 1, 3], [1, 3, 3, 1]] },
  45: { sin: [[1, 1, 1, 2], [1, 2, 2, 1]], cos: [[1, 1, 1, 2], [1, 2, 2, 1]], tan: [[1, 1, 1, 1]] },
  60: { sin: [[1, 3, 2, 1]], cos: [[1, 1, 2, 1]], tan: [[1, 3, 1, 1]] }
};
for (const d of F.DEG) {
  const p = Object.assign({ deg: d }, F.TRI[d]);
  const tg = C.targets(p);
  for (const f of F.FN) {
    ok(Math.abs(Math.sqrt(tg[f].n / tg[f].d) - fnv[f](d)) < 1e-12, `三角定規の比 ${f}${d}°`);
    for (const a of table[d][f]) ok(C.judgeRatio(ans(...a), tg[f]).status === 'correct', `表の答え ${f}${d}° = ${a}`);
  }
}
// 値から角：全部の値と形で正解の角になる
for (const d of F.DEG) for (const f of F.FN) {
  for (const valTex of F.VAL_TEX[d][f]) {
    const p = Object.assign({ kind: 'famous', sub: 'angle', deg: d, fn: f, valTex }, F.TRI[d]);
    ok(F.judgeAngle(p, String(d)).status === 'correct', `角 ${f}θ=${valTex} → ${d}`);
    ok(F.judgeAngle(p, d + '°').status === 'correct' && F.judgeAngle(p, '　' + String.fromCharCode(...String(d).split('').map(c => c.charCodeAt(0) + 0xFEE0)) + '度').status === 'correct', '° や 度，全角も読む');
    ok(F.judgeAngle(p, '').status === 'empty' && F.judgeAngle(p, '30.5').status === 'invalid', '空欄と入力ミス');
    // sin・cos と tan で値の一致する角はない
    ok(F.DEG.filter(e => e !== d).every(e => F.judgeAngle(p, String(e)).status === 'wrong'), `ほかの角は不正解 ${f}${d}`);
    const L = F.famousLines(p);
    ok(L.every(l => !/undefined|NaN/.test(l.text + l.tex)), '解説 ' + JSON.stringify(L));
  }
}
{
  const p = Object.assign({ kind: 'famous', sub: 'angle', deg: 30, fn: 'sin', valTex: '\\frac{1}{2}' }, F.TRI[30]);
  ok(/cos/.test(F.judgeAngle(p, '60').hint), 'sinθ = 1/2 に 60° → cos との取り違えを案内');
}

// 2. プリント［2］：45° 以下の角で表す
const comp = (fn, deg) => ({ kind: 'comp', fn, deg, ansFn: { sin: 'cos', cos: 'sin', tan: 'rtan' }[fn], ansDeg: 90 - deg });
const stc = (p, fn, deg) => F.judgeComp(p, { fn, deg }).status;
[['sin', 64, 'cos', 26], ['cos', 58, 'sin', 32], ['tan', 83, 'rtan', 7], ['sin', 57, 'cos', 33], ['cos', 82, 'sin', 8], ['tan', 71, 'rtan', 19]]
  .forEach(([f, d, af, ad]) => {
    const p = comp(f, d);
    ok(stc(p, af, String(ad)) === 'correct', `プリント［2］ ${f}${d}° = ${af} ${ad}°`);
    ok(stc(p, af, ad + '°') === 'correct', '° を書いてもよい');
    ok(stc(p, f, String(d)) === 'form', 'そのまま書いたら書き方ミス');
    ok(stc(p, f, String(ad)) === 'wrong' && F.judgeComp(p, { fn: f, deg: String(ad) }).hint, '関数を変え忘れたら案内');
    ok(stc(p, '', String(ad)) === 'empty' && stc(p, af, '') === 'empty' && stc(p, af, 'x') === 'invalid', '空欄と入力ミス');
    ok(!F.compLines(p).some(l => /undefined|NaN/.test(l.text + l.tex)), '解説');
  });
ok(/1\/tan/.test(F.judgeComp(comp('tan', 83), { fn: 'tan', deg: '7' }).hint), 'tan のままには 1/tan の案内');
ok(stc(comp('sin', 64), 'rtan', '26') === 'wrong', '別の三角比は不正解');

// 3. プリント［3］：式の値
const valOf = (n, d) => ({ n, d });
// 式の TeX を計算して確かめる
function evalTex(tex) {
  let js = tex
    .replace(/\\left|\\right/g, '')
    .replace(/\\\{|\\\}/g, m => (m === '\\{' ? '(' : ')'))
    .replace(/\\(sin|cos|tan)\^2\s*(\d+)\^\\circ/g, '(F.$1($2))**2')
    .replace(/\\(sin|cos|tan)\s*(\d+)\^\\circ/g, 'F.$1($2)')
    .replace(/\)\^2/g, ')**2')
    .replace(/\)\s*(?=F\.|\()/g, ')*')
    .replace(/(\d)\s*(?=F\.|\()/g, '$1*');
  // eslint-disable-next-line no-new-func
  return Function('F', 'return ' + js)(fnv);
}
// プリントの4問（式の値が同じになる）
ok(Math.abs(evalTex('\\sin^2 40^\\circ + \\sin^2 50^\\circ') - 1) < 1e-9, '式の計算の確かめ（1）');
ok(Math.abs(evalTex('\\tan 35^\\circ\\tan 55^\\circ - \\tan 15^\\circ\\tan 75^\\circ')) < 1e-9, '式の計算の確かめ（2）');
ok(Math.abs(evalTex('(\\sin 70^\\circ + \\sin 20^\\circ)^2 - 2\\tan 70^\\circ\\cos^2 70^\\circ') - 1) < 1e-9, '式の計算の確かめ（3）');
ok(Math.abs(evalTex('\\cos^2 20^\\circ + \\cos^2 35^\\circ + \\cos^2 45^\\circ + \\cos^2 55^\\circ + \\cos^2 70^\\circ') - 2.5) < 1e-9, '式の計算の確かめ（4）');
// 答えの判定
const ex = v => ({ kind: 'expr', value: v });
const stv = (v, a) => F.judgeValue(ex(v), a).status;
ok(stv(valOf(1, 1), ans(1, 1, 1, 1)) === 'correct', '1 は正解');
ok(stv(valOf(0, 1), ans(0, 1, 1, 1)) === 'correct', '0 は正解');
ok(stv(valOf(0, 1), ans(1, 1, 1, 1)) === 'wrong' && stv(valOf(1, 1), ans(0, 1, 1, 1)) === 'wrong', '0 と 1 の取り違え');
ok(stv(valOf(0, 1), { a: 0, b: null, c: 3, d: null, numRoot: false, frac: true, denRoot: false }) === 'form', '0/3 は書き方ミス');
ok(stv(valOf(0, 1), { a: null, b: null, c: null, d: null }) === 'empty', '空欄');
ok(stv(valOf(5, 2), ans(5, 1, 2, 1)) === 'correct' && stv(valOf(5, 2), ans(10, 1, 4, 1)) === 'form' && stv(valOf(5, 2), ans(2, 1, 1, 1)) === 'wrong', '5/2');
ok(stv(valOf(2, 1), ans(2, 1, 1, 1)) === 'correct' && stv(valOf(2, 1), ans(4, 1, 2, 1)) === 'form', '2');

// 4. 総当たり
const rng = (() => { let s = 20261112; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
const N = 3000;
const cnt = { value: 0, angle: 0, deg: {}, fn: {}, comp: {}, type: {} };
for (let i = 0; i < N; i++) {
  const p = F.generateFamous(rng);
  cnt[p.sub]++; cnt.deg[p.deg] = (cnt.deg[p.deg] || 0) + 1; cnt.fn[p.fn] = (cnt.fn[p.fn] || 0) + 1;
  ok(F.FN.indexOf(p.fn) >= 0 && F.DEG.indexOf(p.deg) >= 0, '有名角の問題 ' + JSON.stringify(p));
  if (p.sub === 'angle') ok(F.judgeAngle(p, String(p.deg)).status === 'correct', '有名角：正解の角');
  ok(F.famousLines(p).every(l => !/undefined|NaN/.test(l.text + l.tex)), '有名角の解説');

  const q = F.generateComp(rng);
  cnt.comp[q.fn] = (cnt.comp[q.fn] || 0) + 1;
  ok(q.deg >= 46 && q.deg <= 89 && q.ansDeg >= 1 && q.ansDeg <= 44 && q.deg + q.ansDeg === 90, '余角の角 ' + JSON.stringify(q));
  const lhs = fnv[q.fn](q.deg), rhs = q.ansFn === 'rtan' ? 1 / Math.tan(q.ansDeg * rad) : fnv[q.ansFn](q.ansDeg);
  ok(Math.abs(lhs - rhs) < 1e-9, '余角の答えの値が等しい ' + JSON.stringify(q));
  ok(F.judgeComp(q, { fn: q.ansFn, deg: String(q.ansDeg) }).status === 'correct', '余角：正解');

  const e = F.generateExpr(rng);
  cnt.type[e.type] = (cnt.type[e.type] || 0) + 1;
  const v = evalTex(e.tex);
  ok(Math.abs(v - e.value.n / e.value.d) < 1e-9, `式の値 ${e.tex} = ${v}（答え ${e.value.n}/${e.value.d}）`);
  ok(e.lines.every(l => l && typeof l.tex === 'string' && !/undefined|NaN/.test(l.text + l.tex)), '式の解説 ' + JSON.stringify(e.lines));
  // 解説の最後の行に答えが出る
  ok(e.lines[e.lines.length - 1].tex.endsWith(F.valueTex(e.value)), '解説の結論 ' + e.tex);
  // 45° は ⑩ の sqSum だけ，ほかは 45° を使わない（有名角で値が決まってしまうため）
  if (e.type !== 'sqSum') ok(!/45\^\\circ/.test(e.tex), '45° を使わない ' + e.tex);
  // 書きかえは「90° − 小さい角」（プリントと同じ向き）．squareTan だけはプリント［3］(3) のとおり後ろの角にそろえる
  if (e.type !== 'squareTan') {
    const ms = e.lines.map(l => l.tex).join(' ').match(/90\^\\circ - (\d+)/g) || [];
    ok(ms.every(m => parseInt(m.split('- ')[1], 10) < 45), '書きかえは小さい角へ ' + e.lines.map(l => l.tex).join(' | '));
  }
  const a = e.value.n === 0 ? ans(0, 1, 1, 1) : ans(e.value.n, 1, e.value.d, 1);
  ok(F.judgeValue(e, a).status === 'correct', '式の値：正解 ' + e.tex);
}
ok(cnt.value > N * 0.4 && cnt.angle > N * 0.4, '値と角の割合 ' + JSON.stringify(cnt));
for (const d of F.DEG) ok(cnt.deg[d] > N * 0.28, '角の割合 ' + JSON.stringify(cnt.deg));
for (const f of F.FN) ok(cnt.fn[f] > N * 0.28 && cnt.comp[f] > N * 0.28, '三角比の割合 ' + JSON.stringify([cnt.fn, cnt.comp]));
for (const t of F.EXPR_KEYS) ok(cnt.type[t] > N * 0.18, '式の型の割合 ' + JSON.stringify(cnt.type));

console.log(`checked ${3 * N} famous/comp/expr problems; ${fails} failures`);
process.exit(fails ? 1 : 0);
