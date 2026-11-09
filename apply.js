// trian.go 三角比の活用：問題生成・判定・解説・図の配置（画面に依存しない）
// ブラウザでは window.TrianApply，Node では require('./apply.js')
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TrianApply = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RAD = Math.PI / 180;

  // 三角比の表（教科書と同じ4桁）．値は 10000 倍した整数で持つ
  const TABLE = { sin: [], cos: [], tan: [] };
  for (let t = 0; t <= 90; t++) {
    TABLE.sin[t] = Math.round(Math.sin(t * RAD) * 10000 + 1e-9);
    TABLE.cos[t] = Math.round(Math.cos(t * RAD) * 10000 + 1e-9);
    TABLE.tan[t] = t === 90 ? null : Math.round(Math.tan(t * RAD) * 10000 + 1e-9);
  }
  const t4 = v => (v / 10000).toFixed(4); // 表の値の表記（0.3839）

  // --- 乱数 ---
  const randInt = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  // --- 数の扱い ---
  // num/den を小数第 digits 位に四捨五入した値を「10^-digits 単位の整数」で返す
  function roundUnits(num, den, digits) {
    const x = num * Math.pow(10, digits);
    return Math.floor((2 * x + den) / (2 * den));
  }
  // 単位の整数を表記に（digits=1, 54 → "5.4"）
  function unitsStr(u, digits) {
    if (digits === 0) return String(u);
    const s = String(Math.abs(u)).padStart(digits + 1, '0');
    return (u < 0 ? '-' : '') + s.slice(0, -digits) + '.' + s.slice(-digits);
  }
  // 正の有理数 num/den の小数表記（末尾の0は落とす）
  function decStr(num, den, maxDigits) {
    const md = maxDigits === undefined ? 4 : maxDigits;
    const u = roundUnits(num, den, md);
    return unitsStr(u, md).replace(/\.?0+$/, '');
  }
  // 割り切れるか（小数第 md 位までで終わるか）
  function isExactDec(num, den, md) {
    return (num * Math.pow(10, md)) % den === 0;
  }
  const fmtM = v => String(v); // 1.6 などの表示

  // 入力の文字列 → { ok, units(10^-digits 単位), digits(書いた小数の桁数), value }
  function parseAnswer(str) {
    if (str === null || str === undefined) return { empty: true };
    const s = String(str)
      .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .replace(/[．。]/g, '.').replace(/\s/g, '');
    if (s === '') return { empty: true };
    if (!/^\d+(\.\d+)?$/.test(s)) return { invalid: true };
    const [ip, fp = ''] = s.split('.');
    return { int: ip, frac: fp, value: parseFloat(s) };
  }
  // 書いた答えを digits 桁の単位に直す．桁が多すぎるときは extra に余分な桁を入れる
  function toUnits(p, digits) {
    const frac = p.frac.replace(/0+$/, ''); // 末尾の0は気にしない（5.40 = 5.4）
    if (frac.length > digits) return { over: true };
    const f = (frac + '0'.repeat(digits)).slice(0, digits);
    return { units: parseInt(p.int + f, 10) };
  }

  // ============================================================
  // 問題の型
  //   長さを求める（sin・cos・tan を同じ割合で）と，角度を表から求める
  // ============================================================
  const PLACE = {
    0: '1 m 未満を四捨五入して答えよ．',
    1: '小数第2位を四捨五入して答えよ．'
  };

  // 長さの答え：表の値で計算した値を基準に，最後の桁 ±1 まで正解
  function lengthAnswer(o) {
    // o: { digits, num, den, label, unit, alts:[{num,den,hint}], also:[{num,den}] }
    const base = roundUnits(o.num, o.den, o.digits);
    const accepts = [base];
    (o.also || []).forEach(a => accepts.push(roundUnits(a.num, a.den, o.digits)));
    return {
      kind: 'length', digits: o.digits, unit: o.unit || 'm', label: o.label,
      base, accepts, exact: o.num / o.den,
      alts: (o.alts || []).map(a => ({ units: roundUnits(a.num, a.den, o.digits), exact: a.num / a.den, hint: a.hint }))
    };
  }

  // 角度の答え：比の値 r = n/d に表で最も近い角（mode 'nearest'），または r 以下で最大の角（'floor'）
  function angleAnswer(fn, n, d, mode) {
    const T = TABLE[fn];
    // |T[t]/10000 - n/d| を比べる → |T[t]*d - n*10000|
    let best = null, bestDiff = Infinity;
    for (let t = 1; t <= 89; t++) {
      const diff = Math.abs(T[t] * d - n * 10000);
      if (diff < bestDiff) { bestDiff = diff; best = t; }
    }
    let ans = best;
    if (mode === 'floor') {
      ans = 0;
      for (let t = 1; t <= 89; t++) if (T[t] * d <= n * 10000) ans = t; // tan は増加
    }
    return { kind: 'angle', fn, n, d, mode, ans, nearest: best };
  }

  // 比の値が表の2つの角のちょうど中間付近だと，表から1つに決めにくい → 出題しない
  function angleClear(fn, n, d, mode) {
    const T = TABLE[fn];
    const r = n / d;
    for (let t = 1; t <= 88; t++) {
      const lo = Math.min(T[t], T[t + 1]) / 10000, hi = Math.max(T[t], T[t + 1]) / 10000;
      if (r >= lo && r <= hi) {
        const gap = hi - lo;
        if (mode === 'floor') return Math.min(r - lo, hi - r) >= 0.001; // 表の値にほぼ等しいものは避ける
        return Math.abs(r - (lo + hi) / 2) >= 0.2 * gap;
      }
    }
    return false;
  }

  // --- 図の配置（360×260）．A：角の頂点，C：直角，B：残り ---
  const W = 360, H = 260;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // 地面から立ち上がる直角三角形（A 左下，C 右下，B 右上）
  function riseScene(theta, labels, opt) {
    opt = opt || {};
    const phi = clamp(theta, 12, 66) * RAD;
    const bottom = opt.eye ? 196 : 214;
    const maxW = opt.eye ? 212 : 236, maxH = opt.eye ? 160 : 176;
    let w = maxW, h = w * Math.tan(phi);
    if (h > maxH) { h = maxH; w = h / Math.tan(phi); }
    const x0 = 180 - w / 2 + (opt.eye ? 8 : -6); // 目の高さの図は左にラベルが付くので少し右へ
    const A = [x0, bottom], C = [x0 + w, bottom], B = [x0 + w, bottom - h];
    const sc = { kind: 'rise', A, B, C, theta, labels, eye: !!opt.eye };
    if (opt.eye) { sc.E = [A[0], bottom + 30]; sc.D = [C[0], bottom + 30]; }
    return sc;
  }

  // 高い所から見下ろす（A 左上，C 左下＝A の真下，B 右下）．俯角は A で水平線から測る
  function depressionScene(alpha, labels) {
    const a = clamp(alpha, 14, 62) * RAD;
    const maxW = 220, maxH = 168;
    let h = maxH, w = h / Math.tan(a);
    if (w > maxW) { w = maxW; h = w * Math.tan(a); }
    const x0 = 180 - w / 2 + 6, top = 40;
    const A = [x0, top], C = [x0, top + h], B = [x0 + w, top + h];
    return { kind: 'depression', A, B, C, theta: alpha, labels };
  }

  // 図の部品（線・弧・直角の印・ラベル位置）．画面側はこれを描くだけ
  //   labels のキー：theta / hyp / opp / adj（値は TeX．'?' は求める辺）/ eye / target / wall
  // ラベルのおおよその幅（px）．数式の命令を除いた文字数から見積もる
  function texWidth(tex) {
    const plain = String(tex).replace(/\\(mathrm|text)\{([^}]*)\}/g, '$2').replace(/\\,/g, ' ').replace(/\\[a-z]+|[{}^]/g, '');
    let w = 0;
    for (const ch of plain) w += /[\u3000-\u9fff]/.test(ch) ? 18 : 10;
    return w;
  }

  function sceneLayout(sc) {
    const L = sc.labels;
    const out = { lines: [], polys: [], arc: null, right: null, labels: [] };
    const lab = (p, tex, cls) => out.labels.push({ p, tex, cls });
    const unknown = k => L[k] === '?';
    const r = 22;
    if (sc.kind === 'rise') {
      const { A, B, C } = sc;
      const phi = Math.atan2(C[1] - B[1], C[0] - A[0]); // 図の上の角
      out.polys.push({ pts: [A, B, C], cls: 'tri-fill' });
      if (!sc.eye) out.lines.push({ p: [A[0] - 22, A[1]], q: [C[0] + 18, C[1]], cls: 'ground' });
      if (sc.eye) {
        out.lines.push({ p: [sc.E[0] - 22, sc.E[1]], q: [sc.D[0] + 22, sc.D[1]], cls: 'ground' });
        out.lines.push({ p: A, q: sc.E, cls: 'tri-side thin' });
        out.lines.push({ p: C, q: sc.D, cls: 'tri-side' });
      }
      if (L.wall) out.lines.push({ p: [C[0] + 8, C[1]], q: [C[0] + 8, B[1] - 24], cls: 'wall' });
      out.lines.push({ p: A, q: B, cls: 'tri-side' + (unknown('hyp') ? ' is-hidden' : '') });
      out.lines.push({ p: B, q: C, cls: 'tri-side' + (unknown('opp') ? ' is-hidden' : '') });
      out.lines.push({ p: A, q: C, cls: 'tri-side' + (unknown('adj') ? ' is-hidden' : '') });
      out.arc = { A, r, start: [A[0] + r, A[1]], end: [A[0] + r * Math.cos(phi), A[1] - r * Math.sin(phi)], sweep: 0 };
      const s = 12;
      out.right = [[C[0] - s, C[1]], [C[0] - s, C[1] - s], [C[0], C[1] - s]];
      // θ のラベル：二等分線上で，2本の辺の間にラベルが収まる距離に置く．
      // 角がとても小さいときは斜辺の少し外側
      const lenAC = C[0] - A[0];
      const dist = Math.min(Math.max(44, 30 / Math.sin(phi)), 0.6 * lenAC);
      const tp = phi >= 20 * RAD
        ? [A[0] + dist * Math.cos(phi / 2), A[1] - dist * Math.sin(phi / 2)]
        : [A[0] + 36 * Math.cos(phi + 16 * RAD), A[1] - 36 * Math.sin(phi + 16 * RAD)];
      lab(tp, L.theta, 'lbl-theta');
      if (sc.eye) {
        lab([A[0] - 14, A[1] - 8], '\\mathrm{A}', 'lbl-vertex');
        lab([B[0], B[1] - 14], '\\mathrm{B}', 'lbl-vertex');
        lab([C[0] + 10, C[1] + 14], '\\mathrm{C}', 'lbl-vertex');
        lab([sc.D[0] + 12, sc.D[1] + 12], '\\mathrm{D}', 'lbl-vertex');
        lab([sc.E[0] - 12, sc.E[1] + 12], '\\mathrm{E}', 'lbl-vertex');
        lab([A[0] - 8 - texWidth(L.eye) / 2, (A[1] + sc.E[1]) / 2], L.eye, 'lbl-side');
        lab([(sc.E[0] + sc.D[0]) / 2, sc.E[1] + 18], L.adj, 'lbl-side');
        const x = C[0] + 22;
        out.lines.push({ p: [x, B[1]], q: [x, sc.D[1]], cls: 'dim' });
        out.lines.push({ p: [x - 5, B[1]], q: [x + 5, B[1]], cls: 'dim' });
        out.lines.push({ p: [x - 5, sc.D[1]], q: [x + 5, sc.D[1]], cls: 'dim' });
        lab([x + 18, (B[1] + sc.D[1]) / 2], '?', 'lbl-side lbl-unknown');
      } else {
        lab([A[0] - 12, A[1] + 12], '\\mathrm{A}', 'lbl-vertex');
        lab([B[0] + (L.wall ? 18 : 12), B[1] - 8], '\\mathrm{B}', 'lbl-vertex');
        lab([C[0] + 12, C[1] + 12], '\\mathrm{C}', 'lbl-vertex');
        const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        if (L.hyp) {
          // ラベルの幅に合わせて，斜辺から離す距離を決める
          const m = mid(A, B), hw = texWidth(L.hyp) / 2, off = 8 + hw * Math.sin(phi) + 11 * Math.cos(phi);
          lab([m[0] - off * Math.sin(phi), m[1] - off * Math.cos(phi)], L.hyp, 'lbl-side' + (unknown('hyp') ? ' lbl-unknown' : ''));
        }
        if (L.opp) { const m = mid(B, C); lab([m[0] + (L.wall ? 20 : 10) + texWidth(L.opp) / 2, m[1]], L.opp, 'lbl-side' + (unknown('opp') ? ' lbl-unknown' : '')); }
        if (L.adj) { const m = mid(A, C); lab([m[0], m[1] + 20], L.adj, 'lbl-side' + (unknown('adj') ? ' lbl-unknown' : '')); }
      }
    } else {
      // 見下ろす：A 左上，C は A の真下，B 右下
      const { A, B, C } = sc;
      const al = Math.atan2(B[1] - A[1], B[0] - A[0]);
      out.polys.push({ pts: [A, B, C], cls: 'tri-fill' });
      out.lines.push({ p: [C[0] - 26, C[1]], q: [B[0] + 22, B[1]], cls: 'ground' });
      out.lines.push({ p: A, q: [B[0] + 18, A[1]], cls: 'horizon' });
      out.lines.push({ p: A, q: B, cls: 'tri-side' });
      out.lines.push({ p: A, q: C, cls: 'tri-side' + (unknown('opp') ? ' is-hidden' : '') });
      out.lines.push({ p: C, q: B, cls: 'tri-side' + (unknown('adj') ? ' is-hidden' : '') });
      out.arc = { A, r, start: [A[0] + r, A[1]], end: [A[0] + r * Math.cos(al), A[1] + r * Math.sin(al)], sweep: 1 };
      const s = 12;
      out.right = [[C[0], C[1] - s], [C[0] + s, C[1] - s], [C[0] + s, C[1]]];
      const lenAB = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const dist = Math.min(Math.max(48, 32 / Math.sin(al)), 0.6 * lenAB);
      lab([A[0] + dist * Math.cos(al / 2), A[1] + dist * Math.sin(al / 2)], L.theta, 'lbl-theta');
      lab([A[0] - 12, A[1] - 10], '\\mathrm{A}', 'lbl-vertex');
      lab([C[0] - 12, C[1] + 12], '\\mathrm{C}', 'lbl-vertex');
      lab([B[0] + 10, B[1] + 14], '\\mathrm{B}', 'lbl-vertex');
      lab([A[0] - 10 - texWidth(L.opp) / 2, (A[1] + C[1]) / 2], L.opp, 'lbl-side' + (unknown('opp') ? ' lbl-unknown' : ''));
      lab([(C[0] + B[0]) / 2, C[1] + 20], L.adj, 'lbl-side' + (unknown('adj') ? ' lbl-unknown' : ''));
    }
    return out;
  }

  // ============================================================
  // 長さを求める型
  // ============================================================
  const OBJ = [
    { n: '木', foot: '木の根もと', top: '木の先端' },
    { n: '電柱', foot: '電柱の根もと', top: '電柱の先端' },
    { n: '旗ざお', foot: '旗ざおの根もと', top: '旗ざおの先端' },
    { n: '塔', foot: '塔の真下の地点', top: '塔の先端' }
  ];

  const LENGTH = {
    // tan：目の高さを足す（プリント1）
    tree(rng) {
      const o = pick(rng, OBJ);
      const d = pick(rng, [6, 8, 10, 12, 15, 20, 25, 30]);
      const th = randInt(rng, 15, 55);
      const h10 = pick(rng, [14, 15, 16, 17]);
      const h = h10 / 10;
      const tn = TABLE.tan[th];
      const bc = d * tn; // ×10000
      const ans = lengthAnswer({
        digits: 1, label: o.n + 'の高さ',
        num: bc + h10 * 1000, den: 10000,
        also: [{ num: Math.round(Math.tan(th * RAD) * d * 1e6) + h10 * 1e5, den: 1e6 }],
        alts: [
          { num: bc, den: 10000, hint: '目の高さを足しましたか？' },
          { num: d * TABLE.sin[th] + h10 * 1000, den: 10000, hint: '水平の距離と高さの関係は tan です．' },
          { num: d * 10000 * 10000 + h10 * 1000 * TABLE.tan[th], den: 10000 * TABLE.tan[th], hint: '高さ = 水平の距離 × tan です（÷ ではありません）．' }
        ]
      });
      return {
        fn: 'tan', id: 'tree',
        text: `${o.foot}から水平に ${d} m 離れた地点に立って${o.top}を見上げると，水平面となす角が ${th}° であった．目の高さを ${fmtM(h)} m として，${o.n}の高さを求めよ．ただし，小数第2位を四捨五入せよ．`,
        answer: ans,
        lines: [
          `\\mathrm{BC} = \\mathrm{AC}\\tan ${th}^\\circ = ${d} \\times ${t4(tn)} = ${decStr(bc, 10000)}`,
          `\\mathrm{BD} = ${decStr(bc, 10000)} + ${fmtM(h)} = ${decStr(bc + h10 * 1000, 10000)} \\fallingdotseq ${unitsStr(ans.base, 1)}`
        ],
        scene: riseScene(th, { theta: th + '^\\circ', adj: d + '\\,\\mathrm{m}', eye: fmtM(h) + '\\,\\mathrm{m}', target: 'BD' }, { eye: true })
      };
    },
    // tan：影の長さから高さ
    shadow(rng) {
      const o = pick(rng, OBJ.slice(0, 3));
      const d = pick(rng, [3, 4, 5, 6, 8, 10, 12]);
      const th = randInt(rng, 20, 65);
      const tn = TABLE.tan[th];
      const ans = lengthAnswer({
        digits: 1, label: o.n + 'の高さ', num: d * tn, den: 10000,
        also: [{ num: Math.round(Math.tan(th * RAD) * d * 1e6), den: 1e6 }],
        alts: [
          { num: d * TABLE.sin[th], den: 10000, hint: '影（水平）と高さの関係は tan です．' },
          { num: d * TABLE.cos[th], den: 10000, hint: '影（水平）と高さの関係は tan です．' },
          { num: d * 10000 * 10000, den: 10000 * tn, hint: '高さ = 影の長さ × tan です（÷ ではありません）．' }
        ]
      });
      return {
        fn: 'tan', id: 'shadow',
        text: `太陽の光が地面と ${th}° の角をなしているとき，${o.n}の影の長さが ${d} m であった．${o.n}の高さを求めよ．ただし，小数第2位を四捨五入せよ．`,
        answer: ans,
        lines: [`\\mathrm{BC} = \\mathrm{AC}\\tan ${th}^\\circ = ${d} \\times ${t4(tn)} = ${decStr(d * tn, 10000)} \\fallingdotseq ${unitsStr(ans.base, 1)}`],
        scene: riseScene(th, { theta: th + '^\\circ', adj: d + '\\,\\mathrm{m}', opp: '?' })
      };
    },
    // tan：見下ろした角（プリント2）
    depression(rng) {
      const Hm = pick(rng, [10, 15, 20, 25, 30, 40, 50, 60]);
      const al = randInt(rng, 15, 60);
      const co = 90 - al;
      const tn = TABLE.tan[co];
      const ans = lengthAnswer({
        digits: 0, label: 'BC の距離', num: Hm * tn, den: 10000,
        also: [{ num: Hm * 10000, den: TABLE.tan[al] }, { num: Math.round(Hm / Math.tan(al * RAD) * 1e6), den: 1e6 }],
        alts: [{ num: Hm * TABLE.tan[al], den: 10000, hint: '図の ∠BAC は 90° − ' + al + '° です．' }]
      });
      const lighthouse = rng() < 0.5;
      const text = lighthouse
        ? `海面からの高さ ${Hm} m の灯台の上の地点 A から船 B を見下ろすと，その角は水平面に対して ${al}° であった．船 B は，A の真下の海面の地点 C から何 m 離れているか．1 m 未満を四捨五入して求めよ．`
        : `地上からの高さ ${Hm} m の地点 A から地上の地点 B を見下ろしたら，その角は水平面に対して ${al}° であった．B は，A の真下の地点 C から何 m 離れているか．1 m 未満を四捨五入して求めよ．`;
      return {
        fn: 'tan', id: 'depression', text, answer: ans,
        lines: [
          `\\angle \\mathrm{BAC} = 90^\\circ - ${al}^\\circ = ${co}^\\circ`,
          `\\mathrm{BC} = \\mathrm{AC}\\tan ${co}^\\circ = ${Hm} \\times ${t4(tn)} = ${decStr(Hm * tn, 10000)} \\fallingdotseq ${ans.base}`
        ],
        note: `${Hm} ÷ tan ${al}° で求めても正解です．`,
        scene: depressionScene(al, { theta: al + '^\\circ', opp: Hm + '\\,\\mathrm{m}', adj: '?' })
      };
    },
    // sin：坂を登る（プリント3(1)）
    slopeUp(rng) {
      const L = pick(rng, [50, 80, 100, 120, 150, 200, 250, 300]);
      const th = randInt(rng, 5, 30);
      return slopeProblem(rng, 'sin', L, th);
    },
    // cos：坂を登る（プリント3(2)）
    slopeAcross(rng) {
      const L = pick(rng, [50, 80, 100, 120, 150, 200, 250, 300]);
      const th = randInt(rng, 5, 30);
      return slopeProblem(rng, 'cos', L, th);
    },
    // sin：凧の高さ
    kite(rng) {
      const L = pick(rng, [20, 25, 30, 40, 50]);
      const th = randInt(rng, 25, 70);
      const v = TABLE.sin[th];
      const ans = lengthAnswer({
        digits: 1, label: '凧の高さ', num: L * v, den: 10000,
        also: [{ num: Math.round(Math.sin(th * RAD) * L * 1e6), den: 1e6 }],
        alts: [
          { num: L * TABLE.cos[th], den: 10000, hint: '糸（斜辺）と高さの関係は sin です．' },
          { num: L * TABLE.tan[th], den: 10000, hint: '糸（斜辺）と高さの関係は sin です．' }
        ]
      });
      return {
        fn: 'sin', id: 'kite',
        text: `長さ ${L} m の糸で凧をあげたところ，糸と地面のなす角が ${th}° になった．凧の高さは何 m か．ただし，糸はまっすぐに張っていて，糸の端は地面にあるものとする．小数第2位を四捨五入して答えよ．`,
        answer: ans,
        lines: [`\\mathrm{BC} = \\mathrm{AB}\\sin ${th}^\\circ = ${L} \\times ${t4(v)} = ${decStr(L * v, 10000)} \\fallingdotseq ${unitsStr(ans.base, 1)}`],
        scene: riseScene(th, { theta: th + '^\\circ', hyp: L + '\\,\\mathrm{m}', opp: '?' })
      };
    },
    // sin：はしごの上端の高さ
    ladderTop(rng) { return ladderProblem(rng, 'sin'); },
    // cos：はしごの下端と壁の距離
    ladderFoot(rng) { return ladderProblem(rng, 'cos'); },
    // cos：エスカレーターの水平の長さ
    escalator(rng) {
      const L = pick(rng, [12, 15, 18, 20, 24, 30]);
      const th = randInt(rng, 25, 35);
      const v = TABLE.cos[th];
      const ans = lengthAnswer({
        digits: 1, label: '水平方向の長さ', num: L * v, den: 10000,
        also: [{ num: Math.round(Math.cos(th * RAD) * L * 1e6), den: 1e6 }],
        alts: [
          { num: L * TABLE.sin[th], den: 10000, hint: '斜辺と水平方向（底辺）の関係は cos です．' },
          { num: L * TABLE.tan[th], den: 10000, hint: '斜辺と水平方向（底辺）の関係は cos です．' }
        ]
      });
      return {
        fn: 'cos', id: 'escalator',
        text: `長さ ${L} m のエスカレーターが水平面と ${th}° の角をなしている．このエスカレーターの水平方向の長さは何 m か．小数第2位を四捨五入して答えよ．`,
        answer: ans,
        lines: [`\\mathrm{AC} = \\mathrm{AB}\\cos ${th}^\\circ = ${L} \\times ${t4(v)} = ${decStr(L * v, 10000)} \\fallingdotseq ${unitsStr(ans.base, 1)}`],
        scene: riseScene(th, { theta: th + '^\\circ', hyp: L + '\\,\\mathrm{m}', adj: '?' })
      };
    }
  };

  function slopeProblem(rng, fn, L, th) {
    const v = TABLE[fn][th];
    const other = fn === 'sin' ? 'cos' : 'sin';
    const dir = fn === 'sin' ? '鉛直方向には何 m 上がる' : '水平方向には何 m 進む';
    const ans = lengthAnswer({
      digits: 0, label: fn === 'sin' ? '鉛直方向' : '水平方向', num: L * v, den: 10000,
      also: [{ num: Math.round(Math[fn](th * RAD) * L * 1e6), den: 1e6 }],
      alts: [{ num: L * TABLE[other][th], den: 10000, hint: fn === 'sin' ? '高さ（鉛直方向）は 斜辺 × sin です．' : '水平方向は 斜辺 × cos です．' }]
    });
    const side = fn === 'sin' ? 'BC' : 'AC';
    return {
      fn, id: fn === 'sin' ? 'slopeUp' : 'slopeAcross',
      text: `傾斜角 ${th}° の坂をまっすぐに ${L} m 登る．このとき，${dir}ことになるか．1 m 未満を四捨五入して答えよ．`,
      answer: ans,
      lines: [`\\mathrm{${side}} = \\mathrm{AB}\\${fn} ${th}^\\circ = ${L} \\times ${t4(v)} = ${decStr(L * v, 10000)} \\fallingdotseq ${ans.base}`],
      scene: riseScene(th, Object.assign({ theta: th + '^\\circ', hyp: L + '\\,\\mathrm{m}' }, fn === 'sin' ? { opp: '?' } : { adj: '?' }))
    };
  }

  function ladderProblem(rng, fn) {
    const L = pick(rng, [3, 4, 5, 6, 7, 8]);
    const th = randInt(rng, 55, 80);
    const v = TABLE[fn][th];
    const other = fn === 'sin' ? 'cos' : 'sin';
    const ans = lengthAnswer({
      digits: 1, label: fn === 'sin' ? '上端の高さ' : '壁からの距離', num: L * v, den: 10000,
      also: [{ num: Math.round(Math[fn](th * RAD) * L * 1e6), den: 1e6 }],
      alts: [{ num: L * TABLE[other][th], den: 10000, hint: fn === 'sin' ? '高さは はしご × sin です．' : '壁からの距離（底辺）は はしご × cos です．' }]
    });
    const side = fn === 'sin' ? 'BC' : 'AC';
    const q = fn === 'sin' ? 'はしごの上端は地面から何 m の高さにあるか．' : 'はしごの下端は壁から何 m 離れているか．';
    return {
      fn, id: fn === 'sin' ? 'ladderTop' : 'ladderFoot',
      text: `長さ ${L} m のはしごを垂直な壁に立てかけたところ，はしごと地面のなす角が ${th}° になった．${q}小数第2位を四捨五入して答えよ．`,
      answer: ans,
      lines: [`\\mathrm{${side}} = \\mathrm{AB}\\${fn} ${th}^\\circ = ${L} \\times ${t4(v)} = ${decStr(L * v, 10000)} \\fallingdotseq ${unitsStr(ans.base, 1)}`],
      scene: riseScene(th, Object.assign({ theta: th + '^\\circ', hyp: L + '\\,\\mathrm{m}', wall: true }, fn === 'sin' ? { opp: '?' } : { adj: '?' }))
    };
  }

  // ============================================================
  // 角度を表から求める型
  // ============================================================
  // 比の値の小数表記（割り切れなければ4桁で打ち切って …）
  function ratioDec(n, d) {
    return isExactDec(n, d, 4) ? decStr(n, d) : decStr(Math.floor(n * 10000 / d), 10000) + '\\cdots';
  }

  // nTex/dTex：問題文の数（1.5 m など）をそのまま分数にしたいとき
  function angleExplain(fn, n, d, ansObj, nTex, dTex) {
    const frac = `\\frac{${nTex || n}}{${dTex || d}}`;
    const dec = ratioDec(n, d);
    const lhs = `\\${fn}\\theta`;
    const T = TABLE[fn];
    const a = ansObj.ans;
    if (ansObj.mode === 'floor') {
      return {
        lines: [`${lhs} \\leqq ${frac} = ${dec}`, `\\${fn} ${a}^\\circ = ${t4(T[a])},\\ \\ \\${fn} ${a + 1}^\\circ = ${t4(T[a + 1])}`],
        conclusion: `${a + 1}° では基準を超えるので，${a}° 以下にしなければならない．`
      };
    }
    // 比の値をはさむ2つの角
    const r = n / d, inc = fn !== 'cos';
    let lo = a, hi = a + 1;
    if (inc ? T[a] / 10000 > r : T[a] / 10000 < r) { lo = a - 1; hi = a; }
    return {
      lines: [`${lhs} = ${frac} = ${dec}`, `\\${fn} ${lo}^\\circ = ${t4(T[lo])},\\ \\ \\${fn} ${hi}^\\circ = ${t4(T[hi])}`],
      conclusion: `${a}° の方が近い値なので，θ ≒ ${a}°．`
    };
  }

  const ANGLE = {
    // tan：百分率の勾配（プリント5(1)）
    grade(rng) {
      let p;
      do { p = randInt(rng, 3, 45); } while (!angleClear('tan', p, 100, 'nearest'));
      const ans = angleAnswer('tan', p, 100, 'nearest');
      const ex = angleExplain('tan', p, 100, ans);
      return {
        fn: 'tan', id: 'grade',
        text: `道路の勾配が ${p} % と表示されている．百分率（%）の勾配は，水平方向に 100 m 進んだときに何 m 高くなるかを表す．この道路の傾斜角は約何度か．三角比の表を用いて答えよ．`,
        answer: Object.assign(ans, { label: '傾斜角' }),
        lines: ex.lines, conclusion: ex.conclusion,
        scene: riseScene(Math.atan(p / 100) / RAD, { theta: '\\theta', adj: '100\\,\\mathrm{m}', opp: p + '\\,\\mathrm{m}' })
      };
    },
    // tan：千分率の勾配（プリント5(2)）
    permil(rng) {
      let q;
      do { q = randInt(rng, 5, 70); } while (!angleClear('tan', q, 1000, 'nearest'));
      const ans = angleAnswer('tan', q, 1000, 'nearest');
      const ex = angleExplain('tan', q, 1000, ans);
      return {
        fn: 'tan', id: 'permil',
        text: `鉄道路線に ${q} ‰（パーミル）と表示された標識がある．千分率（‰）の勾配は，水平方向に 1000 m 進んだときに何 m 高くなるかを表す．この鉄道路線の傾斜は約何度か．三角比の表を用いて答えよ．`,
        answer: Object.assign(ans, { label: '傾斜' }),
        lines: ex.lines, conclusion: ex.conclusion,
        scene: riseScene(Math.atan(q / 1000) / RAD, { theta: '\\theta', adj: '1000\\,\\mathrm{m}', opp: q + '\\,\\mathrm{m}' })
      };
    },
    // tan：基準「1/n 以下」から何度以下（プリント4）
    rampLimit(rng) {
      let n;
      do { n = randInt(rng, 6, 30); } while (!angleClear('tan', 1, n, 'floor'));
      const ans = angleAnswer('tan', 1, n, 'floor');
      const ex = angleExplain('tan', 1, n, ans);
      return {
        fn: 'tan', id: 'rampLimit',
        text: `車いす用に屋外に設置するスロープについて，その勾配は $\\frac{1}{${n}}$ 以下にするという基準がある．スロープの傾斜角を 1 度単位で設定する場合，この基準を満たすには，傾斜角は何度以下にしなければならないか．ここで，勾配とは，水平方向に 1 進むときに鉛直方向に上がる高さを表す．`,
        answer: Object.assign(ans, { label: '傾斜角' }),
        lines: ex.lines, conclusion: ex.conclusion,
        scene: riseScene(Math.atan(1 / n) / RAD, { theta: '\\theta', adj: String(n), opp: '1' })
      };
    },
    // tan：影と高さから太陽の角度
    sunAngle(rng) {
      let h, L;
      do { h = pick(rng, [2, 3, 4, 5, 6, 8, 10]); L = randInt(rng, 2, 20); } while (h === L || !angleClear('tan', h, L, 'nearest') || angleAnswer('tan', h, L, 'nearest').ans < 8 || angleAnswer('tan', h, L, 'nearest').ans > 75);
      const ans = angleAnswer('tan', h, L, 'nearest');
      const ex = angleExplain('tan', h, L, ans);
      return {
        fn: 'tan', id: 'sunAngle',
        text: `高さ ${h} m の棒を地面に垂直に立てたところ，影の長さが ${L} m になった．太陽の光が地面となす角は約何度か．三角比の表を用いて答えよ．`,
        answer: Object.assign(ans, { label: '地面となす角' }),
        lines: ex.lines, conclusion: ex.conclusion,
        scene: riseScene(Math.atan(h / L) / RAD, { theta: '\\theta', adj: L + '\\,\\mathrm{m}', opp: h + '\\,\\mathrm{m}' })
      };
    },
    // sin：坂の長さと高さから傾斜角
    slopeAngle(rng) {
      let L, h;
      do { L = pick(rng, [50, 80, 100, 120, 150, 200, 250, 300]); h = randInt(rng, 3, Math.floor(L * 0.6)); } while (!angleClear('sin', h, L, 'nearest') || angleAnswer('sin', h, L, 'nearest').ans > 40);
      const ans = angleAnswer('sin', h, L, 'nearest');
      const ex = angleExplain('sin', h, L, ans);
      return {
        fn: 'sin', id: 'slopeAngle',
        text: `まっすぐな坂を ${L} m 登ったところ，鉛直方向に ${h} m 高くなった．この坂の傾斜角は約何度か．三角比の表を用いて答えよ．`,
        answer: Object.assign(ans, { label: '傾斜角' }),
        lines: ex.lines, conclusion: ex.conclusion,
        scene: riseScene(Math.asin(h / L) / RAD, { theta: '\\theta', hyp: L + '\\,\\mathrm{m}', opp: h + '\\,\\mathrm{m}' })
      };
    },
    // sin：凧の糸と高さから角度
    kiteAngle(rng) {
      let L, h;
      do { L = pick(rng, [20, 25, 30, 40, 50]); h = randInt(rng, 5, L - 4); } while (!angleClear('sin', h, L, 'nearest') || angleAnswer('sin', h, L, 'nearest').ans > 72);
      const ans = angleAnswer('sin', h, L, 'nearest');
      const ex = angleExplain('sin', h, L, ans);
      return {
        fn: 'sin', id: 'kiteAngle',
        text: `長さ ${L} m の糸で凧をあげたところ，凧の高さが ${h} m になった．糸と地面のなす角は約何度か．ただし，糸はまっすぐに張っていて，糸の端は地面にあるものとする．三角比の表を用いて答えよ．`,
        answer: Object.assign(ans, { label: '糸と地面のなす角' }),
        lines: ex.lines, conclusion: ex.conclusion,
        scene: riseScene(Math.asin(h / L) / RAD, { theta: '\\theta', hyp: L + '\\,\\mathrm{m}', opp: h + '\\,\\mathrm{m}' })
      };
    },
    // cos：はしごの長さと壁からの距離から角度
    ladderAngle(rng) {
      let L10, x10;
      do { L10 = pick(rng, [30, 40, 50, 60, 70, 80]); x10 = randInt(rng, 5, Math.floor(L10 * 0.6)); } while (!angleClear('cos', x10, L10, 'nearest') || angleAnswer('cos', x10, L10, 'nearest').ans < 45);
      const ans = angleAnswer('cos', x10, L10, 'nearest');
      const ex = angleExplain('cos', x10, L10, ans, fmtM(x10 / 10), fmtM(L10 / 10));
      return {
        fn: 'cos', id: 'ladderAngle',
        text: `長さ ${fmtM(L10 / 10)} m のはしごを垂直な壁に立てかけたところ，はしごの下端が壁から ${fmtM(x10 / 10)} m 離れていた．はしごと地面のなす角は約何度か．三角比の表を用いて答えよ．`,
        answer: Object.assign(ans, { label: 'はしごと地面のなす角' }),
        lines: ex.lines, conclusion: ex.conclusion,
        scene: riseScene(Math.acos(x10 / L10) / RAD, { theta: '\\theta', hyp: fmtM(L10 / 10) + '\\,\\mathrm{m}', adj: fmtM(x10 / 10) + '\\,\\mathrm{m}', wall: true })
      };
    },
    // cos：坂の長さと水平に進んだ距離から傾斜角
    slopeAcrossAngle(rng) {
      let L, x;
      do { L = pick(rng, [50, 80, 100, 120, 150, 200]); x = randInt(rng, Math.ceil(L * 0.7), L - 1); } while (!angleClear('cos', x, L, 'nearest') || angleAnswer('cos', x, L, 'nearest').ans < 12);
      const ans = angleAnswer('cos', x, L, 'nearest');
      const ex = angleExplain('cos', x, L, ans);
      return {
        fn: 'cos', id: 'slopeAcrossAngle',
        text: `まっすぐな坂を ${L} m 登ったところ，水平方向には ${x} m 進んでいた．この坂の傾斜角は約何度か．三角比の表を用いて答えよ．`,
        answer: Object.assign(ans, { label: '傾斜角' }),
        lines: ex.lines, conclusion: ex.conclusion,
        scene: riseScene(Math.acos(x / L) / RAD, { theta: '\\theta', hyp: L + '\\,\\mathrm{m}', adj: x + '\\,\\mathrm{m}' })
      };
    }
  };

  const LENGTH_BY_FN = {
    sin: ['slopeUp', 'kite', 'ladderTop'],
    cos: ['slopeAcross', 'ladderFoot', 'escalator'],
    tan: ['tree', 'shadow', 'depression']
  };
  const ANGLE_BY_FN = {
    sin: ['slopeAngle', 'kiteAngle'],
    cos: ['ladderAngle', 'slopeAcrossAngle'],
    tan: ['grade', 'permil', 'rampLimit', 'sunAngle']
  };

  // category: 'applyLen' | 'applyAng' | 'applyMix'
  // sin・cos・tan を同じ割合で選んでから，その三角比を使う型を選ぶ
  function generateApply(category, rng) {
    rng = rng || Math.random;
    const type = category === 'applyLen' ? 'length' : category === 'applyAng' ? 'angle' : (rng() < 0.5 ? 'length' : 'angle');
    const fn = pick(rng, ['sin', 'cos', 'tan']);
    const id = pick(rng, (type === 'length' ? LENGTH_BY_FN : ANGLE_BY_FN)[fn]);
    const p = (type === 'length' ? LENGTH : ANGLE)[id](rng);
    return Object.assign(p, { kind: 'apply', type, category });
  }

  // ============================================================
  // 判定
  //   長さ：表の値で計算した答えの最後の桁 ±1 まで正解
  //   角度：表で最も近い角（「以下」は基準を超えない最大の角）
  // ============================================================
  function judgeApply(prob, input) {
    const p = parseAnswer(input);
    if (p.empty) return { status: 'empty', hint: '答えを入れてください．' };
    if (p.invalid) return { status: 'invalid', hint: '数字（と小数点）で答えてください．' };
    const a = prob.answer;
    if (a.kind === 'angle') {
      if (p.frac.replace(/0+$/, '') !== '') return { status: 'invalid', hint: '角度は整数で答えてください．' };
      const v = parseInt(p.int, 10);
      if (v === a.ans) return { status: 'correct', hint: '' };
      if (a.mode === 'floor' && v === a.ans + 1) return { status: 'wrong', hint: `${v}° では基準を超えます．「以下」なので，基準を超えない最大の角を選びましょう．` };
      if (Math.abs(v - a.ans) === 1) return { status: 'form', hint: '表で前後の角の値と比べて，より近いほうを選びましょう．' };
      if (v >= 90 || v === 0) return { status: 'wrong', hint: '' };
      // 別の三角比で表を引いた
      for (const fn of ['sin', 'cos', 'tan']) {
        if (fn === a.fn) continue;
        const other = angleAnswer(fn, a.n, a.d, 'nearest');
        if (fn !== 'tan' && a.n > a.d) continue;
        if (other.nearest === v) return { status: 'wrong', hint: `この問題で使うのは ${a.fn} です．${a.fn} の列で表を引きましょう．` };
      }
      return { status: 'wrong', hint: '' };
    }
    // 長さ
    const u = toUnits(p, a.digits);
    if (u.over) {
      // 桁を多く書いた：四捨五入すれば正解なら書き方ミス
      const r = Math.round(p.value * Math.pow(10, a.digits) + 1e-9);
      if (a.accepts.some(b => Math.abs(r - b) <= 1)) {
        return { status: 'form', hint: a.digits === 0 ? '1 m 未満を四捨五入して，整数で答えましょう．' : '小数第2位を四捨五入して，小数第1位まで答えましょう．' };
      }
      return { status: 'wrong', hint: '' };
    }
    if (a.accepts.some(b => Math.abs(u.units - b) <= 1)) return { status: 'correct', hint: '' };
    // 四捨五入する位をまちがえた（小数第1位まで答えるところを整数で）
    if (a.digits === 1 && p.frac === '' && Math.abs(parseInt(p.int, 10) - Math.round(a.exact)) <= 0 && Math.abs(u.units - a.base) > 1) {
      return { status: 'form', hint: '小数第2位を四捨五入して，小数第1位まで答えましょう．' };
    }
    for (const alt of a.alts) {
      if (Math.abs(u.units - alt.units) <= 1) return { status: 'wrong', hint: alt.hint };
    }
    return { status: 'wrong', hint: '' };
  }

  // 答えの表記（解説用）
  function answerText(prob) {
    const a = prob.answer;
    if (a.kind === 'angle') return a.mode === 'floor' ? `${a.ans}° 以下` : `約 ${a.ans}°`;
    return `${unitsStr(a.base, a.digits)} ${a.unit}`;
  }

  return {
    TABLE, t4, roundUnits, unitsStr, decStr, parseAnswer,
    angleAnswer, angleClear, generateApply, judgeApply, answerText, sceneLayout, riseScene, depressionScene, texWidth,
    LENGTH_BY_FN, ANGLE_BY_FN, W, H,
    _LENGTH: LENGTH, _ANGLE: ANGLE
  };
}));
