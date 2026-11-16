// trian.go 自己ベストの記録：モード × 問題の種類（× 三角形の向き）ごとに，端末の localStorage に持つ
// 画面に依存しない．ブラウザでは window.TrianRecords，Node では require('./records.js')
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TrianRecords = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 配点やルールを変えて記録を比べられなくなったら v2 に上げる（古い記録は読まない）
  const STORAGE_KEY = 'trian.records.v1';
  const RECENT_MAX = 5;
  // 記録を残すモード（練習モードは残さない）．lower: 値が小さいほど良い
  const MODES = {
    timeAttack: { lower: true },
    survival: { lower: false },
    scoreAttack: { lower: false }
  };
  // 向きの設定（毎回変わる／いつも同じ）が効く種類．「いつも同じ」は易しいので記録を分ける
  const ORIENT_CATS = ['three', 'two', 'mix'];

  const isRecorded = mode => Object.prototype.hasOwnProperty.call(MODES, mode);
  const usesOrient = cat => ORIENT_CATS.indexOf(cat) >= 0;

  function boardKey(mode, cat, fixed) {
    return mode + '|' + cat + (fixed && usesOrient(cat) ? '|fixed' : '');
  }

  // a が b より良い記録か（同じ値は false．先に出したほうを残す）
  function better(mode, a, b) {
    return MODES[mode].lower ? a < b : a > b;
  }

  function format(mode, v) {
    if (mode === 'timeAttack') return v.toFixed(1) + ' 秒';
    if (mode === 'survival') return v + ' 問';
    return v + ' 点';
  }

  // ベストまでの差（「あと 1.2 秒」など）
  function gapText(mode, value, best) {
    const d = Math.abs(value - best);
    return format(mode, mode === 'timeAttack' ? Math.round(d * 10) / 10 : d);
  }

  const validValue = v => typeof v === 'number' && isFinite(v) && v >= 0;
  const validEntry = e => !!e && typeof e === 'object' && validValue(e.v);

  // 壊れた値・他人が書いた値が入っていても落ちないよう，読める板だけ残す
  function clean(data) {
    const out = {};
    if (!data || typeof data !== 'object' || Array.isArray(data)) return out;
    Object.keys(data).forEach(key => {
      const b = data[key];
      if (!isRecorded(key.split('|')[0])) return;
      if (!b || typeof b !== 'object' || !validEntry(b.best)) return;
      const recent = Array.isArray(b.recent) ? b.recent.filter(validEntry).slice(0, RECENT_MAX) : [];
      const plays = (typeof b.plays === 'number' && b.plays >= 1) ? Math.floor(b.plays) : Math.max(1, recent.length);
      out[key] = { best: b.best, plays, recent };
    });
    return out;
  }

  // 1回のプレイを足す．data は書き換えず，新しい data と結果を返す
  // value: タイム（秒）・正解数・スコア ／ extra: { combo } など結果に添える値
  function add(data, mode, cat, fixed, value, extra, now) {
    if (!isRecorded(mode) || !validValue(value)) return { data, recorded: false };
    const key = boardKey(mode, cat, fixed);
    const old = data[key];
    const entry = Object.assign({ v: value, at: now }, extra || {});
    const isFirst = !old;
    const isBest = isFirst || better(mode, value, old.best.v);
    const next = Object.assign({}, data);
    next[key] = {
      best: isBest ? entry : old.best,
      plays: (old ? old.plays : 0) + 1,
      recent: [entry].concat(old ? old.recent : []).slice(0, RECENT_MAX)
    };
    return { data: next, recorded: true, key, isFirst, isBest, prevBest: old ? old.best.v : null, best: next[key].best.v };
  }

  function get(data, mode, cat, fixed) {
    return data[boardKey(mode, cat, fixed)] || null;
  }

  // storage は localStorage と同じ形（getItem / setItem / removeItem）．使えなくても落ちない
  function load(storage) {
    try { return clean(JSON.parse(storage.getItem(STORAGE_KEY))); } catch (e) { return {}; }
  }
  function save(storage, data) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  }
  function clear(storage) {
    try { storage.removeItem(STORAGE_KEY); return true; } catch (e) { return false; }
  }

  return { STORAGE_KEY, RECENT_MAX, MODES, isRecorded, usesOrient, boardKey, better, format, gapText, clean, add, get, load, save, clear };
}));
