// trian.go 苦手の集計：問題の種類ごとに「最初の判定で正解できたか」を数え，苦手を見つける
// 端末の localStorage に持つ．画面に依存しない．ブラウザでは window.TrianStats，Node では require('./stats.js')
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TrianStats = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'trian.stats.v1';
  const WINDOW = 10;      // 直近の何問で見るか
  const MIN_TRIES = 5;    // これより少ないうちは判定しない
  const WEAK_BELOW = 0.7; // 直近の正解率がこれ未満で「苦手」
  const CLEAR_AT = 0.8;   // 直近の正解率がこれ以上で「克服」（境目で付いたり消えたりしないよう，幅を持たせる）
  const HINT_MAX = 3;     // 種類ごとに残す，最近もらった案内の数
  // 結果：c = 最初の判定で正解，f = 値は合っているが形が違う（△），w = 間違い（✕）
  const OUTCOMES = ['c', 'f', 'w'];

  const count = (s, ch) => s.split(ch).length - 1;
  const validTopic = t => typeof t === 'string' && /^[A-Za-z0-9]{1,24}$/.test(t);

  // 1つの種類のまとめ
  function view(topic, t) {
    const recentN = t.recent.length;
    const ok = count(t.recent, 'c');
    const form = count(t.recent, 'f');
    const miss = recentN - ok;
    return {
      topic, n: t.n, recentN, ok,
      rate: recentN ? ok / recentN : 0,
      judged: recentN >= MIN_TRIES,
      weak: !!t.weak,
      // 直近のミスのうち，形のミス（約分・√ の整理など）が半分以上か
      mostlyForm: miss > 0 && form * 2 >= miss,
      hints: t.hints.slice()
    };
  }

  // 1問の最初の判定を足す．data は書き換えない
  function log(data, topic, outcome, hints) {
    if (!validTopic(topic) || OUTCOMES.indexOf(outcome) < 0) return { data, logged: false };
    const old = data[topic] || { n: 0, recent: '', weak: false, hints: [] };
    const t = { n: old.n + 1, recent: (old.recent + outcome).slice(-WINDOW), weak: old.weak, hints: old.hints };
    if (outcome !== 'c' && Array.isArray(hints)) {
      const fresh = hints.filter(h => typeof h === 'string' && h).map(h => h.slice(0, 200));
      t.hints = fresh.concat(old.hints.filter(h => fresh.indexOf(h) < 0)).slice(0, HINT_MAX);
    }
    const v = view(topic, t);
    let becameWeak = false, overcame = false;
    if (v.judged && !t.weak && v.rate < WEAK_BELOW) { t.weak = true; becameWeak = true; }
    else if (v.judged && t.weak && v.rate >= CLEAR_AT) { t.weak = false; t.hints = []; overcame = true; }
    const next = Object.assign({}, data);
    next[topic] = t;
    return { data: next, logged: true, becameWeak, overcame, view: view(topic, t) };
  }

  // order に並べた種類の順で，解いたことのある種類のまとめを返す
  function summary(data, order) {
    return order.filter(k => data[k]).map(k => view(k, data[k]));
  }

  // 苦手な種類．正解率の低い順（同じなら order の順）
  function weakTopics(data, order) {
    return summary(data, order).filter(v => v.weak).sort((a, b) => a.rate - b.rate);
  }

  // 苦手の中から1つ選ぶ．正解率が低いほど出やすい．avoid は直前の種類（2つ以上あるときは続けない）
  function pick(views, rng, avoid) {
    let pool = views.length > 1 ? views.filter(v => v.topic !== avoid) : views;
    if (!pool.length) return null;
    const w = pool.map(v => 1.2 - v.rate);
    let x = rng() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x < 0) return pool[i].topic; }
    return pool[pool.length - 1].topic;
  }

  // 壊れた値が入っていても落ちないよう，読める種類だけ残す
  function clean(data) {
    const out = {};
    if (!data || typeof data !== 'object' || Array.isArray(data)) return out;
    Object.keys(data).forEach(k => {
      const t = data[k];
      if (!validTopic(k) || !t || typeof t !== 'object') return;
      if (typeof t.recent !== 'string' || !/^[cfw]+$/.test(t.recent)) return;
      const recent = t.recent.slice(-WINDOW);
      const n = (typeof t.n === 'number' && isFinite(t.n) && t.n >= recent.length) ? Math.floor(t.n) : recent.length;
      const hints = Array.isArray(t.hints) ? t.hints.filter(h => typeof h === 'string' && h).slice(0, HINT_MAX) : [];
      out[k] = { n, recent, weak: t.weak === true, hints };
    });
    return out;
  }

  function load(storage) {
    try { return clean(JSON.parse(storage.getItem(STORAGE_KEY))); } catch (e) { return {}; }
  }
  function save(storage, data) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  }
  function clear(storage) {
    try { storage.removeItem(STORAGE_KEY); return true; } catch (e) { return false; }
  }

  return { STORAGE_KEY, WINDOW, MIN_TRIES, WEAK_BELOW, CLEAR_AT, HINT_MAX, log, summary, weakTopics, pick, clean, load, save, clear };
}));
