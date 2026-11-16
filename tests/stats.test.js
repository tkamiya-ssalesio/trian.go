// node tests/stats.test.js で実行する．失敗があれば exit 1．
const S = require('../stats.js');

let fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; if (fails <= 30) console.error('NG:', msg); } }
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)}（期待 ${JSON.stringify(b)}）`);

// 結果の列（'ccwf' など）を順に足す
function run(data, topic, seq, hints) {
  let last = null;
  for (const ch of seq) { last = S.log(data, topic, ch, hints); data = last.data; }
  return { data, last };
}
const ORDER = ['three', 'two', 'famous', 'eq'];

// 1. 5問そろうまでは判定しない
let r = run({}, 'three', 'wwww');
ok(!r.last.view.judged && !r.last.view.weak && !r.last.becameWeak, '4問では判定しない');
r = run(r.data, 'three', 'w');
ok(r.last.view.judged && r.last.becameWeak && r.last.view.weak, '5問目で苦手になる');
eq(r.data.three.n, 5, '回数');

// 2. 苦手の境目：5問中3問正解（60%）は苦手，4問正解（80%）は苦手でない
ok(run({}, 'two', 'cccww').last.view.weak, '3/5 は苦手');
ok(!run({}, 'two', 'ccccw').last.view.weak, '4/5 は苦手でない');
// 7/10 は 0.7 未満でないので苦手にしない
ok(!run({}, 'two', 'cccccccwww').last.view.weak, '7/10 は苦手でない');
ok(run({}, 'two', 'ccccccwwww').last.view.weak, '6/10 は苦手');
// △（形のミス）も最初の判定での正解には数えない
ok(run({}, 'two', 'ccfff').last.view.weak, '△ は正解に数えない');

// 3. 克服：苦手になったあと，直近10問で8問以上．途中の 70% 台では消えない
r = run({}, 'famous', 'wwwcc');           // 2/5 苦手
ok(r.last.view.weak, '苦手になる');
r = run(r.data, 'famous', 'ccc');         // 5/8 = 0.625
ok(r.last.view.weak && !r.last.overcame, '5/8 はまだ苦手');
r = run(r.data, 'famous', 'cc');          // 7/10
ok(r.last.view.weak && !r.last.overcame, '7/10 はまだ苦手（付いたり消えたりしない）');
r = run(r.data, 'famous', 'c');           // 直近10問 wwcc cccccc → 8/10
ok(r.last.overcame && !r.last.view.weak, '8/10 で克服');
eq(r.last.view.hints, [], '克服したら案内を消す');
r = run(r.data, 'famous', 'c');
ok(!r.last.overcame && !r.last.becameWeak, '克服は1回だけ知らせる');
eq(r.data.famous.n, 12, '回数は全部数える');
eq(r.data.famous.recent.length, S.WINDOW, '直近は10問まで');

// 4. 直近だけで見る：昔のミスは流れる
r = run({}, 'eq', 'wwwww' + 'cccccccccc');
ok(!r.last.view.weak && r.last.view.rate === 1, '10問続けて正解すれば苦手でない');
// 昔は良くても，最近まちがえていれば苦手
r = run({}, 'eq', 'cccccccccc' + 'wwww');
ok(r.last.view.weak && r.last.view.ok === 6, '最近のミスで苦手になる');

// 5. 案内：新しい順に3つ，同じものは重ねない，正解では足さない
r = run({}, 'three', 'w', ['A']);
r = run(r.data, 'three', 'f', ['B']);
r = run(r.data, 'three', 'w', ['A']);
eq(r.data.three.hints, ['A', 'B'], '同じ案内は先頭に寄せる');
r = run(r.data, 'three', 'w', ['C', 'D']);
eq(r.data.three.hints, ['C', 'D', 'A'], '3つまで');
r = run(r.data, 'three', 'c', ['X']);
eq(r.data.three.hints, ['C', 'D', 'A'], '正解のときは足さない');
r = run(r.data, 'three', 'w', ['', null, 5]);
eq(r.data.three.hints, ['C', 'D', 'A'], '空や文字でないものは足さない');

// 6. ミスの傾向
ok(run({}, 'two', 'ccfff').last.view.mostlyForm, '形のミスが多い');
ok(!run({}, 'two', 'ccwwf').last.view.mostlyForm, '間違いが多い');
ok(run({}, 'two', 'ccwf').last.view.mostlyForm, '半々は形のミスに寄せる');
ok(!run({}, 'two', 'ccccc').last.view.mostlyForm, 'ミスがなければ false');

// 7. 元の data は書き換えない／記録しないもの
const d0 = {};
S.log(d0, 'three', 'w');
eq(d0, {}, '元の data は書き換えない');
for (const [t, o] of [['three', 'x'], ['three', ''], ['a|b', 'c'], ['', 'c'], [null, 'c'], ['__proto__', 'c']]) {
  const x = S.log(d0, t, o);
  ok(!x.logged && x.data === d0, `記録しない：${t} ${o}`);
}

// 8. まとめと苦手の順
let d = {};
d = run(d, 'eq', 'wwwwc').data;      // 1/5
d = run(d, 'three', 'cccww').data;   // 3/5
d = run(d, 'famous', 'ccccc').data;  // 5/5
d = run(d, 'zzz', 'wwwww').data;     // order にない種類は出さない
eq(S.summary(d, ORDER).map(v => v.topic), ['three', 'famous', 'eq'], 'まとめは order の順');
eq(S.weakTopics(d, ORDER).map(v => v.topic), ['eq', 'three'], '苦手は正解率の低い順');
eq(S.weakTopics({}, ORDER), [], '何もないとき');

// 9. 苦手から選ぶ：正解率が低いほど出やすい，直前の種類は続けない
const weak = S.weakTopics(d, ORDER);
let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cnt = { eq: 0, three: 0 };
for (let i = 0; i < 6000; i++) cnt[S.pick(weak, rng)]++;
ok(cnt.eq > cnt.three * 1.3 && cnt.three > 1500, `低いほうが出やすい ${JSON.stringify(cnt)}`);
for (let i = 0; i < 200; i++) ok(S.pick(weak, rng, 'eq') === 'three', '直前の種類は続けない');
eq(S.pick([weak[0]], rng, 'eq'), 'eq', '1つしかなければそれを出す');
eq(S.pick([], rng), null, '苦手がなければ null');
eq(S.pick(weak, () => 0.999999999), 'three', '乱数の端でも落ちない');
eq(S.pick(weak, () => 0), 'eq', '乱数の端 0');

// 10. 保存と読み込み
function memStorage(init) {
  const m = Object.assign({}, init);
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
}
const st = memStorage();
eq(S.load(st), {}, '何もないとき');
ok(S.save(st, d), '保存できる');
eq(S.load(st), d, '保存して読むと同じ');
ok(S.clear(st), '消せる');
eq(S.load(st), {}, '消したあと');
for (const raw of ['', '{', 'null', '[]', '1', '{"three":null}', '{"three":{"recent":"abc"}}', '{"three":{"recent":""}}', '{"a|b":{"recent":"cc"}}', '{"three":{"recent":5}}']) {
  eq(S.load(memStorage({ [S.STORAGE_KEY]: raw })), {}, '壊れた中身 ' + raw);
}
eq(S.load(memStorage({ [S.STORAGE_KEY]: '{"three":{"recent":"cwcwcwcwcwcwcw","n":2,"weak":"yes","hints":["a",1,"","b","c","d"]},"bad":1}' })),
  { three: { n: 10, recent: 'cwcwcwcwcw', weak: false, hints: ['a', 'b', 'c'] } }, '読めるところだけ整えて残す');
const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
eq(S.load(broken), {}, '読めない storage');
ok(S.save(broken, d) === false && S.clear(broken) === false, '書けない storage は false');

console.log(`checked ${checks} stats cases; ${fails} failures`);
process.exit(fails ? 1 : 0);
