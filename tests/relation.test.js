// node tests/relation.test.js で実行する．失敗があれば exit 1．
const C = require('../core.js');
const R = require('../relation.js');

let fails = 0;
function ok(cond, msg) { if (!cond) { fails++; if (fails <= 30) console.error('NG:', msg); } }
const ans = (a, b, c, d) => ({ a, b, c, d, numRoot: b !== 1, frac: c !== 1 || d !== 1, denRoot: d !== 1 });
const st = (p, key, x) => C.judgeRatio(x, C.targets(p)[key]).status;

// 1. プリントの解答（4(1)〜(6) と 1〜3）
const cases = [
  // [与える, 値², 値の分母², 与える形, { 求める: 答え [a,b,c,d] }]
  ['sin', 4, 9, '\\frac{2}{3}', { cos: [1, 5, 3, 1], tan: [2, 1, 1, 5] }],          // 1
  ['cos', 1, 9, '\\frac{1}{3}', { sin: [2, 2, 3, 1], tan: [2, 2, 1, 1] }],          // 2
  ['tan', 4, 1, '2', { cos: [1, 1, 1, 5], sin: [2, 1, 1, 5] }],                      // 3
  ['sin', 1, 4, '\\frac{1}{2}', { cos: [1, 3, 2, 1], tan: [1, 1, 1, 3] }],          // 4(1)
  ['cos', 25, 169, '\\frac{5}{13}', { sin: [12, 1, 13, 1], tan: [12, 1, 5, 1] }],   // 4(2)
  ['tan', 9, 1, '3', { sin: [3, 1, 1, 10], cos: [1, 1, 1, 10] }],                    // 4(3)
  ['sin', 1, 5, '\\frac{1}{\\sqrt{5}}', { cos: [2, 1, 1, 5], tan: [1, 1, 2, 1] }],   // 4(4)
  ['cos', 4, 9, '\\frac{2}{3}', { sin: [1, 5, 3, 1], tan: [1, 5, 2, 1] }],          // 4(5)
  ['tan', 1, 9, '\\frac{1}{3}', { sin: [1, 1, 1, 10], cos: [3, 1, 1, 10] }]          // 4(6)
];
for (const [g, n, d, tex, answers] of cases) {
  const p = R.build(g, n, d, false);
  ok(p.givenTex === tex, `与える形 ${g}: ${p.givenTex}（プリントは ${tex}）`);
  for (const [key, v] of Object.entries(answers)) ok(st(p, key, ans(...v)) === 'correct', `プリントの答え ${g}=${tex} → ${key} ${v}`);
  // 有理化した形も正解
  ok(R.OTHERS[g].every(k => p.asks.indexOf(k) >= 0), '求める2つ');
}
// 有理化した形で与えても同じ三角形の比になる
const pr = R.build('sin', 1, 5, true);
ok(pr.givenTex === '\\frac{\\sqrt{5}}{5}', '有理化した形で与える ' + pr.givenTex);
ok(st(pr, 'cos', ans(2, 1, 1, 5)) === 'correct' && st(pr, 'tan', ans(1, 1, 2, 1)) === 'correct', '有理化した形で与えても答えは同じ');

// 2. 総当たり
const rng = C.makeRng(20261110);
const cnt = { sin: 0, cos: 0, tan: 0 };
const N = 3000;
for (let i = 0; i < N; i++) {
  const p = R.generateRelation(rng);
  cnt[p.given]++;
  ok([p.opp2, p.adj2, p.hyp2].every(v => Number.isInteger(v) && v > 0) && p.opp2 + p.adj2 === p.hyp2, '直角三角形 ' + JSON.stringify(p));
  // 与えた値が三角形の比と一致
  const t = C.targets(p)[p.given];
  const f = R.form(t.n, t.d, /\\sqrt\{\d+\}\}$/.test(p.givenTex) ? false : (p.givenTex !== R.form(t.n, t.d, false).tex));
  ok(f.tex === p.givenTex, '与えた値と三角形の比が一致 ' + p.givenTex);
  ok(!/\\frac\{\d*\\sqrt\{\d+\}\}\{\d*\\sqrt/.test(p.givenTex), '分子・分母がともに √ の形で与えない ' + p.givenTex);
  ok(!/\}\{\d+\\sqrt/.test(p.givenTex), '分母が「係数 × √」の形で与えない ' + p.givenTex);
  ok(R.relationLines(p).every(l => !/\\div/.test(l.tex) || /\\times/.test(l.tex)), '割り算には逆数をかける行がある');
  ok(p.asks.length === 2 && p.asks.indexOf(p.given) < 0, '残りの2つを聞く');
  // 求める2つは，有理化した形が正解になり，きれいな形
  for (const k of p.asks) {
    const tk = C.targets(p)[k];
    const g = C.gcd(tk.n, tk.d); const nn = tk.n / g, dd = tk.d / g;
    const s = C.simplifySqrt(nn * dd); const g2 = C.gcd(s.k, dd);
    const a = s.k / g2, b = s.m, c = dd / g2;
    ok(C.judgeRatio({ a, b, c, d: 1, numRoot: b !== 1, frac: c !== 1, denRoot: false }, tk).status === 'correct', '有理化した形が正解 ' + k);
    ok(b <= 15 && a <= 30 && c <= 30, '答えがきれいな形 ' + k + ' ' + [a, b, c]);
  }
  const lines = R.relationLines(p);
  ok(lines.length >= 3 && lines.every(l => !/undefined|NaN/.test(l.text + l.tex)), '解説 ' + JSON.stringify(lines));
  const tl = R.triangleLines(p);
  ok(!/undefined|NaN/.test(tl.intro + tl.py), '別解 ' + tl.intro);
  // 別解の三平方の式の答えが隠した辺
  ok(tl.py.indexOf(C.sqrtTex(p[p.hidden + '2'])) >= 0, '別解の答え ' + tl.py);
}
for (const fn of ['sin', 'cos', 'tan']) ok(cnt[fn] > N * 0.28 && cnt[fn] < N * 0.39, `${fn} を与える割合 ${cnt[fn]}/${N}`);

console.log(`checked ${N} relation problems; ${fails} failures`);
process.exit(fails ? 1 : 0);
