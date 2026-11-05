// node tests/core.test.js で実行する．失敗があれば exit 1．
const C = require('../core.js');

let fails = 0;
function ok(cond, msg) { if (!cond) { fails++; if (fails <= 30) console.error('NG:', msg); } }

const R = (a, b, c, d, opt) => Object.assign({ a, b, c, d, numRoot: b !== 1, frac: c !== 1 || d !== 1, denRoot: d !== 1 }, opt || {});
const status = (ans, t) => C.judgeRatio(ans, t).status;

// 1. プリントの解答例（すべて正解になること）
const printCases = [
  // [opp2, adj2, hyp2, sin, cos, tan]  各答えは [a,b,c,d]
  [4, 5, 9, [2, 1, 3, 1], [1, 5, 3, 1], [2, 1, 1, 5]],          // 1(1)
  [25, 144, 169, [5, 1, 13, 1], [12, 1, 13, 1], [5, 1, 12, 1]], // 1(2)
  [7, 9, 16, [1, 7, 4, 1], [3, 1, 4, 1], [1, 7, 3, 1]],         // 1(3)
  [64, 36, 100, [4, 1, 5, 1], [3, 1, 5, 1], [4, 1, 3, 1]],      // 2(2)
  [3, 1, 4, [1, 3, 2, 1], [1, 1, 2, 1], [1, 3, 1, 1]],          // 2(3)
  [4, 9, 13, [2, 1, 1, 13], [3, 1, 1, 13], [2, 1, 3, 1]]        // 2(4)
];
for (const [o, a, h, s, c, t] of printCases) {
  const tg = C.targets({ opp2: o, adj2: a, hyp2: h });
  for (const [key, v] of [['sin', s], ['cos', c], ['tan', t]]) {
    ok(status(R(...v), tg[key]) === 'correct', `print ${o},${a},${h} ${key} ${v}`);
  }
}

// 2. 書き方のルール
const t45 = C.targets({ opp2: 1, adj2: 1, hyp2: 2 });
ok(status(R(1, 1, 1, 2), t45.sin) === 'correct', '1/√2 は正解');
ok(status(R(1, 2, 2, 1), t45.sin) === 'correct', '√2/2 は正解');
ok(status(R(1, 1, 1, 1, { frac: false, numRoot: false, denRoot: false }), t45.tan) === 'correct', 'tan45 = 1');
ok(status(R(1, 1, 1, 1, { frac: true }), t45.tan) === 'form', '1/1 は書き方ミス');
ok(status(R(2, 2, 4, 1), t45.sin) === 'form', '2√2/4 は約分');
ok(status(R(2, 1, 2, 2), t45.sin) === 'form', '2/(2√2) は約分');
const t3 = C.targets({ opp2: 3, adj2: 1, hyp2: 4 });
ok(status(R(3, 1, 1, 3), t3.tan) === 'form', '3/√3 は √3 に');
ok(status(R(1, 3, 1, 1, { frac: true }), t3.tan) === 'form', '√3/1 は書き方ミス');
ok(status(R(1, 6, 1, 2), t3.tan) === 'form', '√6/√2 は書き方ミス');
const tSixty = C.targets({ opp2: 64, adj2: 36, hyp2: 100 });
ok(status(R(8, 1, 10, 1), tSixty.sin) === 'form', '8/10 は約分');
ok(status(R(3, 1, 5, 1), tSixty.sin) === 'wrong', 'sin と cos の取り違えは誤り');
const t8 = C.targets({ opp2: 8, adj2: 1, hyp2: 9 });
ok(status(R(1, 8, 3, 1), t8.sin) === 'form', '√8/3 は √ の中を簡単に');
ok(status(R(2, 2, 3, 1), t8.sin) === 'correct', '2√2/3 は正解');
ok(status(R(1, 8, 1, 1, { frac: false }), t8.tan) === 'form', '√8 は書き方ミス');
ok(status(R(2, 2, 1, 1, { frac: false }), t8.tan) === 'correct', '2√2 は正解');
ok(status({ a: null, b: 1, c: 1, d: 1 }, t8.tan) === 'empty', '空欄');
ok(status({ a: 0, b: 1, c: 1, d: 1 }, t8.tan) === 'invalid', '0 は入力ミス');
ok(status({ a: null, b: 2, numRoot: true }, C.targets({ opp2: 2, adj2: 1, hyp2: 3 }).tan) === 'correct', '係数空欄の √2 は 1√2');

// 3. 総当たり：どの問題でも「正解」は値が等しく，最も簡単な形が1つか2つだけ（有理化した形と，しない形）
const rng = C.makeRng(20261106);
let checked = 0;
for (let n = 0; n < 240; n++) {
  const prob = C.generateProblem(['three', 'two', 'mix'][n % 3], rng);
  ok(prob.opp2 + prob.adj2 === prob.hyp2, 'ピタゴラスが成り立つ');
  ok([prob.opp2, prob.adj2, prob.hyp2].every(v => Number.isInteger(v) && v > 0), '2乗は正の整数');
  const tg = C.targets(prob);
  for (const key of ['sin', 'cos', 'tan']) {
    const t = tg[key];
    const accepted = [];
    for (let a = 1; a <= 30; a++) for (let b = 1; b <= 30; b++) for (let c = 1; c <= 30; c++) for (const d of [1, 2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 29, 41, 8, 12]) {
      for (const numRoot of [false, true]) for (const frac of [false, true]) for (const denRoot of [false, true]) {
        if (!numRoot && b !== 1) continue;
        if (!frac && (c !== 1 || d !== 1 || denRoot)) continue;
        if (!denRoot && d !== 1) continue;
        const r = C.judgeRatio({ a, b, c, d, numRoot, frac, denRoot }, t);
        checked++;
        const equal = a * a * b * t.d === c * c * d * t.n;
        if (r.status === 'correct') { ok(equal, `correct なのに値が違う ${key}`); accepted.push([a, b, c, d, numRoot, frac, denRoot].join('/')); }
        if (r.status === 'wrong') ok(!equal, `wrong なのに値が等しい ${key} ${[a, b, c, d]}`);
        if (r.status === 'form') ok(equal, `form なのに値が違う`);
      }
    }
    ok(accepted.length >= 1 && accepted.length <= 2, `${JSON.stringify(prob)} ${key} の正解の形が ${accepted.length} 個: ${accepted}`);
  }
  // 辺の答え
  if (prob.hidden) {
    const t2 = prob[prob.hidden + '2'];
    const { k, m } = C.simplifySqrt(t2);
    ok(C.judgeSide({ k, m, root: m !== 1 }, t2).status === 'correct', '辺の正解');
    if (m === 1) ok(C.judgeSide({ k: null, m: k * k, root: true }, t2).status === 'form', '√16 は 4 に');
    else ok(C.judgeSide({ k: null, m: t2, root: true }, t2).status === (k === 1 ? 'correct' : 'form'), '√(k²m) は書き方ミス');
  }
}

// 4. 配置：直角マークは C，ラベルが図の中に収まる
for (let n = 0; n < 2000; n++) {
  const prob = C.generateProblem('mix', rng);
  const L = C.layoutTriangle(prob);
  const { A, B, C: Cp } = L.P;
  const dot = (CA, CB) => CA[0] * CB[0] + CA[1] * CB[1];
  const CA = [A[0] - Cp[0], A[1] - Cp[1]], CB = [B[0] - Cp[0], B[1] - Cp[1]];
  ok(Math.abs(dot(CA, CB)) / (Math.hypot(...CA) * Math.hypot(...CB)) < 1e-9, '∠C が直角');
  const inside = (p, mx, my) => p[0] >= mx && p[0] <= L.W - mx && p[1] >= my && p[1] <= L.H - my;
  for (const v of ['A', 'B', 'C']) ok(inside(L.vertexLabels[v], 6, 6), `頂点ラベル ${v} が枠外 ${JSON.stringify(prob.orient)}`);
  for (const s of ['hyp', 'opp', 'adj']) {
    const half = (C.sqrtPlain(prob[s + '2']).length * 5.2 + 4);
    ok(inside(L.sideLabels[s], Math.min(half, 30), 8), `辺ラベル ${s} が枠外 ${JSON.stringify(prob)}`);
  }
  ok(inside(L.thetaLabel, 6, 6), 'θ が枠外');
  // θ のラベルは三角形の内側
  const sign = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const T = L.thetaLabel;
  const s1 = sign(A, B, T), s2 = sign(B, Cp, T), s3 = sign(Cp, A, T);
  const inTri = (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  ok(inTri, `θ のラベルが三角形の外 ${JSON.stringify(prob)}`);
}

// 5. 向きの種類が偏っていない
const modes = {};
for (let n = 0; n < 1000; n++) { const o = C.randomOrientation(rng); modes[o.mode + (o.flip ? '-flip' : '')] = (modes[o.mode + (o.flip ? '-flip' : '')] || 0) + 1; }
ok(Object.keys(modes).length === 6, '向き6種類が出る ' + JSON.stringify(modes));

console.log(`checked ${checked} answer patterns; ${fails} failures`);
process.exit(fails ? 1 : 0);
