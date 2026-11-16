// node tests/mix.test.js で実行する．失敗があれば exit 1．
const M = require('../mix.js');

let fails = 0;
function ok(cond, msg) { if (!cond) { fails++; if (fails <= 30) console.error('NG:', msg); } }

// 1. 単元の読み込み：空・不正は全部，順番は単元の順にそろえる
ok(M.parseUnits(null).join() === M.ALL_KEYS.join(), '保存なし → 全部');
ok(M.parseUnits('xxx,').join() === M.ALL_KEYS.join(), '不正 → 全部');
ok(M.parseUnits('apply,define').join() === 'define,apply', '単元の順にそろえる');

// 2. ①〜⑯ の種類がすべてどこかの単元に入っている（③・⑥ は中身に分けるので入れない）
const all = [].concat(...M.UNITS.map(u => u.cats));
ok(all.length === 14 && new Set(all).size === 14, '種類は14（重なりなし）');
for (const c of all) ok(M.unitOf(c), `単元がある ${c}`);

// 3. 選んだ単元の種類だけが出る，直前と同じ種類は続かない，単元は同じ割合
let seed = 12345;
const rng = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const N = 60000;
for (const units of [M.ALL_KEYS, ['wide', 'relation'], ['define'], ['relation']]) {
  const allowed = [].concat(...M.UNITS.filter(u => units.indexOf(u.key) >= 0).map(u => u.cats));
  const count = {};
  let prev = null;
  for (let i = 0; i < N; i++) {
    const c = M.pickCategory(units, prev, rng);
    ok(allowed.indexOf(c) >= 0, `選んだ単元の外 ${units} → ${c}`);
    if (allowed.length > 1) ok(c !== prev, `直前と同じ ${c}`);
    const u = M.unitOf(c).key;
    count[u] = (count[u] || 0) + 1;
    prev = c;
  }
  if (units.length > 1) {
    for (const u of units) {
      const r = count[u] / N;
      // 直前と同じ種類を避けるぶん，種類の少ない単元は少し減る（相互関係は1種類なので連続しない）
      ok(r > 0.6 / units.length && r < 1.4 / units.length, `単元の割合 ${units} ${u} ${r.toFixed(3)}`);
    }
  }
  ok(Object.keys(count).length === units.length, `すべての単元が出る ${units}`);
}
// 単元が空なら全部から
ok(all.indexOf(M.pickCategory([], null, rng)) >= 0, '空 → 全部から');

if (fails) { console.error(`mix: ${fails} 件の失敗`); process.exit(1); }
console.log('mix: all ok');
