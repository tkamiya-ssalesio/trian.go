/*
 * trian.go core: 問題生成・判定・三角形の配置（画面に依存しない純粋な計算）
 * ブラウザでは window.TrianCore，Node では module.exports で使う．
 *
 * 表記はプリント「数学Ⅰ図形と計量『三角比』」に合わせる：
 *   ∠C = 90°，∠A = θ，斜辺 AB，θ の向かいの辺 BC，θ のとなりの辺 AC
 *   sin θ = BC/AB，cos θ = AC/AB，tan θ = BC/AC
 */
(function (root) {
  'use strict';

  // ---------- 整数の道具 ----------
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { const t = a % b; a = b; b = t; }
    return a;
  }

  function isSquarefree(n) {
    if (!Number.isInteger(n) || n < 1) return false;
    for (let p = 2; p * p <= n; p++) {
      if (n % (p * p) === 0) return false;
    }
    return true;
  }

  // √n = k√m（m は平方因子を含まない）
  function simplifySqrt(n) {
    let k = 1, m = n;
    for (let p = 2; p * p <= m; p++) {
      while (m % (p * p) === 0) { m /= p * p; k *= p; }
    }
    return { k, m };
  }

  // 2乗した値が n の長さを TeX で（例: 8 → 2\sqrt{2}）
  function sqrtTex(n) {
    const { k, m } = simplifySqrt(n);
    if (m === 1) return String(k);
    return (k === 1 ? '' : k) + '\\sqrt{' + m + '}';
  }

  // 長さの目安（文字幅の見積もり用）
  function sqrtPlain(n) {
    const { k, m } = simplifySqrt(n);
    if (m === 1) return String(k);
    return (k === 1 ? '' : k) + '√' + m;
  }

  // ---------- 乱数 ----------
  function makeRng(seed) {
    if (seed === undefined) return Math.random;
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randInt(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  // ---------- 三角形の生成 ----------
  // 3辺の「2乗」を整数で持つ：opp2 = BC²，adj2 = AC²，hyp2 = AB²
  const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];

  function genIntegerTriangle(rng) {
    const t = pick(rng, TRIPLES);
    const maxMul = Math.max(1, Math.floor(30 / t[2]));
    // 倍数（6, 8, 10 など）も混ぜて約分を練習させる
    const mul = rng() < 0.6 ? 1 : randInt(rng, 1, maxMul);
    const a = t[0] * mul, b = t[1] * mul, c = t[2] * mul;
    const swap = rng() < 0.5;
    return { opp2: (swap ? b : a) ** 2, adj2: (swap ? a : b) ** 2, hyp2: c * c };
  }

  function okLength(n, maxK, maxM) {
    const { k, m } = simplifySqrt(n);
    return k <= maxK && m <= maxM;
  }

  // 比 √(n/d) を有理化した形 k√m / D が小さな数で書けるか
  function niceRatio(n, d) {
    const g = gcd(n, d); n /= g; d /= g;
    const { k, m } = simplifySqrt(n * d);
    const g2 = gcd(k, d);
    return m <= 15 && k / g2 <= 20 && d / g2 <= 20;
  }

  function genRadicalTriangle(rng) {
    for (let tries = 0; tries < 1000; tries++) {
      const p = randInt(rng, 1, 36);
      const q = randInt(rng, 1, 36);
      const r = p + q;
      if (Math.max(p, q) / Math.min(p, q) > 12) continue; // 細すぎる三角形を避ける
      if (!okLength(p, 6, 15) || !okLength(q, 6, 15)) continue;
      if (!okLength(r, 6, 50)) continue;
      const allSquare = [p, q, r].every(n => simplifySqrt(n).m === 1);
      if (allSquare) continue; // それは整数の三角形
      // 答え（3つの比）がきれいな形になるものだけ：√ の中は 15 以下，係数・分母は 20 以下
      if (![[p, r], [q, r], [p, q]].every(([n, d]) => niceRatio(n, d))) continue;
      return { opp2: p, adj2: q, hyp2: r };
    }
    return { opp2: 4, adj2: 5, hyp2: 9 };
  }

  // category: 'three'（3辺がわかる）| 'two'（2辺から求める）| 'mix'
  // opts.fixed：向きを固定（θ が左下，直角が右下）．じっくり定義を覚える用
  function generateProblem(category, rng, opts) {
    rng = rng || Math.random;
    opts = opts || {};
    const cat = category === 'mix' ? (rng() < 0.5 ? 'three' : 'two') : category;
    const sq = rng() < 0.4 ? genIntegerTriangle(rng) : genRadicalTriangle(rng);
    let hidden = null;
    if (cat === 'two') {
      const u = rng();
      hidden = u < 0.5 ? 'hyp' : (u < 0.75 ? 'opp' : 'adj');
    }
    return {
      kind: cat,
      opp2: sq.opp2, adj2: sq.adj2, hyp2: sq.hyp2,
      hidden, // 隠す辺（'hyp' = AB，'opp' = BC，'adj' = AC）
      orient: opts.fixed ? Object.assign({}, STANDARD_ORIENT) : randomOrientation(rng)
    };
  }

  const SIDE_NAME = { hyp: 'AB', opp: 'BC', adj: 'AC' };

  // 正解の値の2乗（分子², 分母²）
  function targets(prob) {
    return {
      sin: { n: prob.opp2, d: prob.hyp2 },
      cos: { n: prob.adj2, d: prob.hyp2 },
      tan: { n: prob.opp2, d: prob.adj2 }
    };
  }

  // ---------- 判定 ----------
  // ans = { a, b, c, d, numRoot, frac, denRoot }  値は a√b / (c√d)
  //   空欄は null．√ を付けて係数が空なら 1 とみなす．
  function judgeRatio(ans, target) {
    const numRoot = !!ans.numRoot, frac = !!ans.frac, denRoot = frac && !!ans.denRoot;
    let a = ans.a, b = numRoot ? ans.b : 1;
    let c = frac ? ans.c : 1, d = denRoot ? ans.d : 1;
    if (numRoot && (a === null || a === undefined)) a = 1;
    if (denRoot && (c === null || c === undefined)) c = 1;

    if ([a, b, c, d].some(v => v === null || v === undefined)) {
      return { status: 'empty', hint: '空いている欄があります．' };
    }
    if (![a, b, c, d].every(v => Number.isInteger(v) && v > 0)) {
      return { status: 'invalid', hint: '1 以上の整数を入れてください．' };
    }

    // 値が等しいか（両辺を2乗して比べる）
    if (a * a * b * target.d !== c * c * d * target.n) {
      return { status: 'wrong', hint: '' };
    }

    // ここから先は「値は合っているが，書き方が最も簡単でない」
    if ((numRoot && b === 1) || (denRoot && d === 1)) {
      return { status: 'form', hint: '√1 は 1 です．√ を外しましょう．' };
    }
    if (!isSquarefree(b) || !isSquarefree(d)) {
      return { status: 'form', hint: '√ の中をもっと簡単にできます（例：√8 = 2√2）．' };
    }
    // 分子・分母の両方に √（例：√3/√5）は，有理化しなくても正解．
    // ただし √6/√10 のように √ どうし，または数と √ でまだ約分できるものは書き方ミス
    if (numRoot && denRoot && (gcd(b, d) > 1 || gcd(b, c) > 1)) {
      return { status: 'form', hint: 'まだ約分できます（例：√6/√10 = √3/√5）．' };
    }
    if (frac && c === 1 && !denRoot) {
      return { status: 'form', hint: '分母が 1 なら分数にしないで書きましょう．' };
    }
    if (gcd(a, c) > 1) {
      return { status: 'form', hint: 'まだ約分できます．' };
    }
    if (denRoot && gcd(a, d) > 1) {
      return { status: 'form', hint: 'まだ約分できます（例：3/√3 = √3）．' };
    }
    // 分子・分母がともに √ のときは正解．ただし見やすさのため有理化をすすめる
    if (numRoot && denRoot) {
      return { status: 'correct', hint: '', note: '分母・分子がともに √ のときは，有理化して ' + rationalizedPlain(target.n, target.d) + ' と書くと見やすくなります．' };
    }
    return { status: 'correct', hint: '' };
  }

  // 辺の長さ ans = { k, m, root }  値は k√m
  function judgeSide(ans, target2) {
    const root = !!ans.root;
    let k = ans.k, m = root ? ans.m : 1;
    if (root && (k === null || k === undefined)) k = 1;
    if (k === null || k === undefined || m === null || m === undefined) {
      return { status: 'empty', hint: '空いている欄があります．' };
    }
    if (!Number.isInteger(k) || !Number.isInteger(m) || k < 1 || m < 1) {
      return { status: 'invalid', hint: '1 以上の整数を入れてください．' };
    }
    if (k * k * m !== target2) return { status: 'wrong', hint: '' };
    if (root && m === 1) return { status: 'form', hint: '√1 は 1 です．√ を外しましょう．' };
    if (!isSquarefree(m)) return { status: 'form', hint: '√ の中をもっと簡単にできます（例：√8 = 2√2）．' };
    return { status: 'correct', hint: '' };
  }

  // ---------- 解説用の TeX ----------
  // 値の2乗 n/d を有理化した最も簡単な形に
  // 有理化した形の文字表記（例：√15/5）．画面の短い案内用
  function rationalizedPlain(n, d) {
    const g = gcd(n, d); n /= g; d /= g;
    const { k, m } = simplifySqrt(n * d);
    const g2 = gcd(k, d);
    const kk = k / g2, dd = d / g2;
    const num = m === 1 ? String(kk) : (kk === 1 ? '' : kk) + '√' + m;
    return dd === 1 ? num : num + '/' + dd;
  }

  function rationalizedTex(n, d) {
    const g = gcd(n, d); n /= g; d /= g;
    // √(n/d) = √(n·d) / d
    const { k, m } = simplifySqrt(n * d);
    const g2 = gcd(k, d);
    const kk = k / g2, dd = d / g2;
    const numTex = m === 1 ? String(kk) : (kk === 1 ? '' : kk) + '\\sqrt{' + m + '}';
    return dd === 1 ? numTex : '\\frac{' + numTex + '}{' + dd + '}';
  }

  // 有理化しない形（2/√5，√3/√5 など）．値の2乗 n2/d2 を約分してから分子・分母を簡単にする．
  // 分母に √ が残らない（有理化した形と同じ）なら null
  function naturalTex(n2, d2) {
    const g = gcd(n2, d2);
    const A = simplifySqrt(n2 / g), D = simplifySqrt(d2 / g);
    if (D.m === 1) return null;
    const num = A.m === 1 ? String(A.k) : (A.k === 1 ? '' : A.k) + '\\sqrt{' + A.m + '}';
    return '\\frac{' + num + '}{' + (D.k === 1 ? '' : D.k) + '\\sqrt{' + D.m + '}}';
  }

  function ratioLines(prob) {
    const S = { hyp: sqrtTex(prob.hyp2), opp: sqrtTex(prob.opp2), adj: sqrtTex(prob.adj2) };
    const rows = [
      ['sin', 'BC', 'AB', 'opp', 'hyp'],
      ['cos', 'AC', 'AB', 'adj', 'hyp'],
      ['tan', 'BC', 'AC', 'opp', 'adj']
    ];
    return rows.map(([fn, nn, dn, nk, dk]) => {
      const n2 = prob[nk + '2'], d2 = prob[dk + '2'];
      const best = rationalizedTex(n2, d2);
      const nat = naturalTex(n2, d2);
      const raw = '\\frac{' + S[nk] + '}{' + S[dk] + '}';
      let tex = '\\' + fn + '\\theta = \\frac{\\mathrm{' + nn + '}}{\\mathrm{' + dn + '}} = ' + raw;
      const denHasRoot = simplifySqrt(d2).m !== 1; // 分母がもともと整数なら，有理化しない形は書かない
      if (nat && denHasRoot && nat !== raw) tex += ' = ' + nat;
      if (best !== raw && best !== nat) tex += ' = ' + best;
      return { fn, tex, alt: nat };
    });
  }

  function pythagorasTex(prob) {
    if (!prob.hidden) return null;
    const AB = sqrtTex(prob.hyp2), BC = sqrtTex(prob.opp2), AC = sqrtTex(prob.adj2);
    const sq = s => (s.indexOf('\\sqrt') >= 0 ? '(' + s + ')' : s) + '^2';
    if (prob.hidden === 'hyp') {
      return '\\mathrm{AB} = \\sqrt{' + sq(AC) + ' + ' + sq(BC) + '} = \\sqrt{' + prob.hyp2 + '} = ' + AB;
    }
    if (prob.hidden === 'opp') {
      return '\\mathrm{BC} = \\sqrt{' + sq(AB) + ' - ' + sq(AC) + '} = \\sqrt{' + prob.opp2 + '} = ' + BC;
    }
    return '\\mathrm{AC} = \\sqrt{' + sq(AB) + ' - ' + sq(BC) + '} = \\sqrt{' + prob.adj2 + '} = ' + AC;
  }

  // ---------- 三角形の向きと配置 ----------
  const STANDARD_ORIENT = { mode: 'axis', phi: 0, flip: false };

  function randomOrientation(rng) {
    const u = rng();
    let mode, phi;
    if (u < 0.45) { mode = 'axis'; phi = pick(rng, [0, 90, 180, 270]); }
    else if (u < 0.75) { mode = 'hyp'; phi = pick(rng, [0, 180]); } // 斜辺を水平に
    else { mode = 'free'; phi = randInt(rng, 0, 359); }
    return { mode, phi, flip: rng() < 0.5 };
  }

  const VIEW_W = 360, VIEW_H = 260;

  // 画面座標（y 下向き）での頂点とラベル位置を返す
  // opts.unit を渡すと拡大率を固定する（相似の解説用）
  function layoutTriangle(prob, opts) {
    opts = opts || {};
    const W = opts.width || VIEW_W, H = opts.height || VIEW_H;
    const pad = opts.pad || 46;
    const opp = Math.sqrt(prob.opp2), adj = Math.sqrt(prob.adj2);
    const o = prob.orient || { mode: 'axis', phi: 0, flip: false };

    // 局所座標（y 上向き）：A 原点，C は x 軸上，B は C の真上
    let pts = { A: [0, 0], C: [adj, 0], B: [adj, opp] };
    if (o.flip) for (const key in pts) pts[key] = [pts[key][0], -pts[key][1]];

    let phiDeg = o.phi;
    if (o.mode === 'hyp') {
      const ang = Math.atan2(pts.B[1], pts.B[0]) * 180 / Math.PI; // AB の向き
      phiDeg = o.phi - ang;
    }
    const ph = phiDeg * Math.PI / 180;
    const cs = Math.cos(ph), sn = Math.sin(ph);
    for (const key in pts) {
      const [x, y] = pts[key];
      // 回して，y を下向きに直す
      pts[key] = [x * cs - y * sn, -(x * sn + y * cs)];
    }

    const xs = Object.values(pts).map(p => p[0]);
    const ys = Object.values(pts).map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = maxX - minX || 1, h = maxY - minY || 1;
    const scale = opts.unit || Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
    let ox, oy;
    if (opts.anchor) { // A を固定位置に置く
      ox = opts.anchor[0] - pts.A[0] * scale;
      oy = opts.anchor[1] - pts.A[1] * scale;
    } else {
      ox = (W - w * scale) / 2 - minX * scale;
      oy = (H - h * scale) / 2 - minY * scale;
    }
    const P = {};
    for (const key in pts) P[key] = [pts[key][0] * scale + ox, pts[key][1] * scale + oy];

    const G = [(P.A[0] + P.B[0] + P.C[0]) / 3, (P.A[1] + P.B[1] + P.C[1]) / 3];
    const unit = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
    const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
    const add = (p, v, s) => [p[0] + v[0] * s, p[1] + v[1] * s];

    // 頂点ラベル：重心から外向き
    const vertexLabels = {};
    for (const key of ['A', 'B', 'C']) {
      vertexLabels[key] = add(P[key], unit(sub(P[key], G)), 17);
    }

    // 辺ラベル：中点から外向きの法線方向．文字幅に応じて離す
    const sideDefs = { hyp: ['A', 'B', 'C'], opp: ['B', 'C', 'A'], adj: ['A', 'C', 'B'] };
    const sideLabels = {};
    const labelText = opts.labelText || {};
    for (const key in sideDefs) {
      const [p, q, r] = sideDefs[key];
      const M = [(P[p][0] + P[q][0]) / 2, (P[p][1] + P[q][1]) / 2];
      const dir = unit(sub(P[q], P[p]));
      let nrm = [-dir[1], dir[0]];
      if ((M[0] - P[r][0]) * nrm[0] + (M[1] - P[r][1]) * nrm[1] < 0) nrm = [-nrm[0], -nrm[1]];
      const txt = labelText[key] !== undefined ? labelText[key] : sqrtPlain(prob[key + '2']);
      const halfW = Math.max(8, String(txt).length * 5.2 + 4);
      const halfH = 12;
      const off = 6 + Math.abs(nrm[0]) * halfW + Math.abs(nrm[1]) * halfH;
      sideLabels[key] = add(M, nrm, off);
    }

    // θ：A の二等分線上
    const uAC = unit(sub(P.C, P.A)), uAB = unit(sub(P.B, P.A));
    const bis = unit([uAC[0] + uAB[0], uAC[1] + uAB[1]]);
    const theta = Math.atan2(opp, adj);
    const arcR = 22;
    const thetaR = theta < 0.45 ? 52 : (theta < 0.7 ? 42 : 36);
    const thetaLabel = add(P.A, bis, thetaR);
    const arcStart = add(P.A, uAC, arcR), arcEnd = add(P.A, uAB, arcR);
    const cross = uAC[0] * uAB[1] - uAC[1] * uAB[0];
    const arcSweep = cross > 0 ? 1 : 0;

    // 直角の印
    const uCA = unit(sub(P.A, P.C)), uCB = unit(sub(P.B, P.C));
    const s = 13;
    const rightMark = [add(P.C, uCA, s), add(add(P.C, uCA, s), uCB, s), add(P.C, uCB, s)];

    return { W, H, P, vertexLabels, sideLabels, thetaLabel, arc: { start: arcStart, end: arcEnd, r: arcR, sweep: arcSweep }, rightMark, scale };
  }

  const api = {
    gcd, isSquarefree, simplifySqrt, sqrtTex, sqrtPlain, makeRng,
    generateProblem, genIntegerTriangle, genRadicalTriangle, randomOrientation,
    targets, judgeRatio, judgeSide, rationalizedTex, naturalTex, ratioLines, pythagorasTex,
    layoutTriangle, SIDE_NAME, VIEW_W, VIEW_H
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TrianCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
