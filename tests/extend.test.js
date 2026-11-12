// node tests/extend.test.js で実行する．失敗があれば exit 1．
const X = require('../extend.js');

let fails = 0;
function ok(cond, msg) { if (!cond) { fails++; if (fails <= 30) console.error('NG:', msg); } }
const rad = Math.PI / 180;

// TeX の値を数に（\frac{a}{b}，\sqrt{n}，- だけを読む）
function texVal(s) {
  if (s === null) return null;
  let t = s.replace(/\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '(($1)/($2))');
  t = t.replace(/\\sqrt\{(\d+)\}/g, 'Math.sqrt($1)');
  t = t.replace(/\)(?=[\dM(])|(\d)(?=M)/g, (m, d) => d ? d + '*' : ')*');
  return Function('return ' + t)();
}

// 1. 有名角の正確な値が実際の値と合う（教科書 p.155〜158 の値）
for (const d of X.FAMOUS) {
  const r = X.ratios(d);
  for (const fn of ['sin', 'cos', 'tan']) {
    const e = X.EXACT[d][fn];
    if (fn === 'tan' && d === 90) { ok(e === null && r.tan === null, 'tan90° は定義しない'); continue; }
    ok(Math.abs(texVal(e) - r[fn]) < 1e-12, `${fn}${d}° = ${e}`);
  }
}

// 2. 半径 2 の座標（教科書 例4：120° で P(−1, √3)）
for (const d of X.FAMOUS) {
  const p = X.point(d, 2);
  ok(Math.abs(texVal(X.COORD2[d][0]) - p.x) < 1e-12 && Math.abs(texVal(X.COORD2[d][1]) - p.y) < 1e-12, `r=2 の P(${d}°)`);
}
ok(X.COORD2[120][0] === '-1' && X.COORD2[120][1] === '\\sqrt{3}', '例4 と同じ形');

// 3. 比は r によらない（0°〜180° の整数，r = 1〜3）
for (let d = 0; d <= 180; d++) for (const r of [1, 1.5, 2, 2.5, 3]) {
  const p = X.point(d, r), u = X.ratios(d);
  ok(Math.abs(p.y / r - u.sin) < 1e-12 && Math.abs(p.x / r - u.cos) < 1e-12, `r によらない ${d}° r=${r}`);
  if (d !== 90) ok(Math.abs(p.y / p.x - u.tan) < 1e-9, `tan ${d}°`);
}

// 4. 鋭角では直角三角形の定義と一致し，符号は 鈍角で cos・tan が負
for (let d = 1; d < 90; d++) {
  const u = X.ratios(d);
  ok(Math.abs(u.sin - Math.sin(d * rad)) < 1e-12 && u.cos > 0 && u.tan > 0, `鋭角 ${d}°`);
  ok(X.triangleOK(d), `三角形がつくれる ${d}°`);
}
for (let d = 91; d < 180; d++) {
  const u = X.ratios(d);
  ok(u.sin > 0 && u.cos < 0 && u.tan < 0, `鈍角の符号 ${d}°`);
  ok(!X.triangleOK(d), `三角形がつくれない ${d}°`);
}
ok(!X.triangleOK(0) && !X.triangleOK(90) && !X.triangleOK(180), '0°・90°・180° は三角形がつぶれる');

// 5. 0°・90°・180° で浮動小数のごみを出さない／表示の丸め
ok(X.point(90, 1).x === 0 && X.point(0, 1).y === 0 && X.point(180, 1).y === 0, '端の座標はちょうど 0');
ok(X.fmt(-0.0001) === '0' && X.fmt(-0.5) === '-0.5' && X.fmt(1.7320508) === '1.732' && X.fmt(2) === '2', 'fmt');
ok(X.fmt(Math.cos(91 * rad), 4) === '-0.0175', 'fmt 4桁（表と同じ）');

if (fails) { console.error(`extend: ${fails} 件の失敗`); process.exit(1); }
console.log('extend: すべて OK');
