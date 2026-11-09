// node tests/apply.test.js で実行する．失敗があれば exit 1．
const A = require('../apply.js');

let fails = 0;
function ok(cond, msg) { if (!cond) { fails++; if (fails <= 30) console.error('NG:', msg); } }

// 決まった値を返す乱数：choices は [選ぶ番号, 選択肢の数] の並び
function seq(...choices) {
  let i = 0;
  return () => { const [k, n] = choices[i++ % choices.length]; return (k + 0.5) / n; };
}
const st = (p, v) => A.judgeApply(p, v).status;

// 1. 表の値（教科書と同じ4桁）
const T = A.TABLE;
[['tan', 21, 3839], ['tan', 58, 16003], ['sin', 19, 3256], ['cos', 19, 9455], ['tan', 13, 2309],
 ['tan', 14, 2493], ['tan', 1, 175], ['tan', 2, 349], ['tan', 3, 524], ['tan', 4, 699], ['sin', 30, 5000], ['tan', 45, 10000]]
  .forEach(([f, t, v]) => ok(T[f][t] === v, `表 ${f}${t}° = ${T[f][t]}（正しくは ${v}）`));

// 2. プリントの解答
// 1：木 10 m，21°，目の高さ 1.6 m → 5.4 m
const tree = A._LENGTH.tree(seq([0, 4], [2, 8], [6, 41], [2, 4]));
ok(/10 m/.test(tree.text) && /21°/.test(tree.text) && /1\.6 m/.test(tree.text), 'プリント1の問題文 ' + tree.text);
ok(A.answerText(tree) === '5.4 m', 'プリント1 = 5.4 m: ' + A.answerText(tree));
// 2：高さ 20 m，32° → 32 m
const dep = A._LENGTH.depression(seq([2, 8], [17, 46], [1, 2]));
ok(/20 m/.test(dep.text) && /32°/.test(dep.text), 'プリント2の問題文 ' + dep.text);
ok(A.answerText(dep) === '32 m', 'プリント2 = 32 m: ' + A.answerText(dep));
// 3：19°，100 m → 33 m，95 m
const up = A._LENGTH.slopeUp(seq([2, 8], [14, 26]));
const ac = A._LENGTH.slopeAcross(seq([2, 8], [14, 26]));
ok(A.answerText(up) === '33 m' && A.answerText(ac) === '95 m', 'プリント3 = 33 m, 95 m: ' + A.answerText(up) + ' ' + A.answerText(ac));
// 4：1/15 → 3° 以下
const ramp = A._ANGLE.rampLimit(seq([9, 25]));
ok(/frac\{1\}\{15\}/.test(ramp.text) && A.answerText(ramp) === '3° 以下', 'プリント4 = 3° 以下: ' + A.answerText(ramp));
// 5：23 % → 13°，18 ‰ → 1°
const g = A._ANGLE.grade(seq([20, 43]));
ok(/23 %/.test(g.text) && A.answerText(g) === '約 13°', 'プリント5(1) = 13°: ' + A.answerText(g));
const pm = A._ANGLE.permil(seq([13, 66]));
ok(/18 ‰/.test(pm.text) && A.answerText(pm) === '約 1°', 'プリント5(2) = 1°: ' + A.answerText(pm));

// 3. 判定
ok(st(tree, '5.4') === 'correct', '5.4 は正解');
ok(st(tree, '5.3') === 'correct' && st(tree, '5.5') === 'correct', '±0.1 は正解（表の誤差）');
ok(st(tree, '5.6') === 'wrong' && st(tree, '5.2') === 'wrong', '±0.2 は不正解');
ok(st(tree, '５．４') === 'correct', '全角も読む');
ok(st(tree, '5.40') === 'correct', '末尾の 0 は気にしない');
ok(st(tree, '5.44') === 'form', '桁が多いのは書き方ミス');
ok(st(tree, '5') === 'form', '小数第1位まで答えていない');
ok(A.judgeApply(tree, '3.8').hint === '目の高さを足しましたか？', '目の高さの足し忘れに案内');
ok(st(tree, '') === 'empty' && st(tree, 'abc') === 'invalid' && st(tree, '5..4') === 'invalid', '空欄と入力ミス');
ok(st(dep, '32') === 'correct' && st(dep, '31') === 'correct' && st(dep, '34') === 'wrong', 'プリント2 の許容');
ok(/90°/.test(A.judgeApply(dep, '12').hint), 'tan32° をそのまま使ったときの案内');
ok(st(dep, '32.0') === 'correct' && st(dep, '32.4') === 'form', '整数で答えるところに小数');
ok(st(up, '33') === 'correct' && st(up, '95') === 'wrong' && /sin/.test(A.judgeApply(up, '95').hint), 'sin と cos の取り違えに案内');
ok(st(g, '13') === 'correct' && st(g, '14') === 'form' && st(g, '12') === 'form' && st(g, '20') === 'wrong', '角度：最も近い角だけ正解');
ok(st(g, '13.5') === 'invalid', '角度は整数');
ok(st(ramp, '3') === 'correct' && st(ramp, '4') === 'wrong' && /以下/.test(A.judgeApply(ramp, '4').hint), '以下の問題');

// 4. 総当たり：たくさん作って，答え・解説・図が崩れていないか
const cnt = { applyLen: { sin: 0, cos: 0, tan: 0 }, applyAng: { sin: 0, cos: 0, tan: 0 } };
const ids = {};
const rng = (() => { let s = 20261109; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
const N = 3000;
for (const cat of ['applyLen', 'applyAng', 'applyMix']) {
  for (let n = 0; n < N; n++) {
    const p = A.generateApply(cat, rng);
    ids[p.id] = (ids[p.id] || 0) + 1;
    if (cnt[cat]) cnt[cat][p.fn]++;
    ok(typeof p.text === 'string' && p.text.length > 20 && !/undefined|NaN/.test(p.text), '問題文 ' + p.text);
    ok(p.lines.every(l => !/undefined|NaN/.test(l)), '解説 ' + p.lines.join(' / '));
    const a = p.answer;
    if (a.kind === 'length') {
      ok(a.base > 0, '答えは正 ' + p.id);
      // 基準の答えそのもの，±1 は正解．±3 は不正解
      const s = A.unitsStr(a.base, a.digits);
      ok(st(p, s) === 'correct', `基準の答え ${s} が正解にならない ${p.id}`);
      ok(st(p, A.unitsStr(a.base + 1, a.digits)) === 'correct', '+1 は正解 ' + p.id);
      const far = A.unitsStr(a.base + 3, a.digits);
      const farOK = a.accepts.some(b => Math.abs(a.base + 3 - b) <= 1);
      if (!farOK) ok(st(p, far) !== 'correct', `+3 が正解になった ${p.id} ${far}`);
      // 真の値でも正解になる
      const trueU = Math.round(a.exact * Math.pow(10, a.digits));
      ok(Math.abs(trueU - a.base) <= 1, '表の値と真の値の差が大きい ' + p.id);
    } else {
      ok(a.ans >= 1 && a.ans <= 89, '角度の範囲 ' + p.id + ' ' + a.ans);
      ok(st(p, String(a.ans)) === 'correct', `角度の正解 ${p.id}`);
      ok(st(p, String(a.ans + 2)) === 'wrong' || a.ans + 2 >= 90, `2° ずれは不正解 ${p.id}`);
      if (a.mode === 'nearest') {
        // 真の角度を四捨五入した値と一致（表で引いた答えと実際の角度が食い違わない）
        const T2 = { sin: Math.asin, cos: Math.acos, tan: Math.atan }[a.fn];
        const deg = T2(a.n / a.d) * 180 / Math.PI;
        ok(Math.round(deg) === a.ans, `表で引いた角 ${a.ans} と実際の角 ${deg.toFixed(2)} がずれる ${p.id}`);
        ok(p.conclusion.indexOf(a.ans + '°') >= 0, '結論に答え ' + p.id);
      }
    }
    // 図：点とラベルが枠の中
    const L = A.sceneLayout(p.scene);
    const pts = [].concat(...L.lines.map(l => [l.p, l.q]), ...L.polys.map(q => q.pts));
    ok(pts.every(q => q[0] >= 2 && q[0] <= A.W - 2 && q[1] >= 2 && q[1] <= A.H - 2), '図の点が枠外 ' + p.id + ' ' + JSON.stringify(p.scene.theta));
    ok(L.labels.every(l => { const hw = A.texWidth(l.tex) / 2 + 2; return l.p[0] - hw >= 2 && l.p[0] + hw <= A.W - 2 && l.p[1] >= 10 && l.p[1] <= A.H - 10; }), 'ラベルが枠外 ' + p.id + ' ' + JSON.stringify(L.labels.map(l => [l.tex].concat(l.p.map(Math.round)))));
    ok(L.labels.some(l => /\?/.test(l.tex)) === (a.kind === 'length'), '長さの問題には「?」の辺がある ' + p.id);
  }
}
// sin・cos・tan がほぼ同じ割合
for (const cat of Object.keys(cnt)) {
  for (const fn of ['sin', 'cos', 'tan']) ok(cnt[cat][fn] > N * 0.28 && cnt[cat][fn] < N * 0.39, `${cat} の ${fn} の割合 ${cnt[cat][fn]}/${N}`);
}
const allIds = [].concat(...Object.values(A.LENGTH_BY_FN), ...Object.values(A.ANGLE_BY_FN));
ok(allIds.every(id => ids[id] > 0), '全部の型が出る ' + JSON.stringify(ids));

console.log(`checked ${3 * N} apply problems; ${fails} failures`);
process.exit(fails ? 1 : 0);
