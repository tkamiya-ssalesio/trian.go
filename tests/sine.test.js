// node tests/sine.test.js で実行する．失敗があれば exit 1．
const S = require('../sine.js');

let fails = 0;
function ok(cond, msg) { if (!cond) { fails++; if (fails <= 30) console.error('NG:', msg); } }
const rad = Math.PI / 180;
const near = (x, y, e) => Math.abs(x - y) < (e || 1e-9);

// 1. 測量の問題：AC = 50√6，外接円の半径 R = 50√2
ok(near(S.SURVEY.b, 50 * Math.sqrt(6)), 'AC = 50√6');
ok(near(S.SURVEY.R, 50 * Math.sqrt(2)), 'R = 50√2');
ok(S.SURVEY.A + S.SURVEY.B + S.SURVEY.C === 180, '∠C = 45°');
// 垂線の解き方と同じ値になる（AH = 100 sin 60°，AC = AH / sin 45°）
ok(near(100 * Math.sin(60 * rad) / Math.sin(45 * rad), S.SURVEY.b), '垂線で求めた AC と一致');

// 2. 乱数の三角形で，a/sin A = b/sin B = c/sin C = 2R と，高さの2通りの表し方
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
let tested = 0;
for (let i = 0; i < 5000; i++) {
  const A = [rnd() * 360, rnd() * 290], B = [rnd() * 360, rnd() * 290], C = [rnd() * 360, rnd() * 290];
  if (!S.healthy(A, B, C)) continue;
  tested++;
  const m = S.measure(A, B, C);
  ok(near(m.A + m.B + m.C, 180, 1e-7), '内角の和');
  const k = m.a / Math.sin(m.A * rad);
  ok(near(k, m.b / Math.sin(m.B * rad), 1e-6) && near(k, m.c / Math.sin(m.C * rad), 1e-6), '3つの比が等しい');
  ok(near(k, 2 * S.circumcircle(A, B, C).R, 1e-6), 'k = 2R');
  const h = S.dist(A, S.foot(A, B, C).pt);
  ok(near(h, m.c * Math.sin(m.B * rad), 1e-6) && near(h, m.b * Math.sin(m.C * rad), 1e-6), 'AH = c sin B = b sin C（鈍角でも）');
  // 垂線の足が辺の外に出るのは，B か C が鈍角のときだけ
  const t = S.foot(A, B, C).t;
  ok((t < 0) === (m.B > 90) && (t > 1) === (m.C > 90), '足の位置と鈍角');
}
ok(tested > 1000, '三角形の数');

// 3. 円周角：円の上のどこに A をとっても ∠BAC は一定か 180° からひいた値
const O = [0, 0], R = 1;
const on = d => [Math.cos(d * rad), Math.sin(d * rad)];
const Bp = on(205), Cp = on(335);
for (let d = 0; d < 360; d += 3) {
  if (d > 196 && d < 214 || d > 326 && d < 344) continue;
  const ang = S.angleAt(on(d), Bp, Cp);
  const minor = d > 205 && d < 335;
  ok(near(ang, minor ? 115 : 65, 1e-7), `円周角 ${d}°`);
  // 直径 BA′ の A′ と同じ側なら等しく，反対側なら和が 180°
  const A2 = on(25);
  ok(S.sameSide(on(d), A2, Bp, Cp) === !minor, `A と A′ の側 ${d}°`);
}

// 4. スライドが描ける（NaN・undefined が出ない）
const api = S.create({ T: s => `[${s}]`, D: s => `[[${s}]]` });
ok(api.slides.length === 11, 'スライドは11枚');
global.document = { getElementById: () => null, querySelectorAll: () => [] };
api.slides.forEach((f, i) => {
  const html = f();
  ok(!/NaN|undefined|Infinity/.test(html), `スライド ${i + 1} に NaN など`);
});
ok(api.advance() === false, '1行ずつ表示がオフなら advance しない');

ok(S.fmt(-0.001) === '0.00', '−0 を出さない');

if (fails) { console.error(`${fails} 件の失敗`); process.exit(1); }
console.log('sine: ok');
