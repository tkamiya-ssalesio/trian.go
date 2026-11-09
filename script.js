document.addEventListener('DOMContentLoaded', () => {
  const C = window.TrianCore;
  const AP = window.TrianApply;
  const RL = window.TrianRelation;
  const isApply = cat => cat.indexOf('apply') === 0;

  // --- State ---
  let currentCategory = 'three';
  let currentGameMode = 'practice';
  let currentProblem = null;
  let isGameOver = false;
  let isLocked = false; // 正解後，次の問題までの間

  let practiceStreak = 0;
  let taStartTime = 0;
  let taQuestionsDone = 0;
  let taTimerInterval = null;
  const TA_GOAL = 5;
  let svHp = 3;
  let saScore = 0;
  let saTimeLeft = 90;
  let saCombo = 0;
  let saMaxCombo = 0;
  let saTimerInterval = null;
  let nextTimer = null;
  let lastWrongKey = null; // 直前の誤答（同じ答えでの再判定に罰を入れない）

  // --- DOM ---
  const $ = id => document.getElementById(id);
  const appHeader = $('app-header');
  const backBtn = $('back-btn');
  const headerTitle = $('header-title');
  const screens = ['title-screen', 'tutorial-select-screen', 'tutorial-screen', 'mode-select-screen', 'intro-screen', 'problem-area'].map($);
  const [titleScreen, tutorialSelectScreen, tutorialScreen, modeSelectScreen, introScreen, problemArea] = screens;

  const tutorialTitle = $('tutorial-title');
  const tutorialContent = $('tutorial-content');
  const slideIndicator = $('slide-indicator');
  const tutorialPrevBtn = $('tutorial-prev-btn');
  const tutorialNextBtn = $('tutorial-next-btn');

  const statsLeft = $('stats-left');
  const statsRight = $('stats-right');
  const problemPrompt = $('problem-prompt');
  const figure = $('figure');
  const showFigureBtn = $('show-figure-btn');
  const answerList = $('answer-list');
  const explainBox = $('explain-box');
  const judgeBtn = $('judge-btn');
  const showExplainBtn = $('show-explain-btn');
  const nextBtn = $('next-btn');
  const gameView = $('game-view');
  const resultView = $('result-view');
  const feedbackToast = $('feedback-toast');

  // --- Math rendering ---
  const T = (tex, display) => (typeof katex !== 'undefined')
    ? katex.renderToString(tex, { throwOnError: false, displayMode: !!display })
    : '<span class="tex-fallback">' + tex.replace(/[<>&]/g, '') + '</span>';
  if (typeof katex === 'undefined') {
    setTimeout(() => showFeedback('数式の表示部品を読み込めませんでした．ネットワークを確認して再読み込みしてください．', 'error'), 300);
  }
  const D = tex => T('\\displaystyle ' + tex);

  // --- Figure (SVG + KaTeX labels) ---
  // opts: sideTex {hyp,opp,adj} / sideHTML / labelText / sideColor / hideVertex / unit / anchor
  function figureHTML(prob, opts) {
    opts = opts || {};
    const sideTex = {}, labelText = {};
    for (const k of ['hyp', 'opp', 'adj']) {
      if (opts.sideHTML && opts.sideHTML[k] !== undefined) {
        labelText[k] = (opts.labelText && opts.labelText[k]) || 'xxxx';
      } else if (opts.sideTex && opts.sideTex[k] !== undefined) {
        sideTex[k] = opts.sideTex[k];
        labelText[k] = (opts.labelText && opts.labelText[k]) || opts.sideTex[k];
      } else if (prob.hidden === k) {
        sideTex[k] = '?';
        labelText[k] = '?';
      } else {
        sideTex[k] = C.sqrtTex(prob[k + '2']);
        labelText[k] = C.sqrtPlain(prob[k + '2']);
      }
    }
    const L = C.layoutTriangle(prob, Object.assign({}, opts, { labelText }));
    const f = v => v.toFixed(1);
    const pt = p => f(p[0]) + ',' + f(p[1]);
    const { P, W, H } = L;
    const color = opts.sideColor || {};
    const line = (k, p, q) => {
      const dashed = prob.hidden === k && !opts.sideTex;
      return `<line x1="${f(P[p][0])}" y1="${f(P[p][1])}" x2="${f(P[q][0])}" y2="${f(P[q][1])}" class="tri-side${dashed ? ' is-hidden' : ''}" ${color[k] ? `style="stroke:${color[k]};stroke-width:4"` : ''}/>`;
    };
    const a = L.arc;
    let svg = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <polygon points="${pt(P.A)} ${pt(P.B)} ${pt(P.C)}" class="tri-fill"/>
      <path d="M ${pt(P.A)} L ${pt(a.start)} A ${a.r} ${a.r} 0 0 ${a.sweep} ${pt(a.end)} Z" class="theta-fill"/>
      <path d="M ${pt(a.start)} A ${a.r} ${a.r} 0 0 ${a.sweep} ${pt(a.end)}" class="theta-arc"/>
      <polyline points="${L.rightMark.map(pt).join(' ')}" class="right-mark"/>
      ${line('hyp', 'A', 'B')}${line('opp', 'B', 'C')}${line('adj', 'A', 'C')}
    </svg>`;
    const pos = p => `left:${(p[0] / W * 100).toFixed(2)}%;top:${(p[1] / H * 100).toFixed(2)}%`;
    let labels = '';
    if (!opts.hideVertex) {
      for (const v of ['A', 'B', 'C']) labels += `<div class="lbl lbl-vertex" style="${pos(L.vertexLabels[v])}">${T('\\mathrm{' + v + '}')}</div>`;
    }
    for (const k of ['hyp', 'opp', 'adj']) {
      if (opts.hideSides && opts.hideSides.indexOf(k) >= 0) continue;
      const inner = (opts.sideHTML && opts.sideHTML[k] !== undefined) ? opts.sideHTML[k] : T(sideTex[k]);
      const cls = prob.hidden === k && !opts.sideTex ? ' lbl-unknown' : '';
      labels += `<div class="lbl lbl-side${cls}" style="${pos(L.sideLabels[k])}">${inner}</div>`;
    }
    labels += `<div class="lbl lbl-theta" style="${pos(L.thetaLabel)}">${T('\\theta')}</div>`;
    return svg + labels;
  }

  // --- 三角比の活用の図（apply.js の sceneLayout を描くだけ） ---
  function sceneFigureHTML(scene) {
    const L = AP.sceneLayout(scene);
    const f = v => v.toFixed(1), pt = p => f(p[0]) + ',' + f(p[1]);
    let svg = `<svg viewBox="0 0 ${AP.W} ${AP.H}" aria-hidden="true">`;
    L.polys.forEach(q => { svg += `<polygon points="${q.pts.map(pt).join(' ')}" class="${q.cls}"/>`; });
    const a = L.arc;
    svg += `<path d="M ${pt(a.A)} L ${pt(a.start)} A ${a.r} ${a.r} 0 0 ${a.sweep} ${pt(a.end)} Z" class="theta-fill"/>`;
    svg += `<path d="M ${pt(a.start)} A ${a.r} ${a.r} 0 0 ${a.sweep} ${pt(a.end)}" class="theta-arc"/>`;
    svg += `<polyline points="${L.right.map(pt).join(' ')}" class="right-mark"/>`;
    L.lines.forEach(l => { svg += `<line x1="${f(l.p[0])}" y1="${f(l.p[1])}" x2="${f(l.q[0])}" y2="${f(l.q[1])}" class="${l.cls}"/>`; });
    svg += '</svg>';
    const pos = p => `left:${(p[0] / AP.W * 100).toFixed(2)}%;top:${(p[1] / AP.H * 100).toFixed(2)}%`;
    const labels = L.labels.map(l => `<div class="lbl ${l.cls}" style="${pos(l.p)}">${T(l.tex)}</div>`).join('');
    return svg + labels;
  }

  // 問題文の $...$ を数式に
  const richText = text => text.replace(/\$([^$]+)\$/g, (m, tex) => T(tex));

  // --- Answer inputs ---
  const RATIO_ROWS = [
    { key: 'sin', tex: '\\sin\\theta =' },
    { key: 'cos', tex: '\\cos\\theta =' },
    { key: 'tan', tex: '\\tan\\theta =' }
  ];

  function inputHTML(role, ph, cls) {
    return `<input type="text" inputmode="numeric" autocomplete="off" maxlength="4" class="val-input ${cls || ''}" data-role="${role}" placeholder="${ph || ''}">`;
  }

  function ratioRowHTML(row) {
    return `
      <div class="ans-row" data-kind="ratio" data-key="${row.key}" data-num-root="0" data-frac="0" data-den-root="0">
        <div class="ans-label">${T(row.tex)}</div>
        <div class="ans-body">
          <div class="ans-value">
            <div class="ans-part ans-num">
              ${inputHTML('a', ' ', 'coef')}
              <span class="rad hidden"><span class="rad-sign">√</span>${inputHTML('b')}</span>
            </div>
            <div class="ans-line hidden"></div>
            <div class="ans-part ans-den hidden">
              ${inputHTML('c', ' ', 'coef')}
              <span class="rad hidden"><span class="rad-sign">√</span>${inputHTML('d')}</span>
            </div>
          </div>
          <div class="ans-toggles">
            <button type="button" class="toggle-btn" data-toggle="frac">分数</button>
            <button type="button" class="toggle-btn" data-toggle="numRoot">√</button>
            <button type="button" class="toggle-btn hidden" data-toggle="denRoot">分母に√</button>
          </div>
        </div>
        <div class="ans-mark"></div>
      </div>`;
  }

  // 三角比の活用：数を1つ答える欄（約 □ °／□ m）
  function numRowHTML(a) {
    const pre = a.kind === 'angle' && a.mode === 'nearest' ? '<span class="num-affix">約</span>' : '';
    const unit = a.kind === 'angle' ? '°' + (a.mode === 'floor' ? ' 以下' : '') : a.unit;
    return `
      <div class="ans-row ans-row-num" data-kind="num">
        <div class="ans-label ans-label-text">${a.label}</div>
        <div class="ans-body">
          <div class="ans-value num-value">
            ${pre}<input type="text" inputmode="decimal" autocomplete="off" maxlength="8" class="val-input val-num" data-role="v">
            <span class="num-affix">${unit}</span>
          </div>
        </div>
        <div class="ans-mark"></div>
      </div>`;
  }

  function sideRowHTML(sideKey) {
    return `
      <div class="ans-row ans-row-side" data-kind="side" data-key="${sideKey}" data-root="0">
        <div class="ans-label">${T('\\mathrm{' + C.SIDE_NAME[sideKey] + '} =')}</div>
        <div class="ans-body">
          <div class="ans-value">
            <div class="ans-part ans-num">
              ${inputHTML('k', ' ', 'coef')}
              <span class="rad hidden"><span class="rad-sign">√</span>${inputHTML('m')}</span>
            </div>
          </div>
          <div class="ans-toggles">
            <button type="button" class="toggle-btn" data-toggle="root">√</button>
          </div>
        </div>
        <div class="ans-mark"></div>
      </div>`;
  }

  function setToggle(row, name, on) {
    const attr = { frac: 'frac', numRoot: 'numRoot', denRoot: 'denRoot', root: 'root' }[name];
    row.dataset[attr] = on ? '1' : '0';
    const btn = row.querySelector(`[data-toggle="${name}"]`);
    if (btn) btn.classList.toggle('active', on);
    if (name === 'numRoot' || name === 'root') {
      setRootPart(row.querySelector('.ans-num'), on);
    }
    if (name === 'denRoot') {
      setRootPart(row.querySelector('.ans-den'), on);
    }
    if (name === 'frac') {
      row.querySelector('.ans-line').classList.toggle('hidden', !on);
      row.querySelector('.ans-den').classList.toggle('hidden', !on);
      row.querySelector('[data-toggle="denRoot"]').classList.toggle('hidden', !on);
      row.querySelector('[data-toggle="numRoot"]').textContent = on ? '分子に√' : '√';
      if (!on) setToggle(row, 'denRoot', false);
    }
    clearMark(row);
  }

  // √ を付けると √ の中の欄へ移る．√ の前の係数は書かなくてよい（空欄は 1）ので，
  // 空のうちは細い点線の枠に縮めて，生徒がノートに書く「√21」の見た目に近づける
  function setRootPart(part, on) {
    part.querySelector('.rad').classList.toggle('hidden', !on);
    part.classList.toggle('root-on', on);
    if (on && !isLocked) {
      const inner = part.querySelector('.rad .val-input');
      if (inner && inner.offsetParent !== null) inner.focus({ preventScroll: true });
    }
  }

  function clearMark(row) {
    row.classList.remove('is-correct', 'is-wrong', 'is-form');
    row.querySelector('.ans-mark').textContent = '';
  }

  answerList.addEventListener('click', e => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn || isLocked) return;
    const row = btn.closest('.ans-row');
    const name = btn.dataset.toggle;
    const on = row.dataset[name] !== '1';
    setToggle(row, name, on);
    // 新しく出た欄にフォーカス
    if (on) {
      const target = { frac: '[data-role="c"]', numRoot: '[data-role="b"]', denRoot: '[data-role="d"]', root: '[data-role="m"]' }[name];
      const el = row.querySelector(target);
      if (el) el.focus();
    }
  });

  answerList.addEventListener('input', e => {
    const row = e.target.closest('.ans-row');
    if (row) clearMark(row);
  });

  answerList.addEventListener('keydown', e => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') { e.preventDefault(); judge(); }
  });

  // 全角数字も受け付ける．空欄 → null，数でない → NaN
  function readInt(row, role) {
    const el = row.querySelector(`[data-role="${role}"]`);
    if (!el) return null;
    const s = el.value.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).trim();
    if (s === '') return null;
    if (!/^\d+$/.test(s)) return NaN;
    return parseInt(s, 10);
  }

  // --- Screens ---
  function show(screen, title, backLabel) {
    screens.forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
    if (screen === titleScreen) {
      appHeader.classList.add('hidden');
    } else {
      appHeader.classList.remove('hidden');
      headerTitle.textContent = title;
      backBtn.textContent = backLabel || '◀ 戻る';
    }
    window.scrollTo(0, 0);
  }

  $('go-to-tutorial-btn').addEventListener('click', () => show(tutorialSelectScreen, 'やり方を学ぶ'));
  $('go-to-training-btn').addEventListener('click', () => show(modeSelectScreen, 'ゲームモード選択'));

  backBtn.addEventListener('click', () => {
    resetGameTimers();
    if (!tutorialScreen.classList.contains('hidden')) show(tutorialSelectScreen, 'やり方を学ぶ');
    else if (!introScreen.classList.contains('hidden')) show(modeSelectScreen, 'ゲームモード選択');
    else if (!problemArea.classList.contains('hidden')) showIntro();
    else show(titleScreen);
  });

  // --- Tutorials ---
  const STD = { mode: 'axis', phi: 0, flip: false };
  const NAME_COLOR = { hyp: 'var(--c-hyp)', opp: 'var(--c-opp)', adj: 'var(--c-adj)' };
  const tag = (k, text) => `<span class="side-tag side-${k}">${text}</span>`;

  function similarFigure(k) {
    const prob = { opp2: 9 * k * k, adj2: 16 * k * k, hyp2: 25 * k * k, orient: STD };
    const fmt = v => String(Math.round(v * 10) / 10);
    return figureHTML(prob, {
      unit: 16, anchor: [44, 226],
      sideTex: { hyp: fmt(5 * k), opp: fmt(3 * k), adj: fmt(4 * k) }
    });
  }

  function similarValues(k) {
    const fmt = v => String(Math.round(v * 10) / 10);
    const b = fmt(3 * k), a = fmt(4 * k), h = fmt(5 * k);
    return `
      <div class="math-line">${D(`\\sin\\theta = \\frac{${b}}{${h}} = \\frac{3}{5}`)}</div>
      <div class="math-line">${D(`\\cos\\theta = \\frac{${a}}{${h}} = \\frac{4}{5}`)}</div>
      <div class="math-line">${D(`\\tan\\theta = \\frac{${b}}{${a}} = \\frac{3}{4}`)}</div>`;
  }

  function nestedFigure() {
    // 角 A を共有する相似な直角三角形を重ねる
    const A = [26, 240], u = 24;
    const tris = [1, 2, 3].map(k => {
      const Cx = A[0] + 4 * k * u, By = A[1] - 3 * k * u;
      return { k, C: [Cx, A[1]], B: [Cx, By] };
    });
    let svg = `<svg viewBox="0 0 360 260" aria-hidden="true">`;
    tris.slice().reverse().forEach((t, i) => {
      const op = [0.10, 0.16, 0.24][i];
      svg += `<polygon points="${A.join(',')} ${t.B.join(',')} ${t.C.join(',')}" fill="rgba(13,148,136,${op})" stroke="#0f172a" stroke-width="2"/>`;
      svg += `<polyline points="${t.C[0] - 11},${t.C[1]} ${t.C[0] - 11},${t.C[1] - 11} ${t.C[0]},${t.C[1] - 11}" fill="none" stroke="#0f172a" stroke-width="1.5"/>`;
    });
    svg += `<path d="M ${A[0] + 30} ${A[1]} A 30 30 0 0 0 ${A[0] + 30 * 0.8} ${A[1] - 30 * 0.6}" fill="none" stroke="var(--theme-accent)" stroke-width="2.5"/>`;
    svg += `</svg>`;
    let labels = `<div class="lbl lbl-theta" style="left:${(A[0] + 50) / 3.6}%;top:${(A[1] - 13) / 2.6}%">${T('\\theta')}</div>`;
    tris.forEach(t => {
      // 縦の辺（3, 6, 9）は右側，斜辺（5, 10, 15）は斜辺の左上
      labels += `<div class="lbl lbl-small" style="left:${(t.C[0] + 11) / 3.6}%;top:${(A[1] - 1.5 * t.k * u) / 2.6}%">${T(String(3 * t.k))}</div>`;
      const mx = A[0] + 2 * t.k * u, my = A[1] - 1.5 * t.k * u;
      labels += `<div class="lbl lbl-small" style="left:${(mx - 12) / 3.6}%;top:${(my - 16) / 2.6}%">${T(String(5 * t.k))}</div>`;
    });
    return svg + labels;
  }

  const tutorials = {
    define: {
      title: '三角比の定義',
      slides: [
        () => `
          <div class="tutorial-slide">
            <p>${T('\\angle \\mathrm{C} = 90^\\circ')} の直角三角形 ABC で，${T('\\angle \\mathrm{A}')} の大きさを ${T('\\theta')}（シータ）とします．</p>
            <div class="figure figure-small">${figureHTML({ opp2: 9, adj2: 16, hyp2: 25, orient: STD }, {
              sideHTML: { hyp: tag('hyp', '斜辺'), opp: tag('opp', '向かい'), adj: tag('adj', 'となり') },
              labelText: { hyp: 'xxxxxx', opp: 'xxxxxxxx', adj: 'xxxxxx' },
              pad: 58,
              sideColor: NAME_COLOR
            })}</div>
            <ul class="term-list">
              <li><b>斜辺（hypotenuse）</b>：直角の向かい側にある辺 AB．いちばん長い辺．</li>
              <li><b>θ の向かいの辺</b>：θ と向かい合う辺 BC．</li>
              <li><b>θ のとなりの辺</b>：θ をはさむ2辺のうち，斜辺でない方 AC．</li>
            </ul>
          </div>`,
        () => `
          <div class="tutorial-slide">
            <p>辺の長さの<span class="highlight">比</span>で，次の3つを決めます．</p>
            <div class="visual-box">
              <div class="math-line">${D('\\sin\\theta = \\frac{\\mathrm{BC}}{\\mathrm{AB}} = \\frac{\\textcolor{#ea580c}{\\text{向かい}}}{\\textcolor{#0f766e}{\\text{斜辺}}}')}</div>
              <div class="math-line">${D('\\cos\\theta = \\frac{\\mathrm{AC}}{\\mathrm{AB}} = \\frac{\\textcolor{#7c3aed}{\\text{となり}}}{\\textcolor{#0f766e}{\\text{斜辺}}}')}</div>
              <div class="math-line">${D('\\tan\\theta = \\frac{\\mathrm{BC}}{\\mathrm{AC}} = \\frac{\\textcolor{#ea580c}{\\text{向かい}}}{\\textcolor{#7c3aed}{\\text{となり}}}')}</div>
            </div>
            <ul class="term-list">
              <li><b>正弦（sine）</b>：${T('\\sin\\theta')}．読み方は「サイン・シータ」．</li>
              <li><b>余弦（cosine）</b>：${T('\\cos\\theta')}．読み方は「コサイン・シータ」．</li>
              <li><b>正接（tangent）</b>：${T('\\tan\\theta')}．読み方は「タンジェント・シータ」．</li>
              <li><b>三角比（trigonometric ratio）</b>：sin・cos・tan をまとめた呼び名．</li>
            </ul>
          </div>`,
        () => `
          <div class="tutorial-slide">
            <p>θ を左下，直角を右下に置くと，筆記体の <b>s・c・t</b> を書く順に辺を通ります．<span class="highlight">最初に通る辺が分母，次に通る辺が分子</span>です．</p>
            <div class="figure figure-small">${figureHTML({ opp2: 9, adj2: 16, hyp2: 25, orient: STD }, { sideTex: { hyp: '', opp: '', adj: '' } })}</div>
            <ul class="term-list">
              <li><b>s</b>：A → B → C．AB を通って BC へ．${T('\\sin\\theta = \\frac{\\mathrm{BC}}{\\mathrm{AB}}')}</li>
              <li><b>c</b>：B → A → C．AB を通って AC へ．${T('\\cos\\theta = \\frac{\\mathrm{AC}}{\\mathrm{AB}}')}</li>
              <li><b>t</b>：A → C → B．AC を通って CB へ．${T('\\tan\\theta = \\frac{\\mathrm{BC}}{\\mathrm{AC}}')}</li>
            </ul>
          </div>`,
        () => `
          <div class="tutorial-slide">
            <p class="warning">⚠️ 三角形の向きが変わっても，やることは同じです．</p>
            <div class="figure figure-small">${figureHTML({ opp2: 25, adj2: 144, hyp2: 169, orient: { mode: 'axis', phi: 180, flip: true } })}</div>
            <ol class="term-list">
              <li>直角の向かい側 → <span class="side-tag side-hyp">斜辺 AB = 13</span></li>
              <li>θ の向かい側 → <span class="side-tag side-opp">BC = 5</span></li>
              <li>残りの辺 → <span class="side-tag side-adj">AC = 12</span></li>
            </ol>
            <details class="reveal">
              <summary>sin θ・cos θ・tan θ を考えてから，答えを見る</summary>
              <div class="math-line">${D('\\sin\\theta = \\frac{5}{13}')}</div><div class="math-line">${D('\\cos\\theta = \\frac{12}{13}')}</div><div class="math-line">${D('\\tan\\theta = \\frac{5}{12}')}</div>
            </details>
            <p class="note">頭の中で三角形を回したり裏返したりして，θ が左下・直角が右下の形にしてもかまいません．</p>
          </div>`,
        () => `
          <div class="tutorial-slide">
            <p><b>例題</b>　下の図で，${T('\\sin\\theta')}，${T('\\cos\\theta')}，${T('\\tan\\theta')} の値を求めなさい．</p>
            <div class="figure figure-small">${figureHTML({ opp2: 4, adj2: 5, hyp2: 9, orient: STD })}</div>
            <details class="reveal">
              <summary>考えてから，答えを見る</summary>
              <div class="math-line">${D('\\sin\\theta = \\frac{\\mathrm{BC}}{\\mathrm{AB}} = \\frac{2}{3}')}</div>
              <div class="math-line">${D('\\cos\\theta = \\frac{\\mathrm{AC}}{\\mathrm{AB}} = \\frac{\\sqrt{5}}{3}')}</div>
              <div class="math-line">${D('\\tan\\theta = \\frac{\\mathrm{BC}}{\\mathrm{AC}} = \\frac{2}{\\sqrt{5}}')}</div>
              <p class="note">${T('\\frac{2}{\\sqrt{5}}')} は有理化して ${T('\\frac{2\\sqrt{5}}{5}')} と答えても正解です．</p>
            </details>
          </div>`
      ]
    },
    similar: {
      title: '大きさによらない',
      slides: [
        () => `
          <div class="tutorial-slide">
            <p>スライダーを動かして，三角形の大きさを変えてみましょう．<span class="highlight">θ はそのまま</span>で，3辺が ${T('k')} 倍になります．</p>
            <div class="figure figure-small" id="sim-figure">${similarFigure(1)}</div>
            <div class="slider-row">
              <span>${T('k =')} <b id="sim-k">1</b></span>
              <input type="range" id="sim-slider" min="1" max="4" step="0.5" value="1">
            </div>
            <div class="visual-box" id="sim-values">${similarValues(1)}</div>
          </div>`,
        () => `
          <div class="tutorial-slide">
            <p>θ が同じ直角三角形は，大きさが違ってもすべて<span class="highlight">相似（similar）</span>です．</p>
            <div class="figure figure-small">${nestedFigure()}</div>
            <p>相似な図形では，対応する辺の<b>比</b>が等しくなります．だから</p>
            <div class="visual-box">
              <div class="math-line">${D('\\frac{3}{5} = \\frac{6}{10} = \\frac{9}{15}')}</div>
            </div>
            <p>となり，${T('\\sin\\theta')} は三角形の大きさによらず同じ値になります．</p>
          </div>`,
        () => `
          <div class="tutorial-slide">
            <p class="highlight-box">三角比は，三角形の<b>大きさ</b>ではなく，<b>角 θ の大きさ</b>だけで決まる値です．</p>
            <p>辺の長さが ${T('6,\\ 8,\\ 10')} の三角形でも，${T('\\sin\\theta = \\frac{6}{10}')} を約分すると ${T('\\frac{3}{5}')} になり，${T('3,\\ 4,\\ 5')} の三角形と同じ値です．</p>
            <p class="note">答えるときは，必ず約分して最も簡単な形にしましょう．</p>
          </div>`
      ],
      mount: (index) => {
        if (index !== 0) return;
        const slider = $('sim-slider');
        slider.addEventListener('input', () => {
          const k = parseFloat(slider.value);
          $('sim-k').textContent = String(k);
          $('sim-figure').innerHTML = similarFigure(k);
          $('sim-values').innerHTML = similarValues(k);
        });
      }
    },
    answer: {
      title: '2辺から求める・答え方',
      slides: [
        () => `
          <div class="tutorial-slide">
            <p><b>三平方の定理（Pythagorean theorem）</b>：直角三角形では，斜辺の2乗は他の2辺の2乗の和に等しい．</p>
            <div class="visual-box"><div class="math-line">${D('\\mathrm{AB}^2 = \\mathrm{AC}^2 + \\mathrm{BC}^2')}</div></div>
            <div class="figure figure-small">${figureHTML({ opp2: 7, adj2: 9, hyp2: 16, hidden: 'hyp', orient: { mode: 'hyp', phi: 180, flip: true } })}</div>
            <details class="reveal">
              <summary>AB を求めてから，答えを見る</summary>
              <div class="math-line">${D('\\mathrm{AB} = \\sqrt{3^2 + (\\sqrt{7})^2} = \\sqrt{16} = 4')}</div>
            </details>
          </div>`,
        () => `
          <div class="tutorial-slide">
            <p>斜辺がわかっているときは，引き算で残りの辺を求めます．</p>
            <div class="figure figure-small">${figureHTML({ opp2: 4, adj2: 9, hyp2: 13, hidden: 'adj', orient: { mode: 'hyp', phi: 0, flip: false } })}</div>
            <details class="reveal">
              <summary>AC を求めてから，答えを見る</summary>
              <div class="math-line">${D('\\mathrm{AC} = \\sqrt{(\\sqrt{13})^2 - 2^2} = \\sqrt{9} = 3')}</div>
              <div class="math-line">${D('\\sin\\theta = \\frac{2}{\\sqrt{13}}')}</div><div class="math-line">${D('\\cos\\theta = \\frac{3}{\\sqrt{13}}')}</div><div class="math-line">${D('\\tan\\theta = \\frac{2}{3}')}</div>
            </details>
          </div>`,
        () => `
          <div class="tutorial-slide">
            <p>答えは<span class="highlight">最も簡単な形</span>で書きます．</p>
            <table class="rule-table">
              <tr><th>ルール</th><th>✕</th><th>○</th></tr>
              <tr><td>約分する</td><td>${D('\\frac{8}{10}')}</td><td>${D('\\frac{4}{5}')}</td></tr>
              <tr><td>√ の中を簡単に</td><td>${D('\\sqrt{8}')}</td><td>${D('2\\sqrt{2}')}</td></tr>
              <tr><td>分母が 1 なら整数に</td><td>${D('\\frac{\\sqrt{3}}{1}')}</td><td>${D('\\sqrt{3}')}</td></tr>
              <tr><td>√ どうしも約分する</td><td>${D('\\frac{\\sqrt{6}}{\\sqrt{10}}')}</td><td>${D('\\frac{\\sqrt{3}}{\\sqrt{5}}')}</td></tr>
              <tr><td>有理化は自由</td><td>―</td><td>${D('\\frac{2}{\\sqrt{5}}')} も ${D('\\frac{2\\sqrt{5}}{5}')} も○<br>${D('\\frac{\\sqrt{3}}{\\sqrt{5}}')} も○．ただし分母・分子がともに √ なら，有理化した ${D('\\frac{\\sqrt{15}}{5}')} がおすすめ</td></tr>
            </table>
          </div>`,
        () => `
          <div class="tutorial-slide">
            <p><b>入力のしかた</b></p>
            <ul class="term-list">
              <li><span class="toggle-btn demo">分数</span>：分母の欄が出ます．</li>
              <li><span class="toggle-btn demo">√</span>：√ の中の数を入れる欄が出ます．${T('\\sqrt{21}')} はそのまま 21 だけ入れます．${T('2\\sqrt{3}')} のように √ の前に数があるときだけ，前の点線の枠に入れます．</li>
              <li><span class="toggle-btn demo">分母に√</span>：分数のとき，分母に √ を付けます．</li>
            </ul>
            <div class="visual-box">
              <p>例：${T('\\frac{2}{\\sqrt{5}}')} を入れるとき</p>
              <p>「分数」→ 分子に 2 → 「分母に√」→ √ の中に 5</p>
            </div>
            <p class="note">Enter キーでも判定できます．</p>
          </div>`
      ]
    },
    relation: {
      title: '三角比の相互関係',
      slides: [
        () => `
          <div class="tutorial-slide">
            <p><b>3つの公式</b></p>
            <div class="figure figure-small">${figureHTML({ opp2: 9, adj2: 16, hyp2: 25, orient: STD }, { sideTex: { hyp: 'c', opp: 'a', adj: 'b' } })}</div>
            <p class="note">${T('\\sin\\theta = \\frac{a}{c}')}，${T('\\cos\\theta = \\frac{b}{c}')}，${T('\\tan\\theta = \\frac{a}{b}')}，三平方の定理 ${T('a^2 + b^2 = c^2')} から：</p>
            <div class="math-line">${D('\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}')}</div>
            <div class="math-line">${D('\\sin^2\\theta + \\cos^2\\theta = 1')}</div>
            <div class="math-line">${D('1 + \\tan^2\\theta = \\frac{1}{\\cos^2\\theta}')}</div>
            <ul class="term-list">
              <li>1つ目：${T('\\frac{a}{c} \\div \\frac{b}{c} = \\frac{a}{b}')}</li>
              <li>2つ目：${T('a^2 + b^2 = c^2')} の両辺を ${T('c^2')} で割る</li>
              <li>3つ目：${T('a^2 + b^2 = c^2')} の両辺を ${T('b^2')} で割る</li>
            </ul>
            <p class="note">${T('\\sin^2\\theta')}（sine squared theta）：${T('(\\sin\\theta)^2')} のこと．読み方は「サイン2乗シータ」．${T('\\sin\\theta^2')} とは書きません．</p>
          </div>`,
        () => {
          const p = RL.build('sin', 4, 9, false);
          return `
          <div class="tutorial-slide">
            <p><b>sin（または cos）がわかるとき</b>　例：${T('\\sin\\theta = \\frac{2}{3}')}</p>
            ${RL.relationLines(p).map(l => `<p class="note">${richText(l.text)}</p><div class="math-line">${D(l.tex)}</div>`).join('')}
            <p class="note">θ が鋭角のとき，sin・cos・tan は辺の長さの比なので，どれも正の数です．だから ${T('\\cos^2\\theta = \\frac{5}{9}')} から ${T('\\cos\\theta')} は正の方だけをとります．</p>
          </div>`;
        },
        () => {
          const p = RL.build('tan', 4, 1, false);
          return `
          <div class="tutorial-slide">
            <p><b>tan がわかるとき</b>　例：${T('\\tan\\theta = 2')}</p>
            ${RL.relationLines(p).map(l => `<p class="note">${richText(l.text)}</p><div class="math-line">${D(l.tex)}</div>`).join('')}
            <p class="note">先に ${T('1 + \\tan^2\\theta = \\frac{1}{\\cos^2\\theta}')} で cos を求め，sin は ${T('\\tan\\theta \\times \\cos\\theta')} で求めます．</p>
          </div>`;
        },
        () => {
          const p = RL.build('sin', 4, 9, false);
          const tl = RL.triangleLines(p);
          return `
          <div class="tutorial-slide">
            <p><b>別解：直角三角形で考える</b></p>
            <p class="note">${richText(tl.intro)}</p>
            <div class="figure figure-small">${figureHTML(p)}</div>
            <p class="note">三平方の定理から</p>
            <div class="math-line">${D(tl.py)}</div>
            <p class="note">あとは定義から ${T('\\cos\\theta = \\frac{\\sqrt{5}}{3}')}，${T('\\tan\\theta = \\frac{2}{\\sqrt{5}}')}．問題で迷ったら「📐 直角三角形で考える」で図を出せます．</p>
          </div>`;
        }
      ]
    },
    apply: {
      title: '三角比の活用',
      slides: [
        () => `
          <div class="tutorial-slide">
            <p><b>見上げる角・見下ろす角</b></p>
            <ul class="term-list">
              <li><b>仰角（angle of elevation）</b>：見上げたときの，視線と水平面のなす角．</li>
              <li><b>俯角（angle of depression）</b>：見下ろしたときの，視線と水平面のなす角．</li>
            </ul>
            <div class="figure figure-small">${sceneFigureHTML(AP.depressionScene(32, { theta: '32^\\circ', opp: '20\\,\\mathrm{m}', adj: '?' }))}</div>
            <p class="note">A から B を見下ろす角が ${T('32^\\circ')} のとき，三角形の中の角 ${T('\\angle\\mathrm{BAC}')} は ${T('90^\\circ - 32^\\circ = 58^\\circ')} です．どの角が直角三角形の角なのかを図で確かめましょう．</p>
          </div>`,
        () => `
          <div class="tutorial-slide">
            <p><b>どの三角比を使う？</b></p>
            <ul class="term-list">
              <li><b>正弦（sine）</b>：${D('\\sin\\theta = \\frac{\\text{向かい}}{\\text{斜辺}}')}</li>
              <li><b>余弦（cosine）</b>：${D('\\cos\\theta = \\frac{\\text{となり}}{\\text{斜辺}}')}</li>
              <li><b>正接（tangent）</b>：${D('\\tan\\theta = \\frac{\\text{向かい}}{\\text{となり}}')}</li>
            </ul>
            <div class="figure figure-small">${sceneFigureHTML(AP.riseScene(30, { theta: '\\theta', hyp: '\\text{斜辺}', opp: '\\text{向かい}', adj: '\\text{となり}' }))}</div>
            <p class="note">両辺に分母をかけると，長さを求める式になります．</p>
            <div class="math-line">${D('\\text{向かい} = \\text{斜辺} \\times \\sin\\theta')}</div>
            <div class="math-line">${D('\\text{となり} = \\text{斜辺} \\times \\cos\\theta')}</div>
            <div class="math-line">${D('\\text{向かい} = \\text{となり} \\times \\tan\\theta')}</div>
            <p class="note">「向かい」は θ の向かい側の辺，「となり」は θ をはさむ辺のうち斜辺でない方です．高さか水平かではなく，<b>θ との位置</b>で見分けます．見下ろす問題では，三角形の中の角 ${T('\\angle\\mathrm{BAC}')} の向かいが水平の辺 BC になります．</p>
          </div>`,
        () => {
          const rows = [12, 13, 14, 15].map(t => `<tr${t === 13 ? ' class="hl"' : ''}><td>${t}°</td><td>${AP.t4(AP.TABLE.sin[t])}</td><td>${AP.t4(AP.TABLE.cos[t])}</td><td>${AP.t4(AP.TABLE.tan[t])}</td></tr>`).join('');
          return `
          <div class="tutorial-slide">
            <p><b>三角比の表の引き方</b></p>
            <table class="rule-table mini-table">
              <tr><th>θ</th><th>sin</th><th>cos</th><th>tan</th></tr>
              ${rows}
            </table>
            <ul class="term-list">
              <li><b>長さを求める</b>：角の行で，使う三角比の列を読む．例 ${T('\\tan 13^\\circ = 0.2309')}</li>
              <li><b>角度を求める</b>：使う三角比の列で，比の値に最も近い値を探す．例 ${T('\\tan\\theta = 0.23')} なら ${T('0.2309')} と ${T('0.2493')} では ${T('0.2309')} が近いので 約 13°</li>
              <li><b>「〜以下」</b>：基準を超えない最大の角．例 ${T('\\tan\\theta \\leqq 0.0666\\cdots')} なら ${T('\\tan 3^\\circ = 0.0524')}，${T('\\tan 4^\\circ = 0.0699')} より 3° 以下</li>
            </ul>
          </div>`;
        },
        () => `
          <div class="tutorial-slide">
            <p><b>答え方</b></p>
            <ul class="term-list">
              <li>四捨五入する位を問題文で確かめます．「小数第2位を四捨五入」なら小数第1位まで，「1 m 未満を四捨五入」なら整数で答えます．</li>
              <li>表の値は4桁の近似値なので，計算の途中で丸めると答えが少しずれます．<b>最後の桁が ±1 ずれても正解</b>です（例：5.4 m なら 5.3〜5.5 は○）．</li>
              <li>角度は整数で答えます．「約」は入力しなくてかまいません．</li>
              <li>図が描けないときは「📐 図を見る」で図を出せます．まずは自分で図を描いてみましょう．</li>
            </ul>
          </div>`
      ]
    }
  };

  let activeTutorial = null;
  let currentSlideIndex = 0;

  document.querySelectorAll('.tutorial-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTutorial = tutorials[btn.dataset.tutorial];
      currentSlideIndex = 0;
      show(tutorialScreen, '解説', '◀ 閉じる');
      updateTutorialSlide();
    });
  });

  function updateTutorialSlide() {
    tutorialTitle.textContent = activeTutorial.title;
    tutorialContent.innerHTML = activeTutorial.slides[currentSlideIndex]();
    slideIndicator.textContent = `${currentSlideIndex + 1} / ${activeTutorial.slides.length}`;
    tutorialPrevBtn.disabled = currentSlideIndex === 0;
    tutorialNextBtn.textContent = currentSlideIndex === activeTutorial.slides.length - 1 ? '完了' : '次へ ▶';
    if (activeTutorial.mount) activeTutorial.mount(currentSlideIndex);
  }

  tutorialPrevBtn.addEventListener('click', () => {
    if (currentSlideIndex > 0) { currentSlideIndex--; updateTutorialSlide(); }
  });
  tutorialNextBtn.addEventListener('click', () => {
    if (currentSlideIndex < activeTutorial.slides.length - 1) { currentSlideIndex++; updateTutorialSlide(); }
    else show(tutorialSelectScreen, 'やり方を学ぶ');
  });

  // --- Category / Mode / Intro ---
  const CAT = {
    three: { name: '① 3辺がわかる三角形', label: '🔰 3辺', desc: '3辺の長さがわかっている直角三角形で，sin θ，cos θ，tan θ の値を求めます．三角形の向きは毎回変わります．' },
    two: { name: '② 2辺から求める', label: '📏 2辺から', desc: '「?」の辺の長さを三平方の定理で求めて入力し，それから sin θ，cos θ，tan θ の値を求めます．' },
    mix: { name: '③ ミックス', label: '🔀 ミックス', desc: '①と②がランダムに出題されます．' },
    relation: { name: '⑦ 相互関係', label: '🔗 相互関係' },
    applyLen: { name: '④ 長さを求める', label: '📐 活用：長さ' },
    applyAng: { name: '⑤ 角度を求める', label: '🧭 活用：角度' },
    applyMix: { name: '⑥ 活用ミックス', label: '🎯 活用ミックス' }
  };
  const MODE = {
    practice: { name: '練習モード', desc: '時間制限はありません．間違えたら「解説を見る」で確認できます．連続正解記録を伸ばしましょう．' },
    timeAttack: { name: 'タイムアタック', desc: `${TA_GOAL}問正解するまでのタイムを測ります．間違えるとペナルティ（+5秒）が加算されます．` },
    survival: { name: 'サバイバル', desc: 'ライフは3つ．判定で1つでも間違えるとライフが減り，0になるとゲームオーバーです．' },
    scoreAttack: { name: 'スコアアタック', desc: '制限時間は90秒．正解すると残り時間が10秒増え，連続正解でコンボボーナスが入ります．' }
  };

  // 三角形の向き：毎回変える／いつも同じ（θ 左下・直角 右下）．端末に覚えておく
  let fixedOrient = false;
  try { fixedOrient = localStorage.getItem('trian.fixedOrient') === '1'; } catch (e) { /* 使えなくても動く */ }
  function refreshOrientToggle() {
    document.querySelectorAll('#orient-toggle .seg-btn').forEach(b => b.classList.toggle('active', (b.dataset.fixed === '1') === fixedOrient));
  }
  document.querySelectorAll('#orient-toggle .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      fixedOrient = btn.dataset.fixed === '1';
      try { localStorage.setItem('trian.fixedOrient', fixedOrient ? '1' : '0'); } catch (e) { /* 無視 */ }
      refreshOrientToggle();
    });
  });

  // モードを選ぶ → 問題（カテゴリ）を選ぶとすぐ開始．ルールは表示だけ
  function showIntro() {
    resetGameTimers();
    $('intro-mode-name').textContent = MODE[currentGameMode].name;
    $('intro-mode-desc').textContent = MODE[currentGameMode].desc;
    refreshOrientToggle();
    show(introScreen, MODE[currentGameMode].name);
  }

  document.querySelectorAll('.game-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentGameMode = btn.dataset.mode;
      showIntro();
    });
  });
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.category;
      show(problemArea, 'トレーニング中', '◀ やめる');
      initGameSession();
    });
  });

  // --- Game session ---
  function initGameSession() {
    resetGameTimers();
    gameView.classList.remove('hidden');
    resultView.classList.add('hidden');
    if (currentGameMode === 'practice') {
      practiceStreak = 0;
    } else if (currentGameMode === 'timeAttack') {
      taQuestionsDone = 0;
      taStartTime = Date.now();
      taTimerInterval = setInterval(updateStatsUI, 100);
    } else if (currentGameMode === 'survival') {
      svHp = 3;
      practiceStreak = 0;
    } else if (currentGameMode === 'scoreAttack') {
      saScore = 0; saTimeLeft = 90; saCombo = 0; saMaxCombo = 0;
      saTimerInterval = setInterval(() => {
        if (isGameOver) return;
        saTimeLeft--;
        updateStatsUI();
        if (saTimeLeft <= 0) endGame('scoreAttack');
      }, 1000);
    }
    updateStatsUI();
    generateProblem();
  }

  function resetGameTimers() {
    if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
    lastWrongKey = null;
    if (taTimerInterval) clearInterval(taTimerInterval);
    if (saTimerInterval) clearInterval(saTimerInterval);
    taTimerInterval = saTimerInterval = null;
    isGameOver = false;
    isLocked = false;
    judgeBtn.disabled = false;
  }

  function updateStatsUI() {
    statsLeft.textContent = CAT[currentCategory].label;
    const em = (v, c) => `<span style="color:var(${c}); font-weight:800;">${v}</span>`;
    if (currentGameMode === 'practice') {
      statsRight.innerHTML = `連続正解: ${em(practiceStreak, '--theme-primary')}`;
    } else if (currentGameMode === 'timeAttack') {
      const elapsed = ((Date.now() - taStartTime) / 1000).toFixed(1);
      statsRight.innerHTML = `${taQuestionsDone}/${TA_GOAL}問 | ${em(elapsed + 's', '--apple-red')}`;
    } else if (currentGameMode === 'survival') {
      statsRight.innerHTML = `${'❤️'.repeat(svHp)}${'🤍'.repeat(3 - svHp)} | 正解: ${em(practiceStreak, '--theme-primary')}`;
    } else {
      statsRight.innerHTML = `残り ${em(saTimeLeft + 's', '--apple-red')} | Score: ${em(saScore, '--theme-primary')}`;
    }
  }

  function generateProblem() {
    isLocked = false;
    lastWrongKey = null;
    judgeBtn.disabled = false;
    let prob;
    if (isApply(currentCategory)) {
      // 三角比の活用：文章だけ出し，図はボタンで
      do { prob = AP.generateApply(currentCategory); }
      while (currentProblem && currentProblem.text === prob.text);
      currentProblem = prob;
      problemPrompt.innerHTML = richText(prob.text);
      problemPrompt.classList.add('prompt-long');
      figure.innerHTML = sceneFigureHTML(prob.scene);
      figure.classList.add('hidden');
      showFigureBtn.textContent = '📐 図を見る';
      showFigureBtn.classList.remove('hidden');
      answerList.innerHTML = numRowHTML(prob.answer);
    } else if (currentCategory === 'relation') {
      // 三角比の相互関係：1つの値から残りの2つ．直角三角形はヒントとしてボタンで出す
      do { prob = RL.generateRelation(); }
      while (currentProblem && currentProblem.kind === 'relation' && currentProblem.given === prob.given && currentProblem.givenTex === prob.givenTex);
      currentProblem = prob;
      problemPrompt.classList.remove('prompt-long');
      const [k1, k2] = prob.asks;
      problemPrompt.innerHTML = `θ は鋭角とする．${D('\\' + prob.given + '\\theta = ' + prob.givenTex)} のとき，${T('\\' + k1 + '\\theta')} と ${T('\\' + k2 + '\\theta')} の値を求めなさい．`;
      figure.innerHTML = figureHTML(prob);
      figure.classList.add('hidden');
      showFigureBtn.textContent = '📐 直角三角形で考える';
      showFigureBtn.classList.remove('hidden');
      answerList.innerHTML = prob.asks.map(k => ratioRowHTML(RATIO_ROWS.find(r => r.key === k))).join('');
    } else {
      // 直前と同じ三角形が続かないように
      do { prob = C.generateProblem(currentCategory, Math.random, { fixed: fixedOrient }); }
      while (currentProblem && prob.opp2 === currentProblem.opp2 && prob.adj2 === currentProblem.adj2);
      currentProblem = prob;
      problemPrompt.classList.remove('prompt-long');
      if (prob.hidden) {
        problemPrompt.innerHTML = `「?」の辺 ${C.SIDE_NAME[prob.hidden]} の長さを求めてから，${T('\\sin\\theta')}，${T('\\cos\\theta')}，${T('\\tan\\theta')} の値を求めなさい．`;
      } else {
        problemPrompt.innerHTML = `次の直角三角形で，${T('\\sin\\theta')}，${T('\\cos\\theta')}，${T('\\tan\\theta')} の値を求めなさい．`;
      }
      figure.innerHTML = figureHTML(prob);
      figure.classList.remove('hidden');
      showFigureBtn.classList.add('hidden');
      let html = '';
      if (prob.hidden) html += sideRowHTML(prob.hidden);
      html += RATIO_ROWS.map(ratioRowHTML).join('');
      answerList.innerHTML = html;
    }

    explainBox.classList.add('hidden');
    explainBox.innerHTML = '';
    showExplainBtn.classList.add('hidden');
    nextBtn.classList.add('hidden');
    judgeBtn.classList.remove('hidden');
  }

  showFigureBtn.addEventListener('click', () => {
    figure.classList.remove('hidden');
    showFigureBtn.classList.add('hidden');
  });

  // --- Judge ---
  function judge() {
    if (isGameOver || isLocked || !currentProblem) return;
    const rows = Array.from(answerList.querySelectorAll('.ans-row'));
    const tg = currentProblem.kind === 'apply' ? null : C.targets(currentProblem);
    const results = rows.map(row => {
      if (row.dataset.kind === 'num') {
        return AP.judgeApply(currentProblem, row.querySelector('.val-input').value);
      }
      if (row.dataset.kind === 'side') {
        return C.judgeSide({ k: readInt(row, 'k'), m: readInt(row, 'm'), root: row.dataset.root === '1' }, currentProblem[row.dataset.key + '2']);
      }
      return C.judgeRatio({
        a: readInt(row, 'a'), b: readInt(row, 'b'), c: readInt(row, 'c'), d: readInt(row, 'd'),
        numRoot: row.dataset.numRoot === '1', frac: row.dataset.frac === '1', denRoot: row.dataset.denRoot === '1'
      }, tg[row.dataset.key]);
    });

    // 未入力・入力ミスはペナルティなしで知らせる
    const blocking = results.findIndex(r => r.status === 'empty' || r.status === 'invalid');
    if (blocking >= 0) {
      const el = Array.from(rows[blocking].querySelectorAll('.val-input')).find(x => x.offsetParent !== null && x.value.trim() === '') || rows[blocking].querySelector('.val-input');
      showFeedback(results[blocking].hint, 'info');
      if (el) el.focus();
      return;
    }

    let firstHint = '', wrongHint = '';
    results.forEach((r, i) => {
      const row = rows[i];
      clearMark(row);
      if (r.status === 'correct') { row.classList.add('is-correct'); row.querySelector('.ans-mark').textContent = '○'; }
      else if (r.status === 'form') { row.classList.add('is-form'); row.querySelector('.ans-mark').textContent = '△'; if (!firstHint) firstHint = r.hint; }
      else { row.classList.add('is-wrong'); row.querySelector('.ans-mark').textContent = '✕'; if (!wrongHint && r.hint) wrongHint = r.hint; }
    });

    if (results.every(r => r.status === 'correct')) {
      const note = (results.find(r => r.note) || {}).note;
      handleSuccess(note);
      return;
    }
    const key = rows.map(r => JSON.stringify(r.dataset) + Array.from(r.querySelectorAll('.val-input')).map(x => x.value).join(',')).join('|');
    if (key === lastWrongKey) { showFeedback('✕ や △ の欄を直してから判定しましょう．', 'info'); return; }
    lastWrongKey = key;
    handleFailure(firstHint, wrongHint);
  }

  judgeBtn.addEventListener('click', judge);

  function handleSuccess(note) {
    if (isGameOver) return;
    isLocked = true;
    judgeBtn.disabled = true;
    let msg = '正解！素晴らしい！';
    if (currentGameMode === 'practice' || currentGameMode === 'survival') {
      practiceStreak++;
    } else if (currentGameMode === 'timeAttack') {
      taQuestionsDone++;
      if (taQuestionsDone >= TA_GOAL) { updateStatsUI(); burst(); endGame('timeAttack'); return; }
    } else if (currentGameMode === 'scoreAttack') {
      saCombo++;
      saMaxCombo = Math.max(saMaxCombo, saCombo);
      const points = 100 + saCombo * 50;
      saScore += points;
      saTimeLeft = Math.min(180, saTimeLeft + 10);
      msg = `正解！ ${saCombo}コンボ（+${points}点，残り時間+10秒）`;
    }
    updateStatsUI();
    // 有理化のすすめなど，正解でも伝えたいことがあれば添えて，読めるよう少し長く待つ
    showFeedback(note ? msg + ' ' + note : msg, 'success', note ? 4000 : 3000);
    burst();
    nextTimer = setTimeout(() => { nextTimer = null; if (!isGameOver) generateProblem(); }, note ? 3200 : 1300);
  }

  function handleFailure(hint, wrongHint) {
    if (isGameOver) return;
    let msg = hint ? `惜しい！ ${hint}` : wrongHint ? `✕ ${wrongHint}` : '✕ の欄を見直しましょう．';
    if (currentGameMode === 'practice') {
      practiceStreak = 0;
      showExplainBtn.classList.remove('hidden');
    } else if (currentGameMode === 'timeAttack') {
      taStartTime -= 5000;
      msg += '（ペナルティ +5秒）';
    } else if (currentGameMode === 'survival') {
      svHp--;
      if (svHp <= 0) { updateStatsUI(); endGame('survival'); return; }
      msg += `（残りライフ: ${svHp}）`;
    } else if (currentGameMode === 'scoreAttack') {
      saCombo = 0;
      saScore = Math.max(0, saScore - 50);
      msg += '（-50点，コンボリセット）';
    }
    updateStatsUI();
    showFeedback(msg, 'error');
  }

  showExplainBtn.addEventListener('click', () => {
    const prob = currentProblem;
    let html = '<div class="explain-title">💡 解説</div>';
    if (prob.kind === 'relation') {
      RL.relationLines(prob).forEach(l => { html += `<p class="note">${richText(l.text)}</p><div class="math-line">${D(l.tex)}</div>`; });
      const tl = RL.triangleLines(prob);
      html += `<p class="note"><b>別解</b>　${richText(tl.intro)}三平方の定理から</p><div class="math-line">${D(tl.py)}</div>`;
      html += '<p class="note">この三角形で，定義から残りの2つを求めることもできます．有理化してもしなくても正解です．</p>';
      figure.innerHTML = figureHTML(prob, { sideTex: { hyp: C.sqrtTex(prob.hyp2), opp: C.sqrtTex(prob.opp2), adj: C.sqrtTex(prob.adj2) } });
      figure.classList.remove('hidden');
      showFigureBtn.classList.add('hidden');
      explainBox.innerHTML = html;
      explainBox.classList.remove('hidden');
      showExplainBtn.classList.add('hidden');
      nextBtn.classList.remove('hidden');
      return;
    }
    if (prob.kind === 'apply') {
      figure.classList.remove('hidden');
      showFigureBtn.classList.add('hidden');
      html += '<p class="note">図において</p>';
      prob.lines.forEach(l => { html += `<div class="math-line">${D(l)}</div>`; });
      if (prob.conclusion) html += `<p class="note">${prob.conclusion}</p>`;
      html += `<p class="note answer-note">答え：${AP.answerText(prob)}</p>`;
      if (prob.note) html += `<p class="note">${prob.note}</p>`;
      if (prob.answer.kind === 'length') html += '<p class="note">表の値は近似値なので，最後の桁が ±1 ずれても正解です．</p>';
      explainBox.innerHTML = html;
      explainBox.classList.remove('hidden');
      showExplainBtn.classList.add('hidden');
      nextBtn.classList.remove('hidden');
      return;
    }
    const py = C.pythagorasTex(prob);
    if (py) html += `<div class="math-line">${D(py)}</div>`;
    C.ratioLines(prob).forEach(l => { html += `<div class="math-line">${D(l.tex)}</div>`; });
    html += '<p class="note">有理化してもしなくても正解です．</p>';
    explainBox.innerHTML = html;
    explainBox.classList.remove('hidden');
    showExplainBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
  });

  nextBtn.addEventListener('click', generateProblem);

  function burst() {
    if (typeof confetti === 'function') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#0d9488', '#14b8a6', '#f59e0b', '#ea580c'] });
    }
  }

  function endGame(mode) {
    const elapsed = ((Date.now() - taStartTime) / 1000).toFixed(1);
    resetGameTimers();
    isGameOver = true;
    judgeBtn.disabled = true;
    let title = 'ゲーム終了！', detail = '';
    if (mode === 'timeAttack') { title = '🏆 タイムアタック クリア！'; detail = `${TA_GOAL}問クリアタイム：${elapsed} 秒`; }
    else if (mode === 'survival') { title = '💀 ゲームオーバー'; detail = `記録：${practiceStreak} 問正解`; }
    else if (mode === 'scoreAttack') { title = '⏰ タイムアップ！'; detail = `最終スコア：${saScore} 点（最大コンボ：${saMaxCombo}）`; }
    gameView.classList.add('hidden');
    resultView.classList.remove('hidden');
    resultView.innerHTML = `
      <div class="result-title">${title}</div>
      <div class="result-subtitle">${detail}</div>
      <button class="primary-btn" id="retry-btn">もう一度挑戦</button>
      <button class="secondary-btn" id="to-menu-btn">問題を選び直す</button>`;
    $('retry-btn').addEventListener('click', initGameSession);
    $('to-menu-btn').addEventListener('click', showIntro);
  }

  let toastTimer = null;
  function showFeedback(text, type, ms) {
    feedbackToast.textContent = text;
    feedbackToast.className = `feedback show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => feedbackToast.classList.remove('show'), ms || 3000);
  }
});
