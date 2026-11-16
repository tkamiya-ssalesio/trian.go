// trian.go 総合ミックス：これまでの問題の種類をまぜて出す
// 単元を同じ割合で選び，その中の問題の種類を同じ割合で選ぶ（種類の多い単元ばかりにならないように）
// 直前と同じ種類は続けない（選べる種類が2つ以上あるとき）
// ブラウザでは window.TrianMix，Node では require('./mix.js')
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TrianMix = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 単元 → 問題の種類（③ ミックス・⑥ 活用ミックスは中身の種類に分けて入れる）
  const UNITS = [
    { key: 'define', name: '定義', cats: ['three', 'two'] },
    { key: 'relation', name: '相互関係', cats: ['relation'] },
    { key: 'famous', name: '有名角・余角', cats: ['famous', 'comp', 'expr'] },
    { key: 'wide', name: '0°〜180°', cats: ['wideVal', 'wideComp', 'eq', 'slope', 'rel2', 'expr2'] },
    { key: 'apply', name: '活用', cats: ['applyLen', 'applyAng'] }
  ];
  const ALL_KEYS = UNITS.map(u => u.key);

  // 保存していた文字列から単元を読む．空や不正なら全部
  function parseUnits(str) {
    const keys = String(str || '').split(',').filter(k => ALL_KEYS.indexOf(k) >= 0);
    return keys.length ? ALL_KEYS.filter(k => keys.indexOf(k) >= 0) : ALL_KEYS.slice();
  }

  function pickCategory(unitKeys, prevCat, rng) {
    rng = rng || Math.random;
    let units = UNITS.filter(u => unitKeys.indexOf(u.key) >= 0);
    if (!units.length) units = UNITS;
    const total = units.reduce((s, u) => s + u.cats.length, 0);
    for (let i = 0; i < 50; i++) {
      const u = units[Math.floor(rng() * units.length)];
      const c = u.cats[Math.floor(rng() * u.cats.length)];
      if (c !== prevCat || total < 2) return c;
    }
    // 乱数が偏ったとき：直前と違う最初の種類
    const flat = [].concat(...units.map(u => u.cats));
    return flat.find(c => c !== prevCat) || flat[0];
  }

  function unitOf(cat) {
    return UNITS.find(u => u.cats.indexOf(cat) >= 0) || null;
  }

  return { UNITS, ALL_KEYS, parseUnits, pickCategory, unitOf };
}));
