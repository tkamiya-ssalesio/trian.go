# trian.go

> **English description follows Japanese.**

数学Ⅰ「図形と計量」の三角比（sin・cos・tan）を，直角三角形を見て素早く正確に求められるようにするための，ゲーム感覚で学べる Web トレーニングアプリケーションです．名前は triangle をカタカナで読んだ「トライアング」から，生徒が付けてくれました．

## 🎯 アプリの目的
三角比の導入でつまずくのは，「どの辺が分母で，どの辺が分子か」を三角形の向きが変わっても見抜けるかどうかです．本アプリは，向きが毎回変わる直角三角形で定義を何度も使い，さらに三角比が三角形の大きさによらず角 θ だけで決まることを体感できるように作りました．

## ✨ 主な機能と学習カテゴリ

### 📚 3つの学習カテゴリ
ゲームモードを選んだあと，問題の種類を選ぶとすぐ始まります．三角形の向きは「毎回変わる」と「いつも同じ（θ が左下，直角が右下）」から選べます（じっくり定義を覚えたいとき用．端末が覚えておきます）．

1. **🔰 ① 3辺がわかる三角形**
   3辺の長さ（整数や √ を含む値）から sin θ，cos θ，tan θ を求めます．
2. **📏 ② 2辺から求める**
   三平方の定理で「?」の辺の長さを求めて入力し，それから三角比を求めます．
3. **🔀 ③ ミックス**
   ①と②がランダムに出題されます．

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

### 📖 やり方を学ぶ（3つの解説）
* **三角比の定義**：斜辺・θ の向かいの辺・となりの辺，sin・cos・tan の定義，筆記体 s・c・t の覚え方，向きが変わったときの見方，例題．
* **大きさによらない**：スライダーで三角形を k 倍しても三角比が変わらないことを確かめ，相似で理由を説明します．
* **2辺から求める・答え方**：三平方の定理と，約分・√・有理化のルール，入力のしかた．
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
```
プリントの解答例（三角比・三角比の活用），書き方のルール，約3億通りの入力パターンの総当たり（正解になるのは値が等しく最も簡単な形だけか），三角形とラベルの配置を検査します．

---

# trian.go (English)

A gamified web training app for the introduction of trigonometric ratios (sine, cosine, tangent) in Japanese high school Math I. The name comes from how students read "triangle" in katakana.

## ✨ Features
* **6 categories:** (1) all three sides given, (2) two sides given — find the third with the Pythagorean theorem first, (3) mixed; and applications with a trig table: (4) find a length (heights, slopes, angles of elevation and depression), (5) find an angle from a gradient or two sides, (6) mixed.
* Application answers computed with the 4-digit table are accepted within ±1 in the last digit.
* The angle θ and the right-angle mark are always shown, and the triangle is rotated or reflected at random every time.
* Answers must be in simplest form (reduced fractions, simplified radicals). **Rationalizing the denominator is optional** — both 2/√5 and 2√5/5 are accepted.
* Tutorials cover the definitions, how to read a rotated triangle, and an interactive slider showing that the ratios depend only on θ, not on the size of the triangle (similarity).
* **4 game modes:** Practice, Time Attack (5 problems), Survival (3 lives), Score Attack (90 seconds).
