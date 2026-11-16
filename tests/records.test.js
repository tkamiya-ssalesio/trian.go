// node tests/records.test.js で実行する．失敗があれば exit 1．
const R = require('../records.js');

let fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; if (fails <= 30) console.error('NG:', msg); } }
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)}（期待 ${JSON.stringify(b)}）`);

// localStorage の代わり
function memStorage(init) {
  const m = Object.assign({}, init);
  return {
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; },
    dump: () => m
  };
}

// 1. 板のキー：向きの設定は ①〜③ だけ分ける
eq(R.boardKey('timeAttack', 'three', false), 'timeAttack|three', '向きが変わる');
eq(R.boardKey('timeAttack', 'three', true), 'timeAttack|three|fixed', '向きが同じ');
eq(R.boardKey('timeAttack', 'famous', true), 'timeAttack|famous', '向きが効かない種類は分けない');
ok(!R.isRecorded('practice'), '練習モードは記録しない');
ok(!R.isRecorded('constructor') && !R.isRecorded('toString'), 'Object の持ち物をモードと見なさない');

// 2. 良い順：タイムは短いほど，正解数・スコアは多いほど
ok(R.better('timeAttack', 12.3, 15) && !R.better('timeAttack', 15, 12.3), 'タイムは短いほうが良い');
ok(R.better('survival', 8, 5) && !R.better('survival', 5, 8), '正解数は多いほうが良い');
ok(R.better('scoreAttack', 900, 850) && !R.better('scoreAttack', 850, 900), 'スコアは高いほうが良い');
for (const m of Object.keys(R.MODES)) ok(!R.better(m, 7, 7), m + '：同じ値は更新にしない');

// 3. 表示
eq(R.format('timeAttack', 12), '12.0 秒', 'タイムの表示');
eq(R.format('survival', 8), '8 問', '正解数の表示');
eq(R.format('scoreAttack', 1250), '1250 点', 'スコアの表示');
eq(R.gapText('timeAttack', 13.5, 12.3), '1.2 秒', 'タイムの差（0.1 の誤差を出さない）');
eq(R.gapText('timeAttack', 12.4, 12.3), '0.1 秒', 'タイムの差 0.1');
eq(R.gapText('scoreAttack', 600, 850), '250 点', 'スコアの差');

// 4. 記録を足す
let d = {};
let r = R.add(d, 'timeAttack', 'three', false, 20.5, null, 1000);
ok(r.recorded && r.isFirst && r.isBest && r.prevBest === null && r.best === 20.5, 'はじめての記録');
eq(d, {}, '元の data は書き換えない');
d = r.data;
r = R.add(d, 'timeAttack', 'three', false, 25.0, null, 2000);
ok(!r.isFirst && !r.isBest && r.prevBest === 20.5 && r.best === 20.5, '遅いタイムは更新にしない');
d = r.data;
r = R.add(d, 'timeAttack', 'three', false, 18.2, null, 3000);
ok(r.isBest && r.prevBest === 20.5 && r.best === 18.2, '速いタイムで更新');
d = r.data;
r = R.add(d, 'timeAttack', 'three', false, 18.2, null, 4000);
ok(!r.isBest, '同じタイムは更新にしない');
d = r.data;
const b = R.get(d, 'timeAttack', 'three', false);
eq(b.plays, 4, 'プレイ回数');
eq(b.best, { v: 18.2, at: 3000 }, 'ベストは先に出したほう');
eq(b.recent.map(e => e.v), [18.2, 18.2, 25, 20.5], '直近は新しい順');

// 向きが同じ・別のモード・別の種類は別の板
ok(R.get(d, 'timeAttack', 'three', true) === null, '向きが同じ の板は別');
ok(R.get(d, 'survival', 'three', false) === null, '別のモードの板は別');
r = R.add(d, 'timeAttack', 'three', true, 10, null, 5000);
ok(r.isFirst && R.get(r.data, 'timeAttack', 'three', false).best.v === 18.2, '向きが同じ の記録は 向きが変わる のベストを変えない');

// スコアアタック：最大コンボを添える
d = R.add({}, 'scoreAttack', 'famous', false, 850, { combo: 4 }, 1).data;
r = R.add(d, 'scoreAttack', 'famous', false, 1200, { combo: 6 }, 2);
eq(R.get(r.data, 'scoreAttack', 'famous', false).best, { v: 1200, at: 2, combo: 6 }, 'スコアのベストとコンボ');
r = R.add(r.data, 'scoreAttack', 'famous', false, 0, { combo: 0 }, 3);
ok(r.recorded && !r.isBest, '0 点も記録するが更新にはしない');

// サバイバル
d = R.add({}, 'survival', 'eq', false, 0, null, 1).data;
r = R.add(d, 'survival', 'eq', false, 3, null, 2);
ok(r.isBest && r.prevBest === 0, 'サバイバルの更新');

// 直近は RECENT_MAX 件まで
d = {};
for (let i = 1; i <= 12; i++) d = R.add(d, 'survival', 'mix', false, i, null, i).data;
eq(R.get(d, 'survival', 'mix', false).recent.map(e => e.v), [12, 11, 10, 9, 8], '直近は5件');
eq(R.get(d, 'survival', 'mix', false).plays, 12, '回数は全部数える');

// 記録しないもの
for (const [mode, v] of [['practice', 5], ['timeAttack', NaN], ['timeAttack', -1], ['survival', Infinity], ['scoreAttack', '100'], ['nope', 1]]) {
  r = R.add(d, mode, 'mix', false, v, null, 1);
  ok(!r.recorded && r.data === d, `記録しない：${mode} ${v}`);
}

// 5. 保存と読み込み
const s = memStorage();
eq(R.load(s), {}, '何もないとき');
ok(R.save(s, d), '保存できる');
eq(R.load(s), d, '保存して読むと同じ');
ok(R.clear(s) && s.getItem(R.STORAGE_KEY) === null, '消せる');
eq(R.load(s), {}, '消したあと');

// 壊れた中身でも落ちない
for (const raw of ['', '{', 'null', '[]', '"x"', '123', '{"timeAttack|three":null}', '{"timeAttack|three":{"best":{"v":"1"}}}', '{"practice|three":{"best":{"v":3}}}', '{"x":{"best":{"v":3}}}']) {
  eq(R.load(memStorage({ [R.STORAGE_KEY]: raw })), {}, '壊れた中身 ' + raw);
}
// 読めるところは残す
eq(R.load(memStorage({ [R.STORAGE_KEY]: '{"survival|eq":{"best":{"v":4,"at":9},"recent":[{"v":4,"at":9},{"v":"x"},null]},"bad":1}' })),
  { 'survival|eq': { best: { v: 4, at: 9 }, plays: 1, recent: [{ v: 4, at: 9 }] } }, '読める板だけ残す');
// 使えない storage（プライベートブラウズなど）
const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
eq(R.load(broken), {}, '読めない storage');
ok(R.save(broken, d) === false && R.clear(broken) === false, '書けない storage は false');
eq(R.load(undefined), {}, 'storage がない');

console.log(`checked ${checks} record cases; ${fails} failures`);
process.exit(fails ? 1 : 0);
