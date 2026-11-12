// 三角比の拡張（0° < θ < 90° → 0° ≦ θ ≦ 180°）の解説スライド．
// 教科書（数研 NEXT数学Ⅰ p.153〜157）の流れに，「なぜ座標か」「なぜ単位円か」の動機を足す．
//   1 直角三角形の定義は 90° で壊れる
//   2 同じ三角形を座標平面に置く（辺 → x・y・r）
//   3 90° を超えても座標なら読める（r = 2，教科書の例4 と同じ）
//   4 r はいくつでも同じ → r = 1（単位円）
//   5 単位円で自由に試す（ドラッグ・有名角・x = 1 の tan・180° − θ）
//   6 まとめ
//   7 コラム：なぜ「正弦」か（弦の半分．プトレマイオス → jya → sinus → オイラーの半径 1）
// 計算部分は node から読めるようにしてある（tests/extend.test.js）．
(function (root) {
  'use strict';

  const RAD = Math.PI / 180;
  const FAMOUS = [0, 30, 45, 60, 90, 120, 135, 150, 180];

  // 教科書の書き方（1/√2，1/√3）にそろえる
  const EXACT = {
    0: { sin: '0', cos: '1', tan: '0' },
    30: { sin: '\\frac{1}{2}', cos: '\\frac{\\sqrt{3}}{2}', tan: '\\frac{1}{\\sqrt{3}}' },
    45: { sin: '\\frac{1}{\\sqrt{2}}', cos: '\\frac{1}{\\sqrt{2}}', tan: '1' },
    60: { sin: '\\frac{\\sqrt{3}}{2}', cos: '\\frac{1}{2}', tan: '\\sqrt{3}' },
    90: { sin: '1', cos: '0', tan: null },
    120: { sin: '\\frac{\\sqrt{3}}{2}', cos: '-\\frac{1}{2}', tan: '-\\sqrt{3}' },
    135: { sin: '\\frac{1}{\\sqrt{2}}', cos: '-\\frac{1}{\\sqrt{2}}', tan: '-1' },
    150: { sin: '\\frac{1}{2}', cos: '-\\frac{\\sqrt{3}}{2}', tan: '-\\frac{1}{\\sqrt{3}}' },
    180: { sin: '0', cos: '-1', tan: '0' }
  };
  // 半径 2 の半円上の点 P の座標（教科書の例4：120° で P(−1, √3)）
  const COORD2 = {
    0: ['2', '0'], 30: ['\\sqrt{3}', '1'], 45: ['\\sqrt{2}', '\\sqrt{2}'], 60: ['1', '\\sqrt{3}'],
    90: ['0', '2'], 120: ['-1', '\\sqrt{3}'], 135: ['-\\sqrt{2}', '\\sqrt{2}'], 150: ['-\\sqrt{3}', '1'], 180: ['-2', '0']
  };
  // 半径 1 のときは (cos θ, sin θ) そのもの．1/√2 は座標では √2/2 と書くことが多いが，教科書の値の形にそろえる
  const COORD1 = {};
  FAMOUS.forEach(d => { COORD1[d] = [EXACT[d].cos, EXACT[d].sin]; });

  const isFamous = d => FAMOUS.indexOf(d) >= 0;

  function point(deg, r) {
    // 0° と 180°，90° で浮動小数のごみ（6e-17 など）を出さない
    const c = deg === 90 ? 0 : Math.cos(deg * RAD);
    const s = (deg === 0 || deg === 180) ? 0 : Math.sin(deg * RAD);
    return { x: r * c, y: r * s };
  }

  function ratios(deg) {
    const p = point(deg, 1);
    return { sin: p.y, cos: p.x, tan: deg === 90 ? null : p.y / p.x };
  }

  // 小数の表示（−0 を出さない．全角でなく数式の −）
  function fmt(v, digits) {
    const d = digits == null ? 3 : digits;
    let s = (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
    s = s.replace(/\.?0+$/, '');
    if (s === '-0') s = '0';
    return s;
  }

  // 直角三角形の定義が使えるか（θ をはさむ直角三角形がつくれるのは 0° < θ < 90° だけ）
  const triangleOK = deg => deg > 0 && deg < 90;

  const api = { FAMOUS, EXACT, COORD1, COORD2, isFamous, point, ratios, fmt, triangleOK };

  // ---------------- 画面（ブラウザだけ） ----------------
  function create(ctx) {
    const T = ctx.T, D = ctx.D;
    const $ = id => document.getElementById(id);
    let anim = null; // 再生中のアニメーション

    function stopAnim() {
      if (anim) { cancelAnimationFrame(anim.raf); if (anim.btn) anim.btn.textContent = '▶ 再生'; anim = null; }
    }
    // from → to を ms ミリ秒で動かす．図が画面から外れたら止まる
    function play(btn, from, to, ms, onFrame, alive) {
      if (anim && anim.btn === btn) { stopAnim(); return; }
      stopAnim();
      const t0 = performance.now();
      anim = { btn, raf: 0 };
      btn.textContent = '■ 止める';
      const step = now => {
        if (!anim || !alive()) { stopAnim(); return; }
        const t = Math.min(1, (now - t0) / ms);
        onFrame(Math.round(from + (to - from) * t));
        if (t < 1) anim.raf = requestAnimationFrame(step);
        else stopAnim();
      };
      anim.raf = requestAnimationFrame(step);
    }

    // --- SVG の部品 ---
    const W = 360;
    const C_HYP = 'var(--c-hyp)', C_OPP = 'var(--c-opp)', C_ADJ = 'var(--c-adj)', INK = '#0f172a', MUTE = '#94a3b8';
    const line = (a, b, color, w, extra) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${w || 2.5}" stroke-linecap="round" ${extra || ''}/>`;
    const dot = (p, color, rr) => `<circle cx="${p[0]}" cy="${p[1]}" r="${rr || 5}" fill="${color || INK}"/>`;
    const text = (p, s, cls, anchor) => `<text x="${p[0]}" y="${p[1]}" class="${cls || 'ex-t'}" text-anchor="${anchor || 'middle'}" dominant-baseline="middle">${s}</text>`;
    const toPx = (O, u, x, y) => [O[0] + u * x, O[1] - u * y];

    // 角の弧（0° から deg まで，反時計回り）
    function arc(O, rad, from, to, color, w, fill) {
      if (to - from < 0.5) return '';
      const a = [O[0] + rad * Math.cos(from * RAD), O[1] - rad * Math.sin(from * RAD)];
      const b = [O[0] + rad * Math.cos(to * RAD), O[1] - rad * Math.sin(to * RAD)];
      const large = to - from > 180 ? 1 : 0;
      let s = '';
      if (fill) s += `<path d="M ${O[0]} ${O[1]} L ${a[0]} ${a[1]} A ${rad} ${rad} 0 ${large} 0 ${b[0]} ${b[1]} Z" fill="${fill}" stroke="none"/>`;
      s += `<path d="M ${a[0]} ${a[1]} A ${rad} ${rad} 0 ${large} 0 ${b[0]} ${b[1]}" fill="none" stroke="${color}" stroke-width="${w || 2.5}"/>`;
      return s;
    }
    function semicircle(O, rad, color, dash, w) {
      return `<path d="M ${O[0] + rad} ${O[1]} A ${rad} ${rad} 0 0 0 ${O[0] - rad} ${O[1]}" fill="none" stroke="${color}" stroke-width="${w || 1.6}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
    }
    // 座標軸（y 軸は yBottom から上へ．省略すると原点から）
    function axes(O, yBottom, xMin, xMax) {
      return line([xMin, O[1]], [xMax, O[1]], INK, 1.4) + line([O[0], yBottom || O[1]], [O[0], 10], INK, 1.4) +
        `<path d="M ${xMax} ${O[1]} l -8 -4 v 8 z" fill="${INK}"/><path d="M ${O[0]} 10 l -4 8 h 8 z" fill="${INK}"/>` +
        text([xMax - 4, O[1] + 14], 'x', 'ex-t ex-var') + text([O[0] + 12, 16], 'y', 'ex-t ex-var') + text([O[0] - 10, O[1] + 14], 'O', 'ex-t ex-pt');
    }
    // 直角の印（足 F，上向き，s = +1 なら左側に，−1 なら右側に）
    function rightMark(F, s) {
      const k = 10;
      return `<polyline points="${F[0] - s * k},${F[1]} ${F[0] - s * k},${F[1] - k} ${F[0]},${F[1] - k}" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
    }
    // 角の文字 θ を弧の中ほどに
    function thetaLabel(O, rad, deg) {
      const m = deg / 2;
      return text([O[0] + rad * Math.cos(m * RAD), O[1] - rad * Math.sin(m * RAD)], 'θ', 'ex-t ex-theta');
    }
    function svgWrap(H, inner, id) {
      return `<div class="figure ex-figure" style="aspect-ratio:${W}/${H}"><svg viewBox="0 0 ${W} ${H}" ${id ? `id="${id}"` : ''}>${inner}</svg></div>`;
    }
    const alive = id => () => { const el = $(id); return !!(el && el.isConnected); };

    // 値の TeX（有名角なら正確な値，それ以外は ≒ 小数）
    function valTex(deg, fn) {
      if (isFamous(deg)) {
        const e = EXACT[deg][fn];
        return e === null ? '\\text{なし}' : e;
      }
      const v = ratios(deg)[fn];
      return '\\fallingdotseq ' + fmt(v, 4);
    }
    const eqTex = (deg, fn) => {
      const v = valTex(deg, fn);
      return v.indexOf('\\fallingdotseq') === 0 ? v : '= ' + v;
    };
    // 点 P の座標の TeX
    function coordTex(deg, r) {
      const tbl = r === 2 ? COORD2 : r === 1 ? COORD1 : null;
      if (tbl && isFamous(deg)) return `(${tbl[deg][0]},\\ ${tbl[deg][1]})`;
      const p = point(deg, r);
      return `(${fmt(p.x)},\\ ${fmt(p.y)})`;
    }
    const slider = (id, min, max, val, label) => `
      <div class="slider-row ex-slider">
        <span class="ex-slabel">${label} <b id="${id}-v">${val}</b>°</span>
        <input type="range" id="${id}" min="${min}" max="${max}" step="1" value="${val}">
      </div>`;

    // ============ 1 直角三角形の定義は 90° で壊れる ============
    const H1 = 230, O1 = [180, 190], L1 = 140;
    function fig1(deg) {
      const B = [O1[0] + L1 * Math.cos(deg * RAD), O1[1] - L1 * Math.sin(deg * RAD)];
      const C = [B[0], O1[1]];
      let s = line([16, O1[1]], [344, O1[1]], MUTE, 1.4, 'stroke-dasharray="5 5"');
      const flat = Math.abs(deg - 90) < 0.5;
      if (!flat) s += `<polygon points="${O1.join(',')} ${B.join(',')} ${C.join(',')}" fill="rgba(13,148,136,0.08)"/>`;
      s += arc(O1, 30, 0, deg, 'var(--theme-accent)', 2.5, 'rgba(234,88,12,0.14)');
      if (deg > 90.5) s += arc(O1, 20, deg, 180, '#64748b', 2, 'rgba(100,116,139,0.18)');
      s += line(O1, C, C_ADJ, 3) + line(C, B, C_OPP, 3) + line(O1, B, C_HYP, 3);
      if (!flat) s += rightMark(C, deg < 90 ? 1 : -1);
      s += dot(O1, INK, 3.5) + dot(B, INK, 3.5);
      s += text([O1[0] + (deg > 150 ? 14 : 0), O1[1] + 18], 'A', 'ex-t ex-pt');
      s += text([B[0], B[1] - 14], 'B', 'ex-t ex-pt');
      if (!flat) s += text([C[0], C[1] + 18], 'C', 'ex-t ex-pt');
      s += thetaLabel(O1, 46, deg);
      if (deg > 90.5) {
        const m = (deg + 180) / 2;
        s += text([O1[0] + 34 * Math.cos(m * RAD) - 22, O1[1] - 34 * Math.sin(m * RAD) - 14], '180°−θ', 'ex-t ex-small ex-mute');
      }
      return s;
    }
    function info1(deg) {
      if (deg < 90) {
        return `<p>θ が <b>${deg}°</b>（鋭角）．θ をはさむ直角三角形 ABC がつくれるので</p>
          <div class="math-line">${D(`\\sin\\theta = \\frac{\\textcolor{#ea580c}{\\mathrm{BC}}}{\\textcolor{#0f766e}{\\mathrm{AB}}},\\quad \\cos\\theta = \\frac{\\textcolor{#7c3aed}{\\mathrm{AC}}}{\\textcolor{#0f766e}{\\mathrm{AB}}},\\quad \\tan\\theta = \\frac{\\textcolor{#ea580c}{\\mathrm{BC}}}{\\textcolor{#7c3aed}{\\mathrm{AC}}}`)}</div>`;
      }
      if (deg === 90) {
        return `<p class="warning">θ = 90°：C が A に重なって，三角形がつぶれてしまいました．</p>
          <p>AC の長さが 0 になり，${T('\\tan\\theta = \\frac{\\mathrm{BC}}{\\mathrm{AC}}')} は 0 で割ることになります．</p>`;
      }
      return `<p class="warning">θ = ${deg}°：θ をはさむ直角三角形がつくれません．</p>
        <p>三角形 ABC の A の角は θ ではなく <b>180° − θ</b>（灰色）です．直角三角形の内角は 90° と鋭角2つなので，<b>90° 以上の角はそもそも入りません</b>．</p>
        <p class="highlight-box">「辺の比」の定義のままでは，${T(`\\sin ${deg}^\\circ`)} を決められない．</p>`;
    }

    // ============ 2 同じ三角形を座標平面に置く ============
    const H2 = 230, O2 = [110, 195], L2 = 170;
    function fig2(deg, coord) {
      const B = [O2[0] + L2 * Math.cos(deg * RAD), O2[1] - L2 * Math.sin(deg * RAD)];
      const C = [B[0], O2[1]];
      let s = '';
      if (coord) s += axes(O2, 0, 20, 344);
      else s += line([20, O2[1]], [344, O2[1]], MUTE, 1.4, 'stroke-dasharray="5 5"');
      s += `<polygon points="${O2.join(',')} ${B.join(',')} ${C.join(',')}" fill="rgba(13,148,136,0.08)"/>`;
      s += arc(O2, 30, 0, deg, 'var(--theme-accent)', 2.5, 'rgba(234,88,12,0.14)');
      s += line(O2, C, C_ADJ, 3) + line(C, B, C_OPP, 3) + line(O2, B, C_HYP, 3) + rightMark(C, 1);
      s += dot(B, INK, 3.5) + thetaLabel(O2, 46, deg);
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (coord) {
        s += text([B[0] + 8, B[1] - 14], 'P(x, y)', 'ex-t ex-pt', 'start');
        s += text([mid(O2, C)[0], O2[1] + 16], 'x', 'ex-t ex-var ex-adj');
        s += text([C[0] + 14, mid(C, B)[1]], 'y', 'ex-t ex-var ex-opp', 'start');
        const m = mid(O2, B);
        s += text([m[0] - 14, m[1] - 10], 'r', 'ex-t ex-var ex-hyp');
      } else {
        s += text([O2[0] - 4, O2[1] + 18], 'A', 'ex-t ex-pt');
        s += text([B[0], B[1] - 14], 'B', 'ex-t ex-pt');
        s += text([C[0], C[1] + 18], 'C', 'ex-t ex-pt');
      }
      return s;
    }
    function info2(coord) {
      if (!coord) return `<p>θ を左下に置いた直角三角形です．ボタンを押して，<b>A を原点 O に，辺 AC を x 軸に</b>重ねてみましょう．</p>`;
      return `<p>B は点 P(x, y) になり，3辺はそれぞれ次のように読めます．</p>
        <ul class="term-list">
          <li><span class="side-tag side-adj">AC</span> → P の <b>x 座標（x-coordinate）</b> x</li>
          <li><span class="side-tag side-opp">BC</span> → P の <b>y 座標（y-coordinate）</b> y</li>
          <li><span class="side-tag side-hyp">AB</span> → O から P までの距離 r（円の<b>半径（radius）</b>）</li>
        </ul>
        <div class="visual-box">
          <div class="math-line">${D('\\sin\\theta = \\frac{\\mathrm{BC}}{\\mathrm{AB}} = \\frac{y}{r}')}</div>
          <div class="math-line">${D('\\cos\\theta = \\frac{\\mathrm{AC}}{\\mathrm{AB}} = \\frac{x}{r}')}</div>
          <div class="math-line">${D('\\tan\\theta = \\frac{\\mathrm{BC}}{\\mathrm{AC}} = \\frac{y}{x}')}</div>
        </div>
        <p>三角形の辺を使わずに，<span class="highlight">点 P の座標と r だけ</span>で書けました．</p>`;
    }

    // ============ 3 90° を超えても座標なら読める（r = 2） ============
    const H3 = 230, O3 = [180, 195], U3 = 75, R3 = 2;
    function fig3(deg) {
      const p = point(deg, R3);
      const P = toPx(O3, U3, p.x, p.y), F = [P[0], O3[1]];
      let s = axes(O3, 0, 10, 350);
      s += semicircle(O3, U3 * R3, MUTE, '5 5');
      s += text([O3[0] + U3 * R3, O3[1] + 14], '2', 'ex-t ex-small ex-mute');
      s += text([O3[0] - U3 * R3, O3[1] + 14], '−2', 'ex-t ex-small ex-mute');
      s += arc(O3, 26, 0, deg, 'var(--theme-accent)', 2.5, 'rgba(234,88,12,0.14)');
      if (Math.abs(p.x) > 0.01) s += line(O3, F, C_ADJ, 4);
      if (p.y > 0.01) s += line(F, P, C_OPP, 4, 'stroke-dasharray="1 0"');
      s += line(O3, P, C_HYP, 3) + dot(P, INK, 4.5);
      s += thetaLabel(O3, 42, deg);
      // x の値（負なら赤）
      if (Math.abs(p.x) > 0.25) s += text([(O3[0] + F[0]) / 2, O3[1] + 16], 'x = ' + fmt(p.x).replace('-', '−'), 'ex-t ex-small ' + (p.x < 0 ? 'ex-neg' : 'ex-adj'));
      if (p.y > 0.3) s += text([F[0] + (p.x < 0 ? -8 : 8), (F[1] + P[1]) / 2], 'y = ' + fmt(p.y), 'ex-t ex-small ex-opp', p.x < 0 ? 'end' : 'start');
      const out = [O3[0] + (U3 * R3 + 18) * Math.cos(deg * RAD), O3[1] - (U3 * R3 + 14) * Math.sin(deg * RAD)];
      s += text([Math.max(30, Math.min(330, out[0])), Math.max(14, out[1])], 'P', 'ex-t ex-pt');
      return s;
    }
    function info3(deg) {
      const ok = triangleOK(deg);
      const row = fn => {
        const def = { sin: '\\frac{y}{r}', cos: '\\frac{x}{r}', tan: '\\frac{y}{x}' }[fn];
        const left = ok ? D(valTex(deg, fn)) : '<span class="ex-x">×（三角形がない）</span>';
        const right = (fn === 'tan' && deg === 90) ? '<span class="ex-x">x = 0 で割れない</span>' : D(`${def} ${eqTex(deg, fn)}`);
        return `<tr><th>${T('\\' + fn + '\\theta')}</th><td>${left}</td><td>${right}</td></tr>`;
      };
      return `<p>半径 ${T('r = 2')} の半円上で，${T(`\\theta = ${deg}^\\circ`)} のとき ${T('\\mathrm{P}' + coordTex(deg, 2))}</p>
        <table class="ex-table">
          <tr><th></th><th>直角三角形の辺の比</th><th>座標の比</th></tr>
          ${row('sin')}${row('cos')}${row('tan')}
        </table>
        <p class="note">${ok ? 'θ が鋭角の間は，どちらで求めても同じ値です．' : (deg >= 90 && deg < 180 ? '三角形はつくれなくても，P の座標は読めます．<b>長さは負になりませんが，座標は負になれる</b>ので，鈍角（obtuse angle）では x が負です．' : '三角形はつぶれていますが，P の座標は読めます．')}</p>`;
    }

    // ============ 4 r はいくつでも同じ → r = 1 ============
    const H4 = 230, O4 = [180, 200], U4 = 50;
    function fig4(deg, r) {
      let s = axes(O4, 0, 10, 350);
      [1, 2, 3].forEach(k => { s += semicircle(O4, U4 * k, k === 1 ? 'var(--theme-primary)' : MUTE, '4 5', k === 1 ? 1.8 : 1.2); });
      s += semicircle(O4, U4 * r, C_HYP, null, 2.2);
      [1, 2, 3].forEach(k => { s += text([O4[0] + U4 * k, O4[1] + 14], String(k), 'ex-t ex-small ex-mute'); });
      const p = point(deg, r), P = toPx(O4, U4, p.x, p.y), F = [P[0], O4[1]];
      const P3 = toPx(O4, U4, point(deg, 3).x, point(deg, 3).y);
      s += line(O4, P3, MUTE, 1.2, 'stroke-dasharray="3 4"');
      s += arc(O4, 22, 0, deg, 'var(--theme-accent)', 2.5, 'rgba(234,88,12,0.14)');
      if (Math.abs(p.x) > 0.01) s += line(O4, F, C_ADJ, 3.5);
      if (p.y > 0.01) s += line(F, P, C_OPP, 3.5);
      s += line(O4, P, C_HYP, 3) + dot(P, INK, 4.5);
      s += text([P[0] + (p.x < 0 ? -10 : 10), P[1] - 12], 'P', 'ex-t ex-pt', p.x < 0 ? 'end' : 'start');
      return s;
    }
    function info4(deg, r) {
      const p = point(deg, r);
      const cell = (num, fn) => `\\frac{${fmt(num)}}{${fmt(r, 1)}}`;
      const one = r === 1;
      return `<p>${T(`\\theta = ${deg}^\\circ,\\ r = ${r}`)} のとき ${T('\\mathrm{P}(' + fmt(p.x) + ',\\ ' + fmt(p.y) + ')')}</p>
        <div class="visual-box">
          <div class="math-line">${D(`\\sin\\theta = \\frac{y}{r} = ${cell(p.y)} ${eqTex(deg, 'sin')}`)}</div>
          <div class="math-line">${D(`\\cos\\theta = \\frac{x}{r} = ${cell(p.x)} ${eqTex(deg, 'cos')}`)}</div>
        </div>
        ${one
          ? `<p class="highlight-box">${T('r = 1')} なら分母が 1 なので，<b>${T('\\sin\\theta')} は P の y 座標，${T('\\cos\\theta')} は P の x 座標そのもの</b>．</p>
             <p>だから，これからは半径 1 の半円（<b>単位円（unit circle）</b>）で考えます．</p>`
          : `<p>r を変えても，比の値は変わりません（大きさによらない＝相似）．<b>計算がいちばん楽になる r</b> はいくつでしょう？</p>`}`;
    }

    // ============ 5 単位円で自由に試す ============
    const H5 = 300, O5 = [180, 165], U5 = 130;
    function fig5(deg, opt) {
      const p = point(deg, 1), P = toPx(O5, U5, p.x, p.y), F = [P[0], O5[1]];
      let s = '';
      s += `<rect x="0" y="0" width="${W}" height="${H5}" fill="transparent"/>`;
      s += axes(O5, H5 - 6, 10, 350);
      s += semicircle(O5, U5, 'var(--theme-primary)', null, 2);
      s += text([O5[0] + U5 + 4, O5[1] + 14], '1', 'ex-t ex-small ex-mute', 'start');
      s += text([O5[0] - U5 - 4, O5[1] + 14], '−1', 'ex-t ex-small ex-mute', 'end');
      // 有名角の目印
      FAMOUS.forEach(d => {
        const q = toPx(O5, U5, point(d, 1).x, point(d, 1).y);
        s += `<circle cx="${q[0]}" cy="${q[1]}" r="2.6" fill="${MUTE}"/>`;
      });
      if (opt.tan) {
        const X1 = O5[0] + U5;
        s += line([X1, 8], [X1, H5 - 4], '#0369a1', 1.6, 'stroke-dasharray="6 4"');
        s += text([X1 + 6, 16], 'x = 1', 'ex-t ex-small ex-tan', 'start');
        if (deg !== 90) {
          const t = p.y / p.x;
          const Tp = [X1, O5[1] - U5 * t];
          s += line(deg > 90 ? P : O5, Tp, '#0369a1', 1.6);
          if (deg > 90) s += line(O5, P, '#0369a1', 1.6);
          if (Tp[1] > 6 && Tp[1] < H5 - 6) {
            s += dot(Tp, '#0369a1', 4.5) + text([X1 - 8, Tp[1]], 'T', 'ex-t ex-pt ex-tan', 'end');
            s += line([X1, O5[1]], Tp, '#0369a1', 4);
          }
        }
      }
      if (opt.supp && deg !== 90) {
        const Q = toPx(O5, U5, -p.x, p.y);
        s += line(O5, Q, '#64748b', 2, 'stroke-dasharray="5 4"') + line([Q[0], O5[1]], Q, '#64748b', 2, 'stroke-dasharray="5 4"');
        s += dot(Q, '#64748b', 4.5) + text([Q[0] + (p.x > 0 ? -10 : 10), Q[1] - 12], 'Q', 'ex-t ex-pt ex-mute', p.x > 0 ? 'end' : 'start');
      }
      s += arc(O5, 24, 0, deg, 'var(--theme-accent)', 2.5, 'rgba(234,88,12,0.14)');
      if (Math.abs(p.x) > 0.005) s += line(O5, F, C_ADJ, 4);
      if (p.y > 0.005) s += line(F, P, C_OPP, 4);
      s += line(O5, P, C_HYP, 3);
      s += `<circle cx="${P[0]}" cy="${P[1]}" r="13" fill="rgba(13,148,136,0.18)" class="ex-handle"/>` + dot(P, INK, 6);
      s += thetaLabel(O5, 40, deg);
      const out = [O5[0] + (U5 + 20) * Math.cos(deg * RAD), O5[1] - (U5 + 16) * Math.sin(deg * RAD)];
      s += text([Math.max(18, Math.min(342, out[0])), Math.max(14, out[1])], 'P', 'ex-t ex-pt');
      return s;
    }
    function info5(deg, opt) {
      const r = ratios(deg);
      const tanCell = deg === 90 ? '<span class="ex-x">なし（x = 0）</span>' : D(`\\frac{y}{x} ${eqTex(deg, 'tan')}`);
      let html = `<p>${T(`\\theta = ${deg}^\\circ`)}　${T('\\mathrm{P}' + coordTex(deg, 1))}</p>
        <table class="ex-table ex-table-2">
          <tr><th>${T('\\sin\\theta')}</th><td>${D(`y ${eqTex(deg, 'sin')}`)}</td><td class="ex-sign">${r.sin > 1e-9 ? '＋' : '0'}</td></tr>
          <tr><th>${T('\\cos\\theta')}</th><td>${D(`x ${eqTex(deg, 'cos')}`)}</td><td class="ex-sign ${r.cos < -1e-9 ? 'ex-neg' : ''}">${r.cos > 1e-9 ? '＋' : r.cos < -1e-9 ? '−' : '0'}</td></tr>
          <tr><th>${T('\\tan\\theta')}</th><td>${tanCell}</td><td class="ex-sign ${r.tan !== null && r.tan < -1e-9 ? 'ex-neg' : ''}">${r.tan === null ? '' : r.tan > 1e-9 ? '＋' : r.tan < -1e-9 ? '−' : '0'}</td></tr>
        </table>`;
      if (opt.tan && deg !== 90) {
        html += `<p class="note">直線 OP と直線 ${T('x = 1')} の交点 T の y 座標が ${T('\\tan\\theta')}．${Math.abs(r.tan) > 1.15 ? '（T は図の外まで行っています）' : ''}</p>`;
      }
      if (opt.supp && deg !== 90) {
        const s = 180 - deg;
        html += `<p class="note">Q は ${T(`180^\\circ - \\theta = ${s}^\\circ`)} の点．P と Q は y 軸について対称なので，${T(`\\sin ${s}^\\circ = \\sin ${deg}^\\circ`)}，${T(`\\cos ${s}^\\circ = -\\cos ${deg}^\\circ`)}．</p>`;
      }
      return html;
    }

    // ============ 7 コラム：なぜ「正弦」とよぶの？ ============
    const H7 = 300, O7 = [180, 150], U7 = 125;
    function fig7(deg) {
      const p = point(deg, 1), P = toPx(O7, U7, p.x, p.y), Q = toPx(O7, U7, p.x, -p.y), F = [P[0], O7[1]];
      let s = line([10, O7[1]], [350, O7[1]], INK, 1.2) + line([O7[0], H7 - 8], [O7[0], 8], INK, 1.2);
      s += text([O7[0] - 10, O7[1] + 14], 'O', 'ex-t ex-pt');
      s += `<circle cx="${O7[0]}" cy="${O7[1]}" r="${U7}" fill="none" stroke="var(--theme-primary)" stroke-width="2"/>`;
      s += arc(O7, 26, 0, deg, 'var(--theme-accent)', 2.5, 'rgba(234,88,12,0.14)');
      s += line(O7, P, C_HYP, 2.2) + line(O7, Q, MUTE, 1.6, 'stroke-dasharray="4 4"');
      if (p.y > 0.005) {
        s += line(P, Q, '#0369a1', 7, 'stroke-opacity="0.35"');
        s += line(F, P, C_OPP, 4) + line(F, Q, '#0369a1', 2.5);
        s += text([F[0] + (p.x < 0 ? 10 : -10), (F[1] + Q[1]) / 2], '弦 PP′ の下半分', 'ex-t ex-small ex-tan', p.x < 0 ? 'start' : 'end');
        s += text([F[0] + (p.x < 0 ? 10 : -10), (F[1] + P[1]) / 2], 'y = sin θ', 'ex-t ex-small ex-opp', p.x < 0 ? 'start' : 'end');
      }
      s += dot(P, INK, 5) + dot(Q, '#0369a1', 5);
      s += thetaLabel(O7, 42, deg);
      const lab = (pt, sgn, str) => text([O7[0] + (U7 + 18) * (pt[0] - O7[0]) / U7, O7[1] + (U7 + 16) * (pt[1] - O7[1]) / U7], str, 'ex-t ex-pt');
      s += lab(P, 1, 'P') + lab(Q, -1, 'P′');
      return s;
    }
    function info7(deg) {
      const y = point(deg, 1).y;
      return `<p>円周上の2点を結ぶ線分を<b>弦（chord）</b>といいます．単位円で，P と x 軸について対称な点 P′ を結ぶと，<span class="highlight">弦 PP′ のちょうど半分が y，つまり ${T('\\sin\\theta')}</span> です．</p>
        <div class="visual-box"><div class="math-line">${D(`\\mathrm{PP'} = 2y = 2\\sin\\theta ${isFamous(deg) ? '= 2 \\times ' + EXACT[deg].sin : '\\fallingdotseq ' + fmt(2 * y)}`)}</div></div>`;
    }

    // ---------------- スライド ----------------
    const state = { d1: 30, d2: 35, c2: false, d3: 120, d4: 60, r4: 2, d5: 120, tan: false, supp: false, d7: 60 };

    const slides = [
      () => `
        <div class="tutorial-slide">
          <p>これまでの三角比は，直角三角形の<b>辺の比</b>で決めました．θ を大きくしていくと，どうなるでしょう？</p>
          ${svgWrap(H1, fig1(state.d1), 'ex1-svg')}
          ${slider('ex1', 10, 170, state.d1, T('\\theta ='))}
          <div class="ex-btns"><button type="button" class="secondary-btn ex-play" id="ex1-play">▶ 再生</button></div>
          <div id="ex1-info" class="ex-info">${info1(state.d1)}</div>
        </div>`,
      () => `
        <div class="tutorial-slide">
          <p><b>ヒント</b>：三角形のかわりに，<span class="highlight">座標（coordinate）</span>を使います．まず鋭角で，同じ三角形を座標平面に置いてみます．</p>
          ${svgWrap(H2, fig2(state.d2, state.c2), 'ex2-svg')}
          ${slider('ex2', 10, 80, state.d2, T('\\theta ='))}
          <div class="ex-btns"><button type="button" class="primary-btn ex-toggle" id="ex2-toggle">${state.c2 ? '◀ 三角形にもどす' : '座標平面に重ねる ▶'}</button></div>
          <div id="ex2-info" class="ex-info">${info2(state.c2)}</div>
        </div>`,
      () => `
        <div class="tutorial-slide">
          <p>P を半径 ${T('r')} の半円の上で動かせば，<b>90° を超えても P の座標は読めます</b>．そこで，${T('\\sin\\theta = \\frac{y}{r},\\ \\cos\\theta = \\frac{x}{r},\\ \\tan\\theta = \\frac{y}{x}')} を<span class="highlight">新しい定義</span>にします．</p>
          ${svgWrap(H3, fig3(state.d3), 'ex3-svg')}
          ${slider('ex3', 0, 180, state.d3, T('\\theta ='))}
          <div class="ex-btns"><button type="button" class="secondary-btn ex-play" id="ex3-play">▶ 再生</button></div>
          <div id="ex3-info" class="ex-info">${info3(state.d3)}</div>
        </div>`,
      () => `
        <div class="tutorial-slide">
          <p>半径 ${T('r')} を変えてみましょう．θ が同じなら，三角比の値は変わるでしょうか？</p>
          ${svgWrap(H4, fig4(state.d4, state.r4), 'ex4-svg')}
          ${slider('ex4', 0, 180, state.d4, T('\\theta ='))}
          <div class="slider-row ex-slider">
            <span class="ex-slabel">${T('r =')} <b id="ex4r-v">${state.r4}</b></span>
            <input type="range" id="ex4r" min="1" max="3" step="0.5" value="${state.r4}">
          </div>
          <div class="ex-btns"><button type="button" class="primary-btn" id="ex4-one">r = 1 にしてみる</button></div>
          <div id="ex4-info" class="ex-info">${info4(state.d4, state.r4)}</div>
        </div>`,
      () => `
        <div class="tutorial-slide">
          <p>単位円の上で <b>P をドラッグ</b>してみましょう（図のどこをタップしても動きます）．</p>
          ${svgWrap(H5, fig5(state.d5, state), 'ex5-svg')}
          ${slider('ex5', 0, 180, state.d5, T('\\theta ='))}
          <div class="ex-famous" id="ex5-famous">${FAMOUS.map(d => `<button type="button" class="ex-chip" data-deg="${d}">${d}°</button>`).join('')}</div>
          <div class="ex-checks">
            <label><input type="checkbox" id="ex5-tan" ${state.tan ? 'checked' : ''}> tan を直線 x = 1 で見る</label>
            <label><input type="checkbox" id="ex5-supp" ${state.supp ? 'checked' : ''}> 180° − θ の点 Q も表示</label>
          </div>
          <div id="ex5-info" class="ex-info">${info5(state.d5, state)}</div>
        </div>`,
      () => `
        <div class="tutorial-slide">
          <p class="highlight-box">${T('0^\\circ \\leqq \\theta \\leqq 180^\\circ')} の三角比は，<b>単位円の上の点 P(x, y)</b> で決める．</p>
          <div class="visual-box">
            <div class="math-line">${D('\\sin\\theta = y,\\quad \\cos\\theta = x,\\quad \\tan\\theta = \\frac{y}{x}')}</div>
          </div>
          <ul class="term-list">
            <li><b>なぜ座標？</b>　90° 以上の角をはさむ直角三角形はつくれない．でも点の座標なら 0°〜180° のどこでも読める．</li>
            <li><b>なぜ単位円？</b>　三角比は r によらないので，分母が消える ${T('r = 1')} を選ぶ．すると sin θ と cos θ が座標そのものになる．</li>
            <li><b>鋭角（acute angle）</b>のときは，これまでの辺の比と同じ値になる（定義を広げても前の答えは変わらない）．</li>
          </ul>
          <table class="ex-table">
            <tr><th></th><th>${T('0^\\circ<\\theta<90^\\circ')}<br><span class="note">鋭角</span></th><th>${T('90^\\circ')}</th><th>${T('90^\\circ<\\theta<180^\\circ')}<br><span class="note">鈍角（obtuse angle）</span></th></tr>
            <tr><th>${T('\\sin\\theta')}</th><td>＋</td><td>1</td><td>＋</td></tr>
            <tr><th>${T('\\cos\\theta')}</th><td>＋</td><td>0</td><td class="ex-neg">−</td></tr>
            <tr><th>${T('\\tan\\theta')}</th><td>＋</td><td>なし</td><td class="ex-neg">−</td></tr>
          </table>
        </div>`,
      () => `
        <div class="tutorial-slide">
          <p class="highlight-box"><b>コラム：なぜ「正弦」とよぶの？</b>　じつは，三角比は<b>直角三角形より先に円から</b>生まれました．</p>
          ${svgWrap(H7, fig7(state.d7), 'ex7-svg')}
          ${slider('ex7', 0, 180, state.d7, T('\\theta ='))}
          <div id="ex7-info" class="ex-info">${info7(state.d7)}</div>
          <ul class="term-list">
            <li><b>2世紀</b>　プトレマイオス（ギリシャ）が，半径 60 の円で<b>弦の長さの表</b>をつくった（天文学の計算のため）．</li>
            <li><b>500年ごろ</b>　インドのアーリヤバタが，<b>弦の半分</b>の表をつくり jya とよんだ．これが今の sin．</li>
            <li><b>その後</b>　アラビア語で jiba → jaib（「折り目」）となり，12世紀にラテン語へ訳すときに sinus（「入り江」）とされた．英語の sine はここから．</li>
            <li><b>1748年</b>　オイラーが<b>円の半径をいつも 1 にした</b>．それまで sin は円の中の「長さ」で，表ごとに半径がばらばらだった．半径を 1 にそろえて，sin は1つの「数」になった（4枚目の ${T('r = 1')} と同じ考え）．</li>
            <li><b>余弦（cosine）</b>は「余角の正弦」．${T('\\cos\\theta = \\sin(90^\\circ - \\theta)')} で，英語の co-sine も complement（余角）の sine から．</li>
          </ul>
          <p class="note">教科書は「直角三角形 → 円」の順ですが，歴史では「円 → 直角三角形」の順でした．円で考えるのは，むしろ元の形にもどることなのです．</p>
        </div>`
    ];

    function bindSlider(id, onChange) {
      const el = $(id);
      if (!el) return null;
      el.addEventListener('input', () => { stopAnim(); onChange(parseFloat(el.value)); });
      return el;
    }
    const setSlider = (id, v) => { const el = $(id); if (el) el.value = v; const lb = $(id + '-v'); if (lb) lb.textContent = v; };

    function mount(index) {
      stopAnim();
      if (index === 0) {
        const draw = d => { state.d1 = d; setSlider('ex1', d); $('ex1-svg').innerHTML = fig1(d); $('ex1-info').innerHTML = info1(d); };
        bindSlider('ex1', draw);
        let last = -1;
        $('ex1-play').addEventListener('click', e => play(e.currentTarget, 10, 170, 6000, d => { if (d !== last) { last = d; draw(d); } }, alive('ex1-svg')));
      } else if (index === 1) {
        const draw = () => { setSlider('ex2', state.d2); $('ex2-svg').innerHTML = fig2(state.d2, state.c2); $('ex2-info').innerHTML = info2(state.c2); $('ex2-toggle').textContent = state.c2 ? '◀ 三角形にもどす' : '座標平面に重ねる ▶'; };
        bindSlider('ex2', d => { state.d2 = d; draw(); });
        $('ex2-toggle').addEventListener('click', () => { state.c2 = !state.c2; draw(); });
      } else if (index === 2) {
        const draw = d => { state.d3 = d; setSlider('ex3', d); $('ex3-svg').innerHTML = fig3(d); $('ex3-info').innerHTML = info3(d); };
        bindSlider('ex3', draw);
        let last = -1;
        $('ex3-play').addEventListener('click', e => play(e.currentTarget, 0, 180, 7000, d => { if (d !== last) { last = d; draw(d); } }, alive('ex3-svg')));
      } else if (index === 3) {
        const draw = () => { setSlider('ex4', state.d4); setSlider('ex4r', state.r4); $('ex4-svg').innerHTML = fig4(state.d4, state.r4); $('ex4-info').innerHTML = info4(state.d4, state.r4); };
        bindSlider('ex4', d => { state.d4 = d; draw(); });
        bindSlider('ex4r', r => { state.r4 = r; draw(); });
        $('ex4-one').addEventListener('click', () => { state.r4 = 1; draw(); });
      } else if (index === 4) {
        const svg = $('ex5-svg');
        const draw = d => { state.d5 = d; setSlider('ex5', d); svg.innerHTML = fig5(d, state); $('ex5-info').innerHTML = info5(d, state); };
        bindSlider('ex5', draw);
        $('ex5-famous').addEventListener('click', e => { const b = e.target.closest('.ex-chip'); if (b) draw(parseInt(b.dataset.deg, 10)); });
        $('ex5-tan').addEventListener('change', e => { state.tan = e.target.checked; draw(state.d5); });
        $('ex5-supp').addEventListener('change', e => { state.supp = e.target.checked; draw(state.d5); });
        // ドラッグ（タップ）で P を動かす．x 軸より下は 0° か 180° に寄せる
        let dragging = false;
        const fromEvent = ev => {
          const m = svg.getScreenCTM();
          if (!m) return;
          const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
          const dx = pt.x - O5[0], dy = O5[1] - pt.y;
          let d = Math.round(Math.atan2(dy, dx) / RAD);
          if (dy < 0) d = dx >= 0 ? 0 : 180;
          d = Math.max(0, Math.min(180, d));
          // 有名角の近く（±2°）では吸いつく
          FAMOUS.forEach(f => { if (Math.abs(f - d) <= 2) d = f; });
          if (d !== state.d5) draw(d);
        };
        svg.addEventListener('pointerdown', ev => { dragging = true; svg.setPointerCapture(ev.pointerId); fromEvent(ev); ev.preventDefault(); });
        svg.addEventListener('pointermove', ev => { if (dragging) fromEvent(ev); });
        const end = () => { dragging = false; };
        svg.addEventListener('pointerup', end);
        svg.addEventListener('pointercancel', end);
      } else if (index === 6) {
        bindSlider('ex7', d => { state.d7 = d; setSlider('ex7', d); $('ex7-svg').innerHTML = fig7(d); $('ex7-info').innerHTML = info7(d); });
      }
    }

    return { title: '三角比の拡張（0°〜180°）', slides, mount };
  }

  api.create = create;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TrianExtend = api;
})(typeof window !== 'undefined' ? window : this);
