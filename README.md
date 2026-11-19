# trian.go

> **English description follows Japanese.**

数学Ⅰ「図形と計量」の三角比（sin・cos・tan）を，直角三角形を見て素早く正確に求められるようにするための，ゲーム感覚で学べる Web トレーニングアプリケーションです．名前は triangle をカタカナで読んだ「トライアング」から，生徒が付けてくれました．

## 🎯 アプリの目的
三角比の導入でつまずくのは，「どの辺が分母で，どの辺が分子か」を三角形の向きが変わっても見抜けるかどうかです．本アプリは，向きが毎回変わる直角三角形で定義を何度も使い，さらに三角比が三角形の大きさによらず角 θ だけで決まることを体感できるように作りました．

## ✨ 主な機能と学習カテゴリ

### 📚 学習カテゴリ
ゲームモードを選んだあと，問題の種類を選ぶとすぐ始まります．三角形の向きは「毎回変わる」と「いつも同じ（θ が左下，直角が右下）」から選べます（じっくり定義を覚えたいとき用．端末が覚えておきます）．

1. **🔰 ① 3辺がわかる三角形**
   3辺の長さ（整数や √ を含む値）から sin θ，cos θ，tan θ を求めます．
2. **📏 ② 2辺から求める**
   三平方の定理で「?」の辺の長さを求めて入力し，それから三角比を求めます．
3. **🔀 ③ ミックス**
   ①と②がランダムに出題されます．

7. **🔗 ⑦ 三角比の相互関係**
   θ は鋭角として，sin・cos・tan のうち1つの値から残りの2つを求めます．与える三角比は sin・cos・tan が同じ割合です．「📐 直角三角形で考える」で別解の図を出せます．解説は公式（sin²θ + cos²θ = 1 など）を使う流れと，直角三角形の別解の両方です．
8. **🔺 ⑧ 30°・45°・60° の三角比**
   sin 60° などの値を答える問題と，sin θ = 1/2（θ は鋭角）から θ を答える問題が半々で出ます．1/√2 と √2/2 のように有理化した形でも与えます．「📐 三角定規を見る」で辺の比の図を出せます．
9. **🔄 ⑨ 45° 以下の角で表す**
   sin 64° = cos 26°，tan 83° = 1/tan 7° のように書きかえます．sin・cos・tan・1/tan のボタンを選び，角度を入れます．そのまま書いたとき，sin を cos に変え忘れたとき，tan のままにしたときは案内を出します．
10. **🧮 ⑩ 式の値**
   sin²40° + sin²50°，tan 35° tan 55° − tan 15° tan 75°，(sin 70° + sin 20°)² − 2 tan 70° cos²70°，cos²20° + cos²35° + cos²45° + cos²55° + cos²70° の4つの型で，角度を変えて出します．答えは整数か分数（0 や 5/2 もある）．
11. **🌙 ⑪ 0°〜180° の三角比**（三角比の拡張）
   sin 150°，cos 120°，tan 135° などの値．0°・90°・180° も出ます（tan 90° は出しません）．解説は単位円の上の点 P の座標と，180° − θ の三角比の2通り．
12. **🔄 ⑫ 鈍角を 45° 以下の角で表す**
   sin 156° = sin 24°，cos 93° = −sin 3°，tan 117° = −1/tan 27° のように書きかえます．「−」と sin・cos・tan・1/tan のボタン，角度で答えます．
13. **🎯 ⑬ 三角方程式**
   0° ≦ θ ≦ 180° で sin θ = 1/√2，2cos θ = −√3，√3 tan θ − 1 = 0 などを満たす θ を求めます．角度の欄は1つで，答えが2つあると思ったら「＋もう1つ」で欄を増やします．1つしか答えていないときは「ほかにもある」と案内します．
14. **📈 ⑭ 直線の傾き**
   直線 y = mx（+ b）と x 軸の正の向きとのなす角を求める問題と，角から傾きを求める問題が半々です．
15. **🔗 ⑮ 1つから残りの2つ（0°〜180°）**
   sin を与えるときは問題文で鋭角か鈍角かを指定し，cos・tan を与えるときは符号から判断させます．解説はプリントの流れ（cos θ < 0 であるから，など）です．
16. **🧮 ⑯ 式の値（180° − θ）**
   sin 80° cos 170° − cos 80° sin 170°，sin 20° + sin 70° + cos 110° + cos 160°，1/tan²50° − 1/cos²40° などの型で，角度を変えて出します．
4. **📐 ④ 長さを求める（三角比の活用）**
   木の高さ（目の高さを足す）・影・見下ろした距離・坂・凧・はしご・エスカレーターなど．教科書の三角比の表を使って計算します．
5. **🧭 ⑤ 角度を求める（三角比の活用）**
   勾配（%・‰・「1/n 以下」）や辺の長さから，表で角度を引きます．
6. **🎯 ⑥ 活用ミックス**
   ④と⑤がランダムに出題されます．

### 🌲 三角比の活用の判定
* sin・cos・tan を使う問題が同じ割合で出ます．
* 長さは，表の値（4桁）で計算した答えを基準に，**最後の桁が ±1 ずれても正解**です（表の値や途中で丸めたときのずれを吸収するため）．
* 角度は表で最も近い角が正解です．隣の角は「惜しい」です．「〜以下」の問題は基準を超えない最大の角が正解です．
* 目の高さの足し忘れ，sin と cos の取り違え，見下ろす角をそのまま使った，などには案内を出します．
* 最初は文章だけを表示し，「📐 図を見る」で図を出せます．

### 📐 問題と判定の特徴
* θ と直角の印を必ず表示し，三角形の向き（回転・裏返し）は毎回変わります．
* 答えは「分数」「√」「分母に√」ボタンで入力の形を切り替えます．√21 は 21 だけ入れればよく，√ の前の数は 2√3 のようにあるときだけ入れます．
* 正解の条件は**値が等しく，最も簡単な形であること**です．
  * 約分されていない（8/10），√ の中が簡単にできる（√8），分母が 1（√3/1）は「惜しい」と表示します．
  * **有理化はしてもしなくても正解**です（2/√5 も 2√5/5 も，√3/√5 も √15/5 も○）．ただし √6/√10 のように √ どうしで約分できるものは「惜しい」です．√3/√5 のように分母・分子がともに √ の答えは正解にしたうえで，有理化した形をすすめる案内を出します．
* 練習モードでは，間違えたあとに「解説を見る」で sin θ = BC/AB = … の式を確認できます．

### 📖 やり方を学ぶ
* **三角比の定義**：斜辺・θ の向かいの辺・となりの辺，sin・cos・tan の定義，筆記体 s・c・t の覚え方，向きが変わったときの見方，例題．
* **大きさによらない**：スライダーで三角形を k 倍しても三角比が変わらないことを確かめ，相似で理由を説明します．
* **2辺から求める・答え方**：三平方の定理と，約分・√・有理化のルール，入力のしかた．
* **三角比の相互関係**：3つの公式の導き方，sin（cos）がわかるとき・tan がわかるときの手順，直角三角形を使う別解．
* **有名角・余角の三角比**：三角定規の辺の比と 30°・45°・60° の表，余角の公式（sin(90° − θ) = cos θ など）とその理由，45° 以下の角で表す・式の値の例と入力のしかた．
* **三角比の拡張（0°〜180°）**：直角三角形の定義が 90° で使えなくなる様子 → 同じ三角形を座標平面に置く → 90° を超えても座標なら読める（r = 2，P(−1, √3)）→ 角ごとにバラバラだった半径（30° は r = 2，45° は r = √2）を r = 1 にそろえる（単位円）→ 単位円で P をドラッグして試す（有名角のボタン，直線 x = 1 の tan，180° − θ の点）→ まとめ → コラム「なぜ正弦とよぶの？」（弦の半分が sin θ．プトレマイオスの弦の表 → インドの jya → sinus → オイラーが半径を 1 に）．教科書（数研 NEXT数学Ⅰ p.153〜157）の流れに「なぜ座標か・なぜ単位円か」を足しています．授業での提示と，生徒の見直し・自習の両方に使えます．横長の画面（幅 900px 以上）では説明が左，図が右に並び，スクロールせずに1枚ずつ映せます．
* **三角方程式・直線の傾き・相互関係（0°〜180°）**：単位円で解く三角方程式（sin は2つ，cos・tan は1つ），傾き = tan θ，鈍角のときの sin・cos・tan の符号と，sin だけでは鋭角か鈍角かが決まらないこと，「−」ボタンの使い方．
* **正弦定理（なぜ成り立つのか）**：測量の問題（川の向こうの木．AB = 100 m，∠A = 75°，∠B = 60°）→ 垂線を下ろして直角三角形をつくる（どの頂点から？）→ 高さを2通りに表して b/sin B = c/sin C → 3つの比が等しい → 鈍角でも成り立つ（sin(180° − θ) = sin θ）→ 比の値 k は a と ∠A だけで決まる．a と ∠A を変えずに動ける A の通り道が円 → 円周角の定理の復習（中心角が 180° より大きいときもふくむ）→ k = 2R（外接円）→ A を円の上で A′ まで動かす証明（中心角 ∠BOC = 2A のスライダーで鋭角・直角・鈍角）→ 別の見方：中心 O から弦の半分 = R sin A（中心角が 180° を超えるときもふくむ）→ まとめ（測量の答え，「正弦」の名前）．教科書は外接円から入るが，「なぜ円か」がわかるように高さから入る．横長の画面では説明が左，図が右．「1行ずつ表示」を切り替えられ，オンのときは「次へ」でも1行ずつ出る（端末が覚える）．
* **三角比の活用**：仰角・俯角，どの三角比を使うか（正弦・余弦・正接），三角比の表の引き方と答え方．

### 🎮 4つのゲームモード
* **♾️ 練習モード:** 制限時間なし．連続正解を伸ばします．
* **⏱️ タイムアタック:** 5問正解するまでのタイムを競います（不正解は +5秒）．
* **❤️ サバイバル:** ライフは3つ．何問解けるか挑戦します．
* **🔥 スコアアタック:** 90秒でスコアを稼ぎます．コンボで加点が増え，正解で残り時間 +10秒．

---

## 🛠 Tech Stack
* HTML5 / CSS3（Vanilla / Glassmorphism Light Theme）
* JavaScript（ES6+）．問題生成と判定は `core.js`（画面に依存しない）
* KaTeX（数式の表示）
* canvas-confetti（正解の演出）

## 🧪 テスト
```bash
node tests/core.test.js
node tests/apply.test.js
node tests/relation.test.js
node tests/famous.test.js
node tests/extend.test.js
node tests/wide.test.js
node tests/sine.test.js
```
プリントの解答例（三角比・三角比の活用），書き方のルール，約3億通りの入力パターンの総当たり（正解になるのは値が等しく最も簡単な形だけか），三角形とラベルの配置を検査します．

---

# trian.go (English)

A gamified web training app for the introduction of trigonometric ratios (sine, cosine, tangent) in Japanese high school Math I. The name comes from how students read "triangle" in katakana.

## ✨ Features
* **16 categories:** (1) all three sides given, (2) two sides given — find the third with the Pythagorean theorem first, (3) mixed; and applications with a trig table: (4) find a length (heights, slopes, angles of elevation and depression), (5) find an angle from a gradient or two sides, (6) mixed; and (7) trigonometric identities — given one of sin, cos, tan of an acute angle, find the other two; (8) sin, cos, tan of 30°, 45°, 60° and the reverse (find the acute angle); (9) rewrite with an angle of 45° or less using complementary angles (sin 64° = cos 26°, tan 83° = 1/tan 7°); (10) evaluate expressions using complementary angles; and for 0° ≤ θ ≤ 180°: (11) values at 0°–180°, (12) rewrite obtuse angles with an angle of 45° or less, (13) trigonometric equations, (14) slope of a line and its angle with the x-axis, (15) given one ratio, find the other two (with signs), (16) expressions using 180° − θ.
* Application answers computed with the 4-digit table are accepted within ±1 in the last digit.
* The angle θ and the right-angle mark are always shown, and the triangle is rotated or reflected at random every time.
* Answers must be in simplest form (reduced fractions, simplified radicals). **Rationalizing the denominator is optional** — both 2/√5 and 2√5/5 are accepted.
* Tutorials cover the definitions, how to read a rotated triangle, and an interactive slider showing that the ratios depend only on θ, not on the size of the triangle (similarity).
* **4 game modes:** Practice, Time Attack (5 problems), Survival (3 lives), Score Attack (90 seconds).
