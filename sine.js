// 正弦定理の導出の解説スライド．
// 教科書は外接円から入るが，生徒には「なぜ円が出てくるのか」がわからない．
// そこで「高さ」から入り，比の値の正体を探す中で円が自然に出てくる流れにする．
//   1 測量の問題（川の向こうの木．2角と1辺で三角形は決まる → 計算できるはず）
//   2 既習で解く（垂線を下ろして直角三角形をつくる．どこから下ろす？）
//   3 文字で一般化（AH = c sin B = b sin C → b/sin B = c/sin C）
//   4 ほかの頂点からも → 3つの比が等しい
//   5 鈍角でも成り立つ（sin(180° − θ) = sin θ ＝ 三角比の拡張の出番）
//   6 比の値 k の正体は？（k は a と ∠A だけで決まる → a と ∠A を変えずに動ける A の通り道は円）
//   7 復習：円周角の定理（中心角が 180° より大きいときもふくめる）
//   8 外接円と k = 2R
//   9 証明（A を円の上で A′ まで動かして直角三角形に．中心角 ∠BOC = 2A のスライダーで鋭角・直角・鈍角）
//  10 別の見方：中心 O から弦の半分 = R sin A（中心角が 180° を超えるときは ∠BOM = 180° − A）
//  11 まとめ（測量の答え，「正弦」の名前）
// 横長の画面では拡張のスライドと同じく，左に説明（数値の説明もここ），右に図と操作を並べる．
// 「1行ずつ表示」を切り替えられる（端末が覚える）．オンのときは「次へ」でも1行ずつ出る．
// 計算部分は node から読めるようにしてある（tests/sine.test.js）．
(function (root) {
  'use strict';

  const RAD = Math.PI / 180;

  // ---------------- 計算（画面に依存しない） ----------------
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  // ∠QPR（度）
  function angleAt(P, Q, R) {
    const u = sub(Q, P), v = sub(R, P);
    const c = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]));
    return Math.acos(Math.max(-1, Math.min(1, c))) / RAD;
  }
  // P から直線 QR に下ろした垂線の足．t は Q → R の位置（0〜1 なら線分の上）
  function foot(P, Q, R) {
    const d = sub(R, Q);
    const t = ((P[0] - Q[0]) * d[0] + (P[1] - Q[1]) * d[1]) / (d[0] * d[0] + d[1] * d[1]);
    return { pt: [Q[0] + t * d[0], Q[1] + t * d[1]], t };
  }
  // 外接円（中心と半径）
  function circumcircle(A, B, C) {
    const d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    const a2 = A[0] * A[0] + A[1] * A[1], b2 = B[0] * B[0] + B[1] * B[1], c2 = C[0] * C[0] + C[1] * C[1];
    const x = (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / d;
    const y = (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / d;
    return { O: [x, y], R: dist([x, y], A) };
  }
  // 辺 a = BC，b = CA，c = AB と角
  function measure(A, B, C) {
    return {
      a: dist(B, C), b: dist(C, A), c: dist(A, B),
      A: angleAt(A, B, C), B: angleAt(B, C, A), C: angleAt(C, A, B)
    };
  }
  // 三角形として見やすいか（つぶれていない）
  function healthy(A, B, C) {
    const m = measure(A, B, C);
    return Math.min(m.a, m.b, m.c) >= 40 && Math.min(m.A, m.B, m.C) >= 8;
  }
  // 直線 QR について P と S が同じ側か
  function sameSide(P, S, Q, R) {
    const cr = X => (R[0] - Q[0]) * (X[1] - Q[1]) - (R[1] - Q[1]) * (X[0] - Q[0]);
    return cr(P) * cr(S) > 0;
  }

  // 小数の表示（−0 を出さない）
  function fmt(v, digits) {
    const d = digits == null ? 2 : digits;
    let s = (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
    if (/^-0(\.0+)?$/.test(s)) s = s.replace('-', '');
    return s;
  }

  // 測量の問題（AB = 100 m，∠A = 75°，∠B = 60°）
  const SURVEY = { c: 100, A: 75, B: 60, C: 45 };
  SURVEY.b = SURVEY.c * Math.sin(SURVEY.B * RAD) / Math.sin(SURVEY.C * RAD); // AC = 50√6
  SURVEY.a = SURVEY.c * Math.sin(SURVEY.A * RAD) / Math.sin(SURVEY.C * RAD); // BC
  SURVEY.R = SURVEY.c / (2 * Math.sin(SURVEY.C * RAD)); // 50√2

  const api = { sub, dist, angleAt, foot, circumcircle, measure, healthy, sameSide, fmt, SURVEY };

  // ---------------- 画面（ブラウザだけ） ----------------
  // 1行ずつ表示の設定（端末が覚える）
  const STEP_KEY = 'trian.sine.stepMode';
  function loadStepMode() { try { return localStorage.getItem(STEP_KEY) === '1'; } catch (e) { return false; } }
  function saveStepMode(on) { try { localStorage.setItem(STEP_KEY, on ? '1' : '0'); } catch (e) { /* 保存できなくても動く */ } }

  function create(ctx) {
    const T = ctx.T, D = ctx.D;
    const $ = id => document.getElementById(id);

    // --- SVG の部品 ---
    const W = 360;
    const INK = '#0f172a', MUTE = '#94a3b8';
    const C_H = 'var(--theme-accent)';        // 高さ（垂線）
    const C_CIR = '#0369a1';                  // 円
    const C_SIDE = 'var(--theme-primary)';    // 注目する辺
    const line = (a, b, color, w, extra) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${w || 2.5}" stroke-linecap="round" ${extra || ''}/>`;
    const dash = (a, b, color, w) => line(a, b, color, w || 1.8, 'stroke-dasharray="6 5"');
    const dot = (p, color, rr) => `<circle cx="${p[0]}" cy="${p[1]}" r="${rr || 5}" fill="${color || INK}"/>`;
    const handle = p => `<circle cx="${p[0]}" cy="${p[1]}" r="13" fill="rgba(13,148,136,0.14)" stroke="var(--theme-primary)" stroke-width="1.5" stroke-dasharray="3 3"/>` + dot(p, INK, 5);
    const text = (p, s, cls, anchor) => `<text x="${p[0]}" y="${p[1]}" class="${cls || 'ex-t'}" text-anchor="${anchor || 'middle'}" dominant-baseline="middle">${s}</text>`;
    const poly = (pts, fill, stroke, w) => `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${fill || 'none'}" stroke="${stroke || 'none'}" stroke-width="${w || 0}" stroke-linejoin="round"/>`;
    const circle = (O, r, color, w, dashed) => `<circle cx="${O[0]}" cy="${O[1]}" r="${r}" fill="none" stroke="${color}" stroke-width="${w || 1.8}" ${dashed ? 'stroke-dasharray="6 5"' : ''}/>`;
    const unit = v => { const n = Math.hypot(v[0], v[1]) || 1; return [v[0] / n, v[1] / n]; };
    const add = (p, v, k) => [p[0] + v[0] * (k == null ? 1 : k), p[1] + v[1] * (k == null ? 1 : k)];
    // SVG 上の向き（度．y は下向きのまま）
    const dirDeg = (P, Q) => Math.atan2(Q[1] - P[1], Q[0] - P[0]) / RAD;

    // 頂点 P の角の弧（P→Q と P→R の間）
    function angArc(P, Q, R, rad, color, fill) {
      const a1 = dirDeg(P, Q), a2 = dirDeg(P, R);
      let d = a2 - a1; while (d > 180) d -= 360; while (d <= -180) d += 360;
      const s = [P[0] + rad * Math.cos(a1 * RAD), P[1] + rad * Math.sin(a1 * RAD)];
      const e = [P[0] + rad * Math.cos(a2 * RAD), P[1] + rad * Math.sin(a2 * RAD)];
      const sweep = d > 0 ? 1 : 0;
      let out = '';
      if (fill) out += `<path d="M ${P[0]} ${P[1]} L ${s[0]} ${s[1]} A ${rad} ${rad} 0 0 ${sweep} ${e[0]} ${e[1]} Z" fill="${fill}" stroke="none"/>`;
      out += `<path d="M ${s[0]} ${s[1]} A ${rad} ${rad} 0 0 ${sweep} ${e[0]} ${e[1]}" fill="none" stroke="${color || C_H}" stroke-width="2.2"/>`;
      return out;
    }
    // 角の弧の中ほどに文字
    function angLabel(P, Q, R, rad, s, cls) {
      const u = unit(add(unit(sub(Q, P)), unit(sub(R, P))));
      return text(add(P, u, rad), s, cls || 'ex-t ex-small');
    }
    // 直角の印（F で，F→Q と F→R が直角）
    function rightMark(F, Q, R, k) {
      const kk = k || 10, u = unit(sub(Q, F)), v = unit(sub(R, F));
      const p1 = add(F, u, kk), p2 = add(p1, v, kk), p3 = add(F, v, kk);
      return `<polyline points="${p1.join(',')} ${p2.join(',')} ${p3.join(',')}" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
    }
    // 頂点の名前（重心から外向き）
    function vLabel(P, G, s, k) {
      return text(add(P, unit(sub(P, G)), k || 20), s, 'ex-t ex-pt');
    }
    const centroid = (A, B, C) => [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
    // 辺の中点の外側に文字
    function sideLabel(P, Q, G, s, k, cls) {
      const M = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
      return text(add(M, unit(sub(M, G)), k || 14), s, cls || 'ex-t ex-var');
    }
    function svgWrap(H, inner, id) {
      return `<div class="figure ex-figure sn-figure" style="aspect-ratio:${W}/${H};--arw:${(W / H).toFixed(4)}"><svg viewBox="0 0 ${W} ${H}" ${id ? `id="${id}"` : ''}>${inner}</svg></div>`;
    }

    // 三角形 ABC（辺の名前 a，b，c つき）
    function triangle(P, opt) {
      const o = opt || {};
      const G = centroid(P.A, P.B, P.C);
      let s = poly([P.A, P.B, P.C], o.fill || 'rgba(13,148,136,0.06)', INK, 2.4);
      if (o.sides !== false) {
        s += sideLabel(P.B, P.C, G, 'a') + sideLabel(P.C, P.A, G, 'b') + sideLabel(P.A, P.B, G, 'c');
      }
      if (o.angles !== false) {
        s += angArc(P.A, P.B, P.C, 18, MUTE) + angArc(P.B, P.C, P.A, 18, MUTE) + angArc(P.C, P.A, P.B, 18, MUTE);
      }
      return s;
    }
    function vertices(P, drag) {
      const G = centroid(P.A, P.B, P.C);
      let s = '';
      ['A', 'B', 'C'].forEach(k => { s += (drag && drag.indexOf(k) >= 0) ? handle(P[k]) : dot(P[k]); });
      s += vLabel(P.A, G, 'A') + vLabel(P.B, G, 'B') + vLabel(P.C, G, 'C');
      return s;
    }

    // 頂点 X から対辺（の延長）に下ろす垂線．延長が必要なら点線でのばす
    function altitude(P, X) {
      const others = { A: ['B', 'C'], B: ['C', 'A'], C: ['A', 'B'] }[X];
      const Q = P[others[0]], R = P[others[1]];
      const f = foot(P[X], Q, R);
      let s = '';
      if (f.t < 0) s += dash(Q, f.pt, MUTE);
      if (f.t > 1) s += dash(R, f.pt, MUTE);
      s += line(P[X], f.pt, C_H, 2.6);
      // 直角の印は，足の位置から三角形の辺の側へ
      const toward = (f.t > 0.5) ? Q : R;
      if (dist(f.pt, toward) > 12 && dist(f.pt, P[X]) > 12) s += rightMark(f.pt, toward, P[X], 9);
      s += dot(f.pt, C_H, 4) + text(add(f.pt, unit(sub(f.pt, P[X])), 16), 'H', 'ex-t ex-pt');
      return { svg: s, H: f.pt, t: f.t };
    }

    // ---------------- ドラッグ ----------------
    // svg 上の点をつかんで動かす．pick(pt) でつかむ点の名前，move(name, pt) で動かす
    function bindDrag(svg, pick, move) {
      let cur = null;
      const toSvg = ev => {
        const m = svg.getScreenCTM();
        if (!m) return null;
        const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
        return [p.x, p.y];
      };
      svg.addEventListener('pointerdown', ev => {
        const p = toSvg(ev); if (!p) return;
        cur = pick(p);
        if (cur) { svg.setPointerCapture(ev.pointerId); move(cur, p); ev.preventDefault(); }
      });
      svg.addEventListener('pointermove', ev => { if (!cur) return; const p = toSvg(ev); if (p) move(cur, p); });
      const end = () => { cur = null; };
      svg.addEventListener('pointerup', end);
      svg.addEventListener('pointercancel', end);
    }
    // 一番近い頂点（30 以内）
    const nearest = (P, keys, p, r) => {
      let best = null, bd = r || 32;
      keys.forEach(k => { const d = dist(P[k], p); if (d < bd) { bd = d; best = k; } });
      return best;
    };
    const clampBox = (p, H) => [Math.max(16, Math.min(W - 16, p[0])), Math.max(16, Math.min(H - 16, p[1]))];

    // ---------------- 長さの表示 ----------------
    const UNIT = 40; // 40 px を長さ 1 とする
    const L = v => fmt(v / UNIT);
    const sinv = deg => Math.sin(deg * RAD);
    const degTex = deg => `${Math.round(deg)}^\\circ`;

    // ---------------- 1・2 測量 ----------------
    const H1 = 300;
    const SV = (() => {
      const B = [50, 272], A = [250, 272], s = 2; // 1 m = 2 px
      const C = [B[0] + SURVEY.a * s * Math.cos(60 * RAD), B[1] - SURVEY.a * s * Math.sin(60 * RAD)];
      return { A, B, C };
    })();
    function surveyBase(showC45) {
      const { A, B, C } = SV;
      let s = `<rect x="0" y="100" width="${W}" height="96" fill="rgba(3,105,161,0.12)"/>`;
      s += `<path d="M 0 100 Q 90 92 180 100 T 360 100" fill="none" stroke="rgba(3,105,161,0.45)" stroke-width="1.5"/>`;
      s += `<path d="M 0 196 Q 90 204 180 196 T 360 196" fill="none" stroke="rgba(3,105,161,0.45)" stroke-width="1.5"/>`;
      s += text([318, 150], '川', 'ex-t ex-small ex-tan');
      // 木
      s += `<rect x="${C[0] - 2}" y="${C[1] - 2}" width="4" height="12" fill="#92400e"/>`;
      s += `<circle cx="${C[0]}" cy="${C[1] - 10}" r="11" fill="rgba(22,163,74,0.55)"/>`;
      s += poly([A, B, C], 'rgba(13,148,136,0.05)', 'none');
      s += line(A, B, INK, 2.6) + line(B, C, INK, 2) + dash(A, C, C_SIDE, 2.4);
      s += angArc(B, A, C, 26, C_H) + angArc(A, C, B, 26, C_H);
      s += angLabel(B, A, C, 42, '60°', 'ex-t ex-small') + angLabel(A, C, B, 42, '75°', 'ex-t ex-small');
      if (showC45) s += angArc(C, A, B, 30, MUTE) + angLabel(C, A, B, 46, '45°', 'ex-t ex-small ex-mute');
      s += text([(A[0] + B[0]) / 2, A[1] + 18], '100 m', 'ex-t ex-small');
      s += text([(A[0] + C[0]) / 2 + 16, (A[1] + C[1]) / 2], '?', 'ex-t ex-var ex-opp');
      return s;
    }
    function surveyLabels() {
      const { A, B, C } = SV;
      return text([A[0] + 12, A[1] + 12], 'A', 'ex-t ex-pt') + text([B[0] - 12, B[1] + 12], 'B', 'ex-t ex-pt') +
        text([C[0] + 20, C[1] - 18], 'C', 'ex-t ex-pt') + dot(A) + dot(B) + dot(C);
    }
    function fig1() { return surveyBase(false) + surveyLabels(); }
    function fig2(from) {
      let s = surveyBase(!!from);
      if (from) {
        const P = { A: SV.A, B: SV.B, C: SV.C };
        const al = altitude(P, from);
        // できた2つの直角三角形をうすく塗る
        const others = { A: ['B', 'C'], B: ['C', 'A'], C: ['A', 'B'] }[from];
        s += poly([P[from], P[others[0]], al.H], 'rgba(234,88,12,0.10)') + poly([P[from], P[others[1]], al.H], 'rgba(3,105,161,0.10)');
        s += al.svg;
      }
      return s + surveyLabels();
    }
    function info2(from) {
      if (!from) return `<p class="note">上のボタンで，垂線を下ろす頂点を選んでみよう．</p>`;
      if (from === 'A') return `<p><b>A から BC へ</b>：△ABH は斜辺 AB = 100 がわかっている．△ACH には求めたい AC がある．<span class="highlight">AH が2つの三角形をつなぐ</span>．</p>`;
      if (from === 'B') return `<p><b>B から AC へ</b>：BH = 100 sin 75° はわかるが，75° は有名角ではない（表が必要）．△BCH からわかるのは BC で，AC は AH + HC と足して求めることになる．<b>できるが遠回り</b>．</p>`;
      return `<p><b>C から AB へ</b>：△ACH も △BCH も，斜辺（AC，BC）がわからない．<b>わからない辺が2つ</b>残るので，この垂線だけでは AC が出ない．</p>`;
    }

    // ---------------- 3・4・5 動かせる三角形 ----------------
    const H3 = 290;
    const st = {
      p3: { A: [200, 62], B: [56, 240], C: [312, 240] },
      p4: { A: [200, 62], B: [56, 240], C: [312, 240] }, from4: 'A',
      p5: { A: [318, 88], B: [40, 240], C: [214, 240] },
      p6: { A: [150, 82], B: [90, 236], C: [270, 236] }, fix6: false, trail6: [], circ6: false,
      t7: 120, p7: 120, u9: 130, s9: 0.5, from2: null, stepMode: loadStepMode()
    };

    // 動かした結果がつぶれた三角形にならないときだけ受けつける
    function tryMove(P, k, p, H) {
      const q = Object.assign({}, P); q[k] = clampBox(p, H);
      if (!healthy(q.A, q.B, q.C)) return false;
      P[k] = q[k];
      return true;
    }

    function fig3() {
      const P = st.p3;
      let s = triangle(P, { angles: false });
      const al = altitude(P, 'A');
      s += angArc(P.B, P.C, P.A, 20, C_SIDE) + angArc(P.C, P.A, P.B, 20, C_SIDE);
      s += angLabel(P.B, P.C, P.A, 34, 'B', 'ex-t ex-small ex-tan') + angLabel(P.C, P.A, P.B, 34, 'C', 'ex-t ex-small ex-tan');
      s += al.svg + vertices(P, ['A', 'B', 'C']);
      return s;
    }
    function info3() {
      const P = st.p3, m = measure(P.A, P.B, P.C);
      const h = dist(P.A, foot(P.A, P.B, P.C).pt);
      let s = `<div class="visual-box">
        <div class="math-line">${D(`\\mathrm{AH} = c\\sin B \\fallingdotseq ${L(m.c)} \\times \\sin ${degTex(m.B)} \\fallingdotseq ${L(m.c * sinv(m.B))}`)}</div>
        <div class="math-line">${D(`\\mathrm{AH} = b\\sin C \\fallingdotseq ${L(m.b)} \\times \\sin ${degTex(m.C)} \\fallingdotseq ${L(m.b * sinv(m.C))}`)}</div>
      </div>`;
      if (m.B >= 89.5 || m.C >= 89.5) s += `<p class="note">B か C が直角・鈍角になると，H が辺 BC の外に出ます．このときも同じ式でよいかは，5枚目で確かめます．</p>`;
      else s += `<p class="note">頂点をドラッグしても，2つの値はいつも同じ（AH の長さ ${L(h)}）．</p>`;
      return s;
    }

    function fig4() {
      const P = st.p4;
      let s = triangle(P);
      s += altitude(P, st.from4).svg + vertices(P, ['A', 'B', 'C']);
      return s;
    }
    function info4() {
      const P = st.p4, m = measure(P.A, P.B, P.C);
      const k = [m.a / sinv(m.A), m.b / sinv(m.B), m.c / sinv(m.C)];
      const eq = { A: '\\frac{b}{\\sin B} = \\frac{c}{\\sin C}', B: '\\frac{c}{\\sin C} = \\frac{a}{\\sin A}', C: '\\frac{a}{\\sin A} = \\frac{b}{\\sin B}' }[st.from4];
      const hh = { A: '\\mathrm{AH} = c\\sin B = b\\sin C', B: '\\mathrm{BH} = a\\sin C = c\\sin A', C: '\\mathrm{CH} = b\\sin A = a\\sin B' }[st.from4];
      return `<div class="visual-box"><div class="math-line">${D(hh)}</div><div class="math-line">${D('\\Longrightarrow\\ ' + eq)}</div></div>
        <table class="ex-table sn-table">
          <tr><th>${T('\\frac{a}{\\sin A}')}</th><th>${T('\\frac{b}{\\sin B}')}</th><th>${T('\\frac{c}{\\sin C}')}</th></tr>
          <tr><td>${T(`\\frac{${L(m.a)}}{\\sin ${degTex(m.A)}}`)}</td><td>${T(`\\frac{${L(m.b)}}{\\sin ${degTex(m.B)}}`)}</td><td>${T(`\\frac{${L(m.c)}}{\\sin ${degTex(m.C)}}`)}</td></tr>
          <tr><td><b>${fmt(k[0] / UNIT)}</b></td><td><b>${fmt(k[1] / UNIT)}</b></td><td><b>${fmt(k[2] / UNIT)}</b></td></tr>
        </table>`;
    }

    function fig5() {
      const P = st.p5;
      let s = triangle(P, { angles: false });
      const al = altitude(P, 'A');
      const m = measure(P.A, P.B, P.C);
      // 鈍角の頂点では，外側の角 180° − C を示す
      ['B', 'C'].forEach(X => {
        const Y = X === 'B' ? P.C : P.B;
        s += angArc(P[X], Y, P.A, 18, C_SIDE);
        if (m[X] > 90.5) {
          s += angArc(P[X], al.H, P.A, 30, C_H, 'rgba(234,88,12,0.16)');
          s += angLabel(P[X], al.H, P.A, 52, `180°−${X}`, 'ex-t ex-small');
        }
      });
      s += al.svg + vertices(P, ['A', 'B', 'C']);
      return s;
    }
    function info5() {
      const P = st.p5, m = measure(P.A, P.B, P.C);
      const row = (X, side) => {
        const v = m[X];
        if (Math.abs(v - 90) < 0.5) return `<p>${T(X)} が<b>直角</b>：H = ${X}，${T(`\\mathrm{AH} = ${side} = ${side}\\sin 90^\\circ`)}（${T('\\sin 90^\\circ = 1')}）</p>`;
        if (v > 90) return `<p>${T(X)} が<b>鈍角</b>（${T(degTex(v))}）：${T(`\\mathrm{AH} = ${side}\\sin(180^\\circ - ${X}) = ${side}\\sin ${X}`)}</p>`;
        return `<p>${T(X)} は鋭角（${T(degTex(v))}）：${T(`\\mathrm{AH} = ${side}\\sin ${X}`)}</p>`;
      };
      return `<div class="visual-box">${row('B', 'c')}${row('C', 'b')}
        <div class="math-line">${D(`c\\sin B \\fallingdotseq ${L(m.c * sinv(m.B))},\\quad b\\sin C \\fallingdotseq ${L(m.b * sinv(m.C))}`)}</div></div>`;
    }

    // ---------------- 6 比の値 k の正体 ----------------
    const H6 = 290;
    function arcCircle6() {
      // B，C を通り，A を通る円（∠A を固定したときの A の通り道）
      return circumcircle(st.p6.A, st.p6.B, st.p6.C);
    }
    function fig6() {
      const P = st.p6;
      let s = '';
      if (st.fix6 && st.circ6) { const c = arcCircle6(); s += circle(c.O, c.R, C_CIR, 1.8, true); }
      st.trail6.forEach(q => { s += `<circle cx="${q[0]}" cy="${q[1]}" r="2.4" fill="${C_CIR}" fill-opacity="0.55"/>`; });
      s += triangle(P, { angles: false });
      s += line(P.B, P.C, C_SIDE, 4);
      s += angArc(P.A, P.B, P.C, 22, C_H, 'rgba(234,88,12,0.16)');
      s += vertices(P, ['A']);
      return s;
    }
    function info6() {
      const P = st.p6, m = measure(P.A, P.B, P.C);
      const k = m.a / sinv(m.A);
      return `<div class="visual-box">
        <div class="math-line">${D(`k = \\frac{a}{\\sin A} \\fallingdotseq \\frac{${L(m.a)}}{\\sin ${degTex(m.A)}} \\fallingdotseq ${fmt(k / UNIT)}`)}</div>
        <p class="note" style="text-align:center">${st.fix6 ? `a と ∠A（${Math.round(m.A)}°）を変えずに動かしています` : 'B，C は固定．A を自由に動かせます'}</p>
      </div>`;
    }

    // ---------------- 7 円周角の定理 ----------------
    const H7 = 300, O7 = [180, 146], R7 = 112;
    const onCircle = (O, R, deg) => [O[0] + R * Math.cos(deg * RAD), O[1] - R * Math.sin(deg * RAD)];
    const paramOf = (O, p) => { let d = Math.atan2(O[1] - p[1], p[0] - O[0]) / RAD; if (d < 0) d += 360; return d; };
    // 中心角（O のまわりを from から反時計回りに sweep 度．180° より大きくてもよい）
    function sector(O, r, from, sweep, color, fill) {
      const a = onCircle(O, r, from), b = onCircle(O, r, from + sweep), large = sweep > 180 ? 1 : 0;
      let out = '';
      if (fill) out += `<path d="M ${O[0]} ${O[1]} L ${a[0]} ${a[1]} A ${r} ${r} 0 ${large} 0 ${b[0]} ${b[1]} Z" fill="${fill}" stroke="none"/>`;
      return out + `<path d="M ${a[0]} ${a[1]} A ${r} ${r} 0 ${large} 0 ${b[0]} ${b[1]}" fill="none" stroke="${color}" stroke-width="2"/>`;
    }
    // 円周上の弧（from から反時計回りに sweep 度）を太く
    const arcOn = (O, r, from, sweep, color) => `<path d="M ${onCircle(O, r, from).join(' ')} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${onCircle(O, r, from + sweep).join(' ')}" fill="none" stroke="${color}" stroke-width="5" stroke-opacity="0.55" stroke-linecap="round"/>`;
    // 角 d が from から反時計回りに sweep 度の範囲にあるか
    const inArc = (d, from, sweep) => { const x = ((d - from) % 360 + 360) % 360; return x > 0 && x < sweep; };

    // B は 270° − t/2，C は 270° + t/2（下側の弧 BC の中心角が t）．P は円周上の角 p7（度）
    function pts7() {
      const t = st.t7;
      return { B: onCircle(O7, R7, 270 - t / 2), C: onCircle(O7, R7, 270 + t / 2), P: onCircle(O7, R7, st.p7) };
    }
    // P をふくまない側の弧 BC と，その中心角
    function arc7() {
      const t = st.t7, b = 270 - t / 2, c = 270 + t / 2;
      return inArc(st.p7, b, t) ? { from: c, sweep: 360 - t } : { from: b, sweep: t };
    }
    function fig7() {
      const { B, C, P } = pts7(), ar = arc7();
      let s = circle(O7, R7, C_CIR, 1.8);
      s += arcOn(O7, R7, ar.from, ar.sweep, C_SIDE);
      if (Math.abs(ar.sweep - 180) < 0.5) s += line(B, C, MUTE, 1.6);
      else {
        s += line(O7, B, MUTE, 1.6) + line(O7, C, MUTE, 1.6);
        s += sector(O7, 22, ar.from, ar.sweep, C_CIR, 'rgba(3,105,161,0.12)');
        s += text(onCircle(O7, 40, ar.from + ar.sweep / 2), `${ar.sweep}°`, 'ex-t ex-small ex-tan');
      }
      s += dot(O7, INK, 3.5) + text(add(O7, unit(sub(O7, onCircle(O7, 1, ar.from + ar.sweep / 2))), 14), 'O', 'ex-t ex-pt');
      s += line(P, B, INK, 2.2) + line(P, C, INK, 2.2);
      const ang = angleAt(P, B, C);
      if (Math.abs(ang - 90) < 0.6) s += rightMark(P, B, C, 10);
      else s += angArc(P, B, C, 22, C_H, 'rgba(234,88,12,0.16)');
      s += angLabel(P, B, C, 40, `${Math.round(ang)}°`, 'ex-t ex-small');
      s += handle(P) + dot(B) + dot(C);
      s += text(add(B, unit(sub(B, O7)), 16), 'B', 'ex-t ex-pt') + text(add(C, unit(sub(C, O7)), 16), 'C', 'ex-t ex-pt') + text(add(P, unit(sub(P, O7)), 22), 'P', 'ex-t ex-pt');
      return s;
    }
    function info7() {
      const ar = arc7(), half = ar.sweep / 2, other = 180 - half;
      if (Math.abs(ar.sweep - 180) < 0.5) return `<div class="visual-box"><p>BC は<b>直径</b>（中心角 180°）．P がどこにあっても ${T('\\angle\\mathrm{BPC} = 90^\\circ')}．</p></div>`;
      const big = ar.sweep > 180 ? `<p class="note">中心角が <b>180° より大きい</b>ときも，円周角は中心角の半分．</p>` : '';
      return `<div class="visual-box"><div class="math-line">${D(`\\angle\\mathrm{BPC} = \\frac{1}{2} \\times ${ar.sweep}^\\circ = ${fmt(half, 0)}^\\circ`)}</div>${big}
        <p class="note">P を BC の反対側に動かすと，中心角は ${360 - ar.sweep}°，円周角は ${fmt(other, 0)}°（2つの円周角の和は 180°）．</p></div>`;
    }

    // ---------------- 8 外接円 ----------------
    const H8 = 300;
    st.p8 = { A: onCircle([180, 150], 112, 104), B: onCircle([180, 150], 112, 214), C: onCircle([180, 150], 112, 326) };
    function fig8() {
      const P = st.p8, c = circumcircle(P.A, P.B, P.C);
      let s = circle(c.O, c.R, C_CIR, 1.8);
      s += triangle(P);
      s += line(c.O, P.B, C_CIR, 2, 'stroke-dasharray="5 4"') + dot(c.O, C_CIR, 3.5);
      s += text(add(c.O, [0, -1], 12), 'O', 'ex-t ex-pt ex-tan');
      s += text(add([(c.O[0] + P.B[0]) / 2, (c.O[1] + P.B[1]) / 2], unit([-(P.B[1] - c.O[1]), P.B[0] - c.O[0]]), 12), 'R', 'ex-t ex-var ex-tan');
      s += vertices(P, ['A', 'B', 'C']);
      return s;
    }
    function info8() {
      const P = st.p8, m = measure(P.A, P.B, P.C), c = circumcircle(P.A, P.B, P.C);
      const k = m.a / sinv(m.A);
      return `<div class="visual-box">
        <div class="math-line">${D(`k \\fallingdotseq ${fmt(k / UNIT)},\\qquad R \\fallingdotseq ${fmt(c.R / UNIT)},\\qquad 2R \\fallingdotseq ${fmt(2 * c.R / UNIT)}`)}</div>
      </div>`;
    }

    // ---------------- 9 証明 ----------------
    // B は円周上の 205° の位置．C は B から反時計回りに中心角 u9 の位置．
    // A は残りの弧（中心角 u9 の弧をふくまない側）の上で，s9（0〜1）の位置．このとき ∠BOC = u9 = 2A．
    const H9 = 300, O9 = [180, 148], R9 = 114, PB9 = 205;
    function pts9() {
      const u = st.u9;
      const B = onCircle(O9, R9, PB9), A2 = onCircle(O9, R9, PB9 + 180);
      const C = onCircle(O9, R9, PB9 + u), A = onCircle(O9, R9, PB9 + u + st.s9 * (360 - u));
      return { A, B, C, A2, M: [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2] };
    }
    const slider9 = () => `<div class="slider-row ex-slider"><span class="ex-slabel">中心角 ∠BOC = 2A = <b id="sn9t-v">${st.u9}</b>°</span><input type="range" id="sn9t" min="20" max="340" step="2" value="${st.u9}"></div>`;
    const case9 = () => (Math.abs(st.u9 - 180) < 0.5 ? 'right' : st.u9 > 180 ? 'obtuse' : 'acute');
    function fig9(view) {
      const { A, B, C, A2, M } = pts9();
      const cs = case9(), u = st.u9;
      let s = circle(O9, R9, C_CIR, 1.8);
      s += arcOn(O9, R9, PB9, u, C_SIDE);
      s += poly([A, B, C], 'rgba(13,148,136,0.07)', INK, 2.4);
      if (view === 'A2') {
        if (cs !== 'right') {
          s += poly([A2, B, C], 'rgba(3,105,161,0.08)', 'none');
          s += dash(B, A2, C_CIR, 2.2) + dash(A2, C, C_CIR, 2.2);
          s += rightMark(C, B, A2, 10);
          s += angArc(A2, B, C, 22, C_CIR) + angLabel(A2, B, C, 38, 'A′', 'ex-t ex-small ex-tan');
          s += dot(A2, C_CIR, 4.5) + text(add(A2, unit(sub(A2, O9)), 18), 'A′', 'ex-t ex-pt ex-tan');
        }
      } else if (cs !== 'right') {
        // 中心 O から：中心角 ∠BOC = 2A（180° より大きいこともある）と，弦 BC の半分 BM
        s += sector(O9, 13, PB9, u, C_CIR, 'rgba(3,105,161,0.10)');
        s += text(onCircle(O9, cs === 'obtuse' ? 30 : 48, PB9 + u * (cs === 'obtuse' ? 0.5 : 0.76)), `${u}°`, 'ex-t ex-small ex-tan');
        s += line(O9, B, C_CIR, 2) + line(O9, C, C_CIR, 2);
      }
      s += line(B, C, C_SIDE, 3);
      if (view === 'O' && cs !== 'right') {
        const half = cs === 'obtuse' ? 180 - u / 2 : u / 2; // ∠BOM
        s += line(B, M, C_H, 5, 'stroke-opacity="0.85"');
        s += dash(O9, M, C_CIR, 2) + rightMark(M, B, O9, 9);
        s += angArc(O9, B, M, 30, C_H, 'rgba(234,88,12,0.18)');
        s += angLabel(O9, B, M, 44, `${fmt(half, 0)}°`, 'ex-t ex-small');
        // M の文字：A と反対側へ，さらに BC にそって C の方へずらす（OM や角 A の文字と重ならない）
        const along = unit(sub(C, B));
        s += dot(M, C_H, 3.5) + text(add(add(M, unit(sub(M, A)), 13), along, 12), 'M', 'ex-t ex-pt');
      }
      if (cs === 'right') s += rightMark(A, B, C, 18);
      // 辺 a の文字は，A と反対側に（鈍角のとき角 A の文字と重ならない）
      if (view === 'A2' || cs === 'right') s += text(add(M, unit(sub(M, A)), 15), 'a', 'ex-t ex-var');
      if (cs !== 'right') s += angArc(A, B, C, 22, C_H, 'rgba(234,88,12,0.16)') + angLabel(A, B, C, 38, view === 'O' ? `${fmt(u / 2, 0)}°` : 'A', 'ex-t ex-small');
      // O の文字：ふつうは弧 BC の反対側．中心 O から見る図では，OM や角の印をよけて B の反対側へ
      const oDir = view === 'O' && cs !== 'right' ? unit(sub(O9, B)) : unit(sub(O9, onCircle(O9, 1, PB9 + u / 2)));
      s += dot(O9, INK, 3.5) + text(cs === 'right' ? [O9[0] + 12, O9[1] - 10] : add(O9, oDir, 15), 'O', 'ex-t ex-pt');
      s += handle(A) + dot(B) + dot(C);
      s += text(add(A, unit(sub(A, O9)), 22), 'A', 'ex-t ex-pt') + text(add(B, unit(sub(B, O9)), 16), 'B', 'ex-t ex-pt') + text(add(C, unit(sub(C, O9)), 16), 'C', 'ex-t ex-pt');
      return s;
    }
    function info9(view) {
      const cs = case9(), u = st.u9, A = u / 2;
      const head = `<p>中心角 ${T(`\\angle\\mathrm{BOC} = 2A = ${u}^\\circ`)}，${T(`A = ${fmt(A, 0)}^\\circ`)}</p>`;
      if (cs === 'right') return `<div class="visual-box">${head}<p><b>A が直角</b>：BC が直径なので ${T('a = 2R')}．${T('\\sin A = \\sin 90^\\circ = 1')} だから</p><div class="math-line">${D('\\sin A = \\frac{a}{2R}')}</div></div>`;
      if (view === 'O') {
        if (cs === 'obtuse') return `<div class="visual-box">${head}<p><b>A が鈍角</b>：中心角 2A は <b>180° より大きい</b>．△OBC の内角は ${T('\\angle\\mathrm{BOC} = 360^\\circ - 2A')}，その半分が ${T('\\angle\\mathrm{BOM} = 180^\\circ - A')}</p><div class="math-line">${D('\\frac{a}{2} = R\\sin(180^\\circ - A) = R\\sin A')}</div></div>`;
        return `<div class="visual-box">${head}<p><b>A が鋭角</b>：OB = OC なので，OM は ∠BOC を2等分．${T('\\angle\\mathrm{BOM} = A')}</p><div class="math-line">${D('\\frac{a}{2} = R\\sin A')}</div></div>`;
      }
      if (cs === 'obtuse') return `<div class="visual-box">${head}<p><b>A が鈍角</b>：A と A′ は BC について<b>反対側</b>．2つの円周角の和は 180° なので ${T("A = 180^\\circ - A'")}</p><div class="math-line">${D("\\sin A = \\sin(180^\\circ - A') = \\sin A' = \\frac{a}{2R}")}</div></div>`;
      return `<div class="visual-box">${head}<p><b>A が鋭角</b>：A と A′ は BC について<b>同じ側</b>．円周角の定理で ${T("A = A'")}</p><div class="math-line">${D("\\sin A = \\sin A' = \\frac{a}{2R}")}</div></div>`;
    }

    // ---------------- 1行ずつ表示 ----------------
    let steps = [], shown = 0;
    function collectSteps() {
      steps = Array.prototype.slice.call(document.querySelectorAll('#tutorial-content .sn-step'));
      shown = st.stepMode ? 0 : steps.length;
      applySteps();
    }
    function applySteps() {
      steps.forEach((el, i) => el.classList.toggle('sn-hidden', i >= shown));
      const btn = $('sn-next-line');
      if (btn) {
        btn.classList.toggle('hidden', !st.stepMode);
        btn.disabled = shown >= steps.length;
        btn.textContent = shown >= steps.length ? 'すべて表示しました' : `▼ 次の行（あと ${steps.length - shown}）`;
      }
    }
    // 「次へ」ボタンから呼ばれる．まだ出していない行があれば1行出して true
    function advance() {
      if (!st.stepMode || shown >= steps.length) return false;
      shown++; applySteps();
      return true;
    }
    const bar = () => `
      <div class="sn-bar">
        <label class="sn-toggle"><input type="checkbox" id="sn-stepmode" ${st.stepMode ? 'checked' : ''}> 1行ずつ表示</label>
        <button type="button" class="secondary-btn sn-next ${st.stepMode ? '' : 'hidden'}" id="sn-next-line">▼ 次の行</button>
      </div>`;
    const steps_ = items => `<ol class="term-list sn-steps">${items.map(s => `<li class="sn-step">${s}</li>`).join('')}</ol>`;
    const btns = (id, list, cur) => `<div class="ex-btns sn-choose" id="${id}">${list.map(([k, lab]) => `<button type="button" class="${cur === k ? 'primary-btn' : 'secondary-btn'}" data-k="${k}">${lab}</button>`).join('')}</div>`;
    // 横長の画面（拡張のスライドと同じ）：左に説明，右に図と操作．
    // 図の下に書いていた数値の説明（id="snN-info"）は，左の列の最後に移す（図を大きく映すため）
    const slide = (lead, stage, side) => {
      const i = stage.search(/<div id="sn\d+-info"/);
      const info = i >= 0 ? stage.slice(i) : '';
      const st2 = i >= 0 ? stage.slice(0, i) : stage;
      return `<div class="tutorial-slide ex-slide sn-slide"><div class="ex-lead">${bar()}${lead}</div><div class="ex-stage">${st2}</div><div class="ex-side">${side}${info}</div></div>`;
    };

    // ---------------- スライド ----------------
    const slides = [
      // 1 測量の問題
      () => slide(
        `<p class="highlight-box"><b>測量の問題</b>　川の向こう岸にある木 C までの距離を知りたい．川は渡れないので，こちら岸の2点 A，B で測ります．</p>`,
        svgWrap(H1, fig1(), 'sn1-svg'),
        steps_([
          `測れたのは ${T('\\mathrm{AB} = 100\\ \\mathrm{m}')}，${T('\\angle\\mathrm{A} = 75^\\circ')}，${T('\\angle\\mathrm{B} = 60^\\circ')}．`,
          `求めたいのは AC．でも川を渡れないので，巻き尺では測れない．`,
          `<b>1辺とその両端の角</b>がわかると，三角形は1つに決まる（中学で学んだ合同条件）．`,
          `<b>決まるのだから，AC は計算で求められるはず</b>．`,
          `でも △ABC は直角三角形ではない．三角比は直角三角形で決めたもの．どうする？`
        ]) + `<p class="note">地図は，このように三角形をつないで距離を求める<b>三角測量</b>でつくられてきました．</p>`
      ),
      // 2 垂線で解く
      () => slide(
        `<p><b>直角三角形がないなら，垂線を下ろして直角三角形をつくる</b>．どの頂点から下ろすとよいでしょう？</p>`,
        svgWrap(H1, fig2(st.from2), 'sn2-svg') + btns('sn2-btns', [['A', 'A から BC へ'], ['B', 'B から AC へ'], ['C', 'C から AB へ']], st.from2) + `<div id="sn2-info" class="ex-info">${info2(st.from2)}</div>`,
        steps_([
          `A から BC に垂線 AH を下ろすと，直角三角形が2つできる．`,
          `△ABH：斜辺 AB = 100，∠B = 60° だから　${T('\\mathrm{AH} = 100\\sin 60^\\circ = 50\\sqrt{3}')}`,
          `△ACH：${T('\\angle\\mathrm{C} = 180^\\circ - (75^\\circ + 60^\\circ) = 45^\\circ')} だから　${T('\\mathrm{AH} = \\mathrm{AC}\\sin 45^\\circ')}`,
          `${T('\\mathrm{AC}\\sin 45^\\circ = 50\\sqrt{3}')} より　${T('\\mathrm{AC} = 50\\sqrt{3} \\div \\frac{1}{\\sqrt{2}} = 50\\sqrt{6} \\fallingdotseq 122.5\\ (\\mathrm{m})')}`,
          `<b>ポイント</b>：AH は2つの直角三角形に共通の辺．<span class="highlight">AH を2通りに表して，つないだ</span>．`
        ])
      ),
      // 3 文字で一般化
      () => slide(
        `<p>この手順を<b>文字のまま</b>やってみます．${T('a = \\mathrm{BC},\\ b = \\mathrm{CA},\\ c = \\mathrm{AB}')} とし，角の大きさを A，B，C で表します．頂点はドラッグで動かせます．</p>`,
        svgWrap(H3, fig3(), 'sn3-svg') + `<div id="sn3-info" class="ex-info">${info3()}</div>`,
        steps_([
          `A から直線 BC に垂線 AH を下ろす．`,
          `△ABH で　${T('\\mathrm{AH} = c\\sin B')}`,
          `△ACH で　${T('\\mathrm{AH} = b\\sin C')}`,
          `AH を2通りに表したので　${T('b\\sin C = c\\sin B')}`,
          `両辺を ${T('\\sin B\\sin C')} で割ると（${T('\\sin B,\\ \\sin C')} は 0 でない）${D('\\frac{b}{\\sin B} = \\frac{c}{\\sin C}')}`
        ])
      ),
      // 4 3つの比
      () => slide(
        `<p>ほかの頂点から垂線を下ろすと，どうなるでしょう？</p>`,
        svgWrap(H3, fig4(), 'sn4-svg') + btns('sn4-btns', [['A', 'A から'], ['B', 'B から'], ['C', 'C から']], st.from4) + `<div id="sn4-info" class="ex-info">${info4()}</div>`,
        steps_([
          `A から下ろす → ${T('\\frac{b}{\\sin B} = \\frac{c}{\\sin C}')}`,
          `B から下ろす → ${T('\\frac{c}{\\sin C} = \\frac{a}{\\sin A}')}（同じ手順で，文字が入れかわるだけ）`,
          `まとめると，3つの比はすべて等しい．${D('\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}')}`,
          `辺の長さは，<b>向かいの角の sin</b> に比例している（${T('a : b : c = \\sin A : \\sin B : \\sin C')}）．角そのものに比例するのではない．`
        ])
      ),
      // 5 鈍角でも
      () => slide(
        `<p>∠C を<b>鈍角</b>にすると，垂線の足 H は辺 BC の<b>外</b>に出ます．それでも ${T('\\mathrm{AH} = b\\sin C')} でよいでしょうか？</p>`,
        svgWrap(H3, fig5(), 'sn5-svg') + `<div id="sn5-info" class="ex-info">${info5()}</div>`,
        steps_([
          `△ACH は直角三角形で，${T('\\angle\\mathrm{ACH} = 180^\\circ - C')}`,
          `だから　${T('\\mathrm{AH} = b\\sin(180^\\circ - C)')}`,
          `三角比の拡張で学んだ ${T('\\sin(180^\\circ - \\theta) = \\sin\\theta')} より　${T('\\mathrm{AH} = b\\sin C')}（<b>鋭角のときと同じ式</b>）`,
          `C = 90° のときは H = C で ${T('\\mathrm{AH} = b')}．${T('\\sin 90^\\circ = 1')} なので，これも ${T('\\mathrm{AH} = b\\sin C')}`,
          `<b>どんな三角形でも</b> 3つの比は等しい．0°〜180° に拡張しておいたおかげ．`
        ])
      ),
      // 6 k の正体
      () => slide(
        `<p>3つの比の値を ${T('k')} とします．${T('k')} はどんな長さなのでしょう？</p>`,
        svgWrap(H6, fig6(), 'sn6-svg') + `<div class="ex-checks">
            <label><input type="checkbox" id="sn6-fix" ${st.fix6 ? 'checked' : ''}> ∠A を変えずに動かす</label>
            <label><input type="checkbox" id="sn6-circ" ${st.circ6 ? 'checked' : ''} ${st.fix6 ? '' : 'disabled'}> 通り道の円を表示</label>
          </div>
          <div class="ex-btns"><button type="button" class="secondary-btn" id="sn6-clear">通り道を消す</button></div>
          <div id="sn6-info" class="ex-info">${info6()}</div>`,
        steps_([
          `辺 BC を固定して A を動かすと，${T('k')} は変わる．`,
          `${T('k = \\frac{a}{\\sin A}')} なので，${T('k')} は <b>a と ∠A だけで決まる</b>．`,
          `そこで a と ∠A を変えないで A を動かしてみる（「∠A を変えずに動かす」をオン）．`,
          `A の通り道は，<b>B と C を通る円</b>になる（なぜ？ → 次のスライド）．`,
          `${T('k')} が変わらないのは，この円が変わらないから．<b>${T('k')} はこの円で決まる長さ</b>のはず．`
        ])
      ),
      // 7 円周角の定理
      () => slide(
        `<p class="highlight-box"><b>復習：円周角の定理</b>（中学3年）　円の上で P を動かしてみましょう．</p>`,
        svgWrap(H7, fig7(), 'sn7-svg') + `<div class="slider-row ex-slider"><span class="ex-slabel">下側の弧 BC の中心角 = <b id="sn7t-v">${st.t7}</b>°</span><input type="range" id="sn7t" min="40" max="320" step="2" value="${st.t7}"></div><div id="sn7-info" class="ex-info">${info7()}</div>`,
        steps_([
          `1つの弧に対する円周角は，その弧に対する<b>中心角の半分</b>．`,
          `中心角が <b>180° より大きい</b>ときも同じ（P を下側の弧に動かしてみよう）．`,
          `同じ弧に対する円周角は，P がどこにあっても<b>等しい</b>．`,
          `とくに，<b>直径</b>（中心角 180°）に対する円周角は 90°．`,
          `BC の両側の円周角の和は 180°（両側の中心角の和が 360° だから）．`,
          `逆に，BC について同じ側にあって ∠BPC が等しい点 P は，<b>1つの円の上</b>にある（円周角の定理の逆）．→ 6枚目で A の通り道が円になった理由．`
        ])
      ),
      // 8 外接円
      () => slide(
        `<p>A，B，C の3点を通る円を △ABC の<b>外接円</b>，その半径を ${T('R')} とします．${T('k')} と ${T('R')} を比べてみましょう．</p>`,
        svgWrap(H8, fig8(), 'sn8-svg') + `<div id="sn8-info" class="ex-info">${info8()}</div>`,
        steps_([
          `6枚目の A の通り道の円は，△ABC の<b>外接円</b>だった．`,
          `頂点をどう動かしても　${T('k = 2R')}（外接円の<b>直径</b>）．`,
          `では，なぜ直径になるのか？ → 次のスライドで証明する．`
        ]) + `<ul class="term-list"><li><b>外接円（circumscribed circle）</b>：三角形の3つの頂点を通る円．</li></ul>`
      ),
      // 9 証明（A を A′ へ）
      () => slide(
        `<p><b>証明</b>　∠A を変えずに，A を円の上で動かせる（円周角の定理）．<b>直角三角形ができる位置まで動かそう</b>．</p>`,
        svgWrap(H9, fig9('A2'), 'sn9-svg') + slider9() + `<div id="sn9-info" class="ex-info">${info9('A2')}</div>`,
        steps_([
          `B を通る直径 BA′ を引く．BA′ は直径だから ${T("\\angle\\mathrm{BCA'} = 90^\\circ")}．直角三角形 A′BC で　${T("\\sin A' = \\frac{a}{2R}")}`,
          `A が鋭角（中心角 < 180°）：A と A′ は BC について同じ側 → 円周角の定理で ${T("A = A'")} → ${T('\\sin A = \\frac{a}{2R}')}`,
          `A が鈍角（中心角 > 180°）：反対側 → 2つの円周角の和は 180° なので ${T("A = 180^\\circ - A'")} → ${T("\\sin A = \\sin(180^\\circ - A') = \\sin A'")}（ここでも拡張が効く）`,
          `A が直角（中心角 = 180°）：BC が直径 → ${T('a = 2R,\\ \\sin A = 1')}`,
          `どの場合も ${T('\\frac{a}{\\sin A} = 2R')}．B，C についても同じなので，${T('k = 2R')}．`
        ])
      ),
      // 10 別の見方（中心 O から．中心角が 180° を超えるとき）
      () => slide(
        `<p><b>別の見方</b>　中心 O から見ます．辺 a は外接円の<b>弦</b>．弦の半分を R と A で表してみよう．中心角 ∠BOC = 2A が <b>180° を超えるとき</b>に注意．</p>`,
        svgWrap(H9, fig9('O'), 'sn10-svg') + slider9() + `<div id="sn10-info" class="ex-info">${info9('O')}</div>`,
        steps_([
          `O から弦 BC に垂線 OM を下ろす．OB = OC（半径）なので，M は BC の中点で，OM は ∠BOC を2等分する．`,
          `A が鋭角：中心角 ∠BOC = 2A（円周角の定理）→ ${T('\\angle\\mathrm{BOM} = A')} → ${T('\\mathrm{BM} = R\\sin A')}`,
          `A が鈍角：中心角 2A は <b>180° より大きい</b>．△OBC の角としての ∠BOC は ${T('360^\\circ - 2A')} → ${T('\\angle\\mathrm{BOM} = 180^\\circ - A')} → ${T('\\mathrm{BM} = R\\sin(180^\\circ - A) = R\\sin A')}`,
          `どちらも ${T('\\frac{a}{2} = R\\sin A')}，つまり ${T('a = 2R\\sin A')}．<b>弦の半分 = 半径 × sin</b>．これが「正弦」の名前のもと．`
        ])
      ),
      // 10 まとめ
      () => slide(
        `<div class="highlight-box"><p><b>正弦定理</b>　△ABC の外接円の半径を ${T('R')} とすると</p><div class="math-line">${D('\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R')}</div></div>`,
        `<div class="visual-box">
          <p><b>測量の答え</b>（1枚目）</p>
          <div class="math-line">${D('\\frac{\\mathrm{AC}}{\\sin 60^\\circ} = \\frac{100}{\\sin 45^\\circ}\\ \\text{より}\\ \\mathrm{AC} = 100 \\times \\frac{\\sqrt{3}}{2} \\div \\frac{1}{\\sqrt{2}} = 50\\sqrt{6}')}</div>
          <div class="math-line">${D('2R = \\frac{100}{\\sin 45^\\circ} = 100\\sqrt{2}\\ \\text{より}\\ R = 50\\sqrt{2}')}</div>
          <p class="note">垂線を引かなくても，1行で求められる．</p>
        </div>`,
        steps_([
          `<b>流れ</b>：直角三角形がない → 垂線で直角三角形をつくる → 高さを2通りに表す → 3つの比が等しい → その値は外接円の直径．`,
          `<b>なぜ円？</b>　比の値は a と ∠A だけで決まる．a と ∠A を変えずに動ける A の通り道が円だから．`,
          `<b>鈍角でも成り立つ</b>のは，${T('\\sin(180^\\circ - \\theta) = \\sin\\theta')}（三角比の拡張）のおかげ．`,
          `<b>なぜ「正弦」定理？</b>　${T('a = 2R\\sin A')} と書くと「弦 = 直径 × 正弦」．辺 a は外接円の<b>弦</b>．10枚目の「弦の半分 = R sin A」は，拡張のコラムの「弦の半分が sin」（半径 1）と同じ形．`
        ])
      )
    ];

    // ---------------- 動き ----------------
    function mount(index) {
      collectSteps();
      const tg = $('sn-stepmode');
      if (tg) tg.addEventListener('change', () => { st.stepMode = tg.checked; saveStepMode(st.stepMode); shown = st.stepMode ? 0 : steps.length; applySteps(); });
      const nx = $('sn-next-line');
      if (nx) nx.addEventListener('click', advance);

      const chooser = (id, cb) => {
        const box = $(id); if (!box) return;
        box.addEventListener('click', e => {
          const b = e.target.closest('button'); if (!b) return;
          cb(b.dataset.k);
          box.querySelectorAll('button').forEach(x => { x.className = x === b ? 'primary-btn' : 'secondary-btn'; });
        });
      };
      // 頂点を3つとも動かせる三角形
      const freeTri = (svgId, P, H, redraw) => {
        const svg = $(svgId);
        bindDrag(svg, p => nearest(P, ['A', 'B', 'C'], p), (k, p) => { if (tryMove(P, k, p, H)) redraw(); });
      };

      if (index === 1) {
        chooser('sn2-btns', k => { st.from2 = k; $('sn2-svg').innerHTML = fig2(k); $('sn2-info').innerHTML = info2(k); });
      } else if (index === 2) {
        freeTri('sn3-svg', st.p3, H3, () => { $('sn3-svg').innerHTML = fig3(); $('sn3-info').innerHTML = info3(); });
      } else if (index === 3) {
        const redraw = () => { $('sn4-svg').innerHTML = fig4(); $('sn4-info').innerHTML = info4(); };
        freeTri('sn4-svg', st.p4, H3, redraw);
        chooser('sn4-btns', k => { st.from4 = k; redraw(); });
      } else if (index === 4) {
        freeTri('sn5-svg', st.p5, H3, () => { $('sn5-svg').innerHTML = fig5(); $('sn5-info').innerHTML = info5(); });
      } else if (index === 5) {
        const svg = $('sn6-svg');
        const redraw = () => { svg.innerHTML = fig6(); $('sn6-info').innerHTML = info6(); };
        let circ = null; // ∠A を固定したときの円
        bindDrag(svg, p => (dist(p, st.p6.A) < 34 ? 'A' : null), (k, p) => {
          const P = st.p6;
          if (!st.fix6) { if (tryMove(P, 'A', p, H6)) redraw(); return; }
          // 円の上に乗せる．BC について A と同じ側の弧だけ
          const q = add(circ.O, unit(sub(p, circ.O)), circ.R);
          if (!sameSide(q, P.A, P.B, P.C)) return;
          if (q[0] < 8 || q[0] > W - 8 || q[1] < 8 || q[1] > H6 - 8) return;
          const test = { A: q, B: P.B, C: P.C };
          if (!healthy(test.A, test.B, test.C)) return;
          P.A = q;
          const last = st.trail6[st.trail6.length - 1];
          if (!last || dist(last, q) > 7) st.trail6.push(q);
          redraw();
        });
        const fix = $('sn6-fix'), cc = $('sn6-circ');
        fix.addEventListener('change', () => {
          st.fix6 = fix.checked; cc.disabled = !st.fix6;
          if (st.fix6) { circ = arcCircle6(); st.trail6 = [st.p6.A]; } else { st.circ6 = false; cc.checked = false; }
          redraw();
        });
        if (st.fix6) circ = arcCircle6();
        cc.addEventListener('change', () => { st.circ6 = cc.checked; redraw(); });
        $('sn6-clear').addEventListener('click', () => { st.trail6 = []; redraw(); });
      } else if (index === 6) {
        const svg = $('sn7-svg');
        const redraw = () => { svg.innerHTML = fig7(); $('sn7-info').innerHTML = info7(); };
        const keepOff = () => {
          // B，C の近く（±8°）には P を置かない
          const b = 270 - st.t7 / 2, c = 270 + st.t7 / 2;
          const near = (x, y) => Math.abs(((x - y + 540) % 360) - 180) < 8;
          return !(near(st.p7, b) || near(st.p7, c));
        };
        bindDrag(svg, p => 'P', (k, p) => {
          const prev = st.p7; st.p7 = paramOf(O7, p);
          if (!keepOff()) st.p7 = prev;
          redraw();
        });
        const sl = $('sn7t');
        sl.addEventListener('input', () => {
          st.t7 = parseInt(sl.value, 10); $('sn7t-v').textContent = st.t7;
          if (!keepOff()) st.p7 = st.t7 > 180 ? 270 : 90;
          redraw();
        });
      } else if (index === 7) {
        freeTri('sn8-svg', st.p8, H8, () => { $('sn8-svg').innerHTML = fig8(); $('sn8-info').innerHTML = info8(); });
      } else if (index === 8 || index === 9) {
        const view = index === 8 ? 'A2' : 'O', id = index === 8 ? 'sn9' : 'sn10';
        const svg = $(id + '-svg');
        const redraw = () => { svg.innerHTML = fig9(view); $(id + '-info').innerHTML = info9(view); };
        bindDrag(svg, p => 'A', (k, p) => {
          // A は中心角 u9 の弧をふくまない側だけ（B，C の近くは避ける）
          const from = PB9 + st.u9, sweep = 360 - st.u9;
          const x = ((paramOf(O9, p) - from) % 360 + 360) % 360;
          const sNew = x / sweep, margin = 9 / sweep;
          if (sNew > margin && sNew < 1 - margin) { st.s9 = sNew; redraw(); }
        });
        const sl = $('sn9t');
        sl.addEventListener('input', () => {
          let u = parseInt(sl.value, 10);
          if (Math.abs(u - 180) <= 4) u = 180; // 直角に吸いつく
          st.u9 = u; $('sn9t-v').textContent = u;
          redraw();
        });
      }
    }

    return { title: '正弦定理（なぜ成り立つのか）', slides, mount, advance };
  }

  api.create = create;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TrianSine = api;
})(typeof window !== 'undefined' ? window : this);
