// trian.go 三角比の相互関係：sin・cos・tan のうち1つから，残りの2つを求める（θ は鋭角）
// 判定は core.js の judgeRatio をそのまま使う（既約・√ の中は簡単に・有理化は自由）
// ブラウザでは window.TrianRelation，Node では require('./relation.js')
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.TrianRelation = factory(root.TrianCore);
}(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const gcd = C.gcd;

  // 値の2乗が n2/d2 の数を，分子・分母の形で表す
  //   natural：分子・分母をそれぞれ簡単にした形（1/√5，√3/√5 など）
  //   rationalized：有理化した形（√5/5 など）
  // N2・D2 は表した分子・分母の2乗（直角三角形の辺に使う）
  function form(n2, d2, rationalize) {
    const g = gcd(n2, d2); n2 /= g; d2 /= g;
    let N2 = n2, D2 = d2;
    if (rationalize) {
      const { k, m } = C.simplifySqrt(n2 * d2);
      const g2 = gcd(k, d2);
      N2 = (k / g2) * (k / g2) * m; D2 = (d2 / g2) * (d2 / g2);
    }
    const A = C.simplifySqrt(N2), B = C.simplifySqrt(D2);
    const part = s => s.m === 1 ? String(s.k) : (s.k === 1 ? '' : s.k) + '\\sqrt{' + s.m + '}';
    const tex = D2 === 1 ? part(A) : '\\frac{' + part(A) + '}{' + part(B) + '}';
    return { tex, N2, D2 };
  }
  // 分子・分母がともに √（√2/√5 など）か
  const bothRoot = (n2, d2) => { const f = form(n2, d2, false); return C.simplifySqrt(f.N2).m !== 1 && C.simplifySqrt(f.D2).m !== 1; };
  // 解説で使う答えの形：有理化しない形（2/√5 など．プリントと同じ）．ただし分子・分母がともに √ なら有理化した形
  const valTex = (n2, d2) => (bothRoot(n2, d2) ? null : C.naturalTex(n2, d2)) || C.rationalizedTex(n2, d2);
  const fracTex = (n, d) => { const g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : `\\frac{${n}}{${d}}`; };
  const sqrtFracTex = (n, d) => { const g = gcd(n, d); n /= g; d /= g; return d === 1 ? `\\sqrt{${n}}` : `\\sqrt{\\frac{${n}}{${d}}}`; };
  const sq = t => /\\frac|\\sqrt/.test(t) ? `\\left(${t}\\right)^2` : `${t}^2`;

  const FN = ['sin', 'cos', 'tan'];
  const OTHERS = { sin: ['cos', 'tan'], cos: ['sin', 'tan'], tan: ['cos', 'sin'] };

  // 与える三角比を sin・cos・tan から同じ割合で選び，その値の形に合わせた直角三角形を作る
  function generateRelation(rng) {
    rng = rng || Math.random;
    const sq0 = rng() < 0.45 ? C.genIntegerTriangle(rng) : C.genRadicalTriangle(rng);
    const given = pick(rng, FN);
    const pair = { sin: [sq0.opp2, sq0.hyp2], cos: [sq0.adj2, sq0.hyp2], tan: [sq0.opp2, sq0.adj2] }[given];
    // 分母に √ が残る値は，ときどき有理化した形で与える（どちらの形でも読めるように）
    // 分子・分母がともに √ の値（√2/√5）は，見やすさのため必ず有理化して与える
    const hasRootDen = C.simplifySqrt(form(pair[0], pair[1], false).D2).m !== 1;
    const rat = bothRoot(pair[0], pair[1]) || (hasRootDen && rng() < 0.3);
    return build(given, pair[0], pair[1], rat);
  }

  // 与える三角比 given の値の2乗が n2/d2 の問題を作る
  function build(given, n2, d2, rationalize) {
    const f = form(n2, d2, !!rationalize);
    // 与えた値の分子・分母をそのまま辺の長さにした直角三角形（別解の図）
    let opp2, adj2, hyp2;
    if (given === 'sin') { opp2 = f.N2; hyp2 = f.D2; adj2 = f.D2 - f.N2; }
    else if (given === 'cos') { adj2 = f.N2; hyp2 = f.D2; opp2 = f.D2 - f.N2; }
    else { opp2 = f.N2; adj2 = f.D2; hyp2 = f.N2 + f.D2; }
    const hidden = given === 'sin' ? 'adj' : given === 'cos' ? 'opp' : 'hyp';
    return {
      kind: 'relation', given, givenTex: f.tex, asks: OTHERS[given],
      opp2, adj2, hyp2, hidden,
      orient: { mode: 'axis', phi: 0, flip: false }
    };
  }

  // 解説（プリントと同じ流れ）：[{ text, tex }]
  function relationLines(p) {
    const t = C.targets(p);
    const sinT = valTex(t.sin.n, t.sin.d), cosT = valTex(t.cos.n, t.cos.d), tanT = valTex(t.tan.n, t.tan.d);
    const g = p.givenTex;
    const L = [];
    if (p.given === 'sin' || p.given === 'cos') {
      const a = p.given, b = a === 'sin' ? 'cos' : 'sin';
      const b2 = t[b]; // 求める方の2乗 = b2.n / b2.d
      const bT = b === 'sin' ? sinT : cosT;
      L.push({ text: `${tx('\\sin^2\\theta + \\cos^2\\theta = 1')} から`, tex: `\\${b}^2\\theta = 1 - \\${a}^2\\theta = 1 - ${sq(g)} = ${fracTex(b2.n, b2.d)}` });
      L.push({ text: `${tx('\\' + b + '\\theta > 0')} であるから`, tex: `\\${b}\\theta = ${sqrtFracTex(b2.n, b2.d)} = ${bT}` });
      const div = a === 'sin' ? `${g} \\div ${cosT}` : `${sinT} \\div ${g}`;
      L.push({ text: 'また', tex: `\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta} = ${div} = ${tanT}` });
    } else {
      const inv = { n: t.cos.d, d: t.cos.n }; // 1/cos²θ
      L.push({ text: `${tx('1 + \\tan^2\\theta = \\frac{1}{\\cos^2\\theta}')} から`, tex: `\\frac{1}{\\cos^2\\theta} = 1 + ${sq(g)} = ${fracTex(inv.n, inv.d)}` });
      L.push({ text: 'よって', tex: `\\cos^2\\theta = ${fracTex(t.cos.n, t.cos.d)}` });
      L.push({ text: `${tx('\\cos\\theta > 0')} であるから`, tex: `\\cos\\theta = ${sqrtFracTex(t.cos.n, t.cos.d)} = ${cosT}` });
      L.push({ text: `また，${tx('\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}')} から`, tex: `\\sin\\theta = \\tan\\theta \\times \\cos\\theta = ${g} \\times ${cosT} = ${sinT}` });
    }
    return L;
  }
  // 文の中の数式の印（画面側で $...$ を KaTeX にする）
  function tx(t) { return '$' + t + '$'; }

  // 別解：直角三角形で考える
  function triangleLines(p) {
    const S = { hyp: C.sqrtTex(p.hyp2), opp: C.sqrtTex(p.opp2), adj: C.sqrtTex(p.adj2) };
    const sqS = k => { const s = C.simplifySqrt(p[k + '2']); return s.m === 1 ? `${s.k}^2` : `\\left(${S[k]}\\right)^2`; };
    const name = C.SIDE_NAME;
    const word = { hyp: '斜辺', opp: 'θ の向かいの辺', adj: 'θ のとなりの辺' };
    const known = ['hyp', 'opp', 'adj'].filter(k => k !== p.hidden);
    const h = p.hidden;
    const intro = `θ が鋭角で ${tx('\\' + p.given + '\\theta = ' + p.givenTex)} から，${word[known[0]]} ${name[known[0]]} $= ${S[known[0]]}$，${word[known[1]]} ${name[known[1]]} $= ${S[known[1]]}$ の直角三角形 ABC が描ける．`;
    let py;
    // √n が簡単にならないとき（√5 = √5）は最後の一歩を書かない
    const tail = k => (S[k] === `\\sqrt{${p[k + '2']}}` ? `\\sqrt{${p[k + '2']}}` : `\\sqrt{${p[k + '2']}} = ${S[k]}`);
    if (h === 'hyp') py = `\\mathrm{AB} = \\sqrt{${sqS('opp')} + ${sqS('adj')}} = ${tail('hyp')}`;
    else {
      const other = h === 'opp' ? 'adj' : 'opp';
      py = `\\mathrm{${name[h]}} = \\sqrt{${sqS('hyp')} - ${sqS(other)}} = ${tail(h)}`;
    }
    return { intro, py };
  }

  return { generateRelation, build, relationLines, triangleLines, form, valTex, OTHERS };
}));
