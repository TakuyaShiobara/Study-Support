# AI資格コーチ（study-coach）

複数の資格試験の学習を記録・可視化し、AIが学習状況を分析する個人用PWAです。
**SPA構成**（1つのHTMLをJavaScriptが書き換える方式）になっており、画面切り替えはページの再読み込みなしで高速に行われます。

- フレームワークなし（HTML / CSS / JavaScript ES Modules のみ）
- Firebase Hosting + Firestore
- Gemini API（AIアドバイス・AI分析。未設定でも学習データから計算する簡易分析で動作）
- PWA対応（ホーム画面追加・オフライン表示）
- 認証なし・自分ひとりで使う前提（ユーザーIDは固定で `me`）
- 複数資格に対応（サイドバーの資格一覧から切り替え）

---

## 1. ディレクトリ構成

```
study-coach/
├── index.html                     … 唯一のHTML。#app-root にビューを差し替えて表示する
├── css/style.css                    … 全画面共通スタイル（ダークモード対応）
├── js/
│   ├── main.js                        … SPAルーター（URLのハッシュに応じてビューを切り替える）
│   ├── appState.js                      … 資格一覧・アクティブ資格の状態管理、ドロワー/タブバーの初回マウント
│   ├── app.js                             … 共通ユーティリティ（テーマ・日付・アイコン・ドロワー/タブバー描画等）
│   ├── certUi.js                            … 資格の追加・編集・削除UI（モーダル・コンテキストメニュー）
│   ├── unitUi.js                              … 単元の追加・編集・削除UI
│   ├── charts.js                                … 軽量な棒グラフ・ドーナツチャート描画
│   ├── firestore.js                               … Firestore CRUDラッパー
│   ├── gemini.js                                    … AIアドバイス・AI分析（ルールベース＋Gemini仕上げ）
│   └── views/                                         … 各画面（テンプレート＋初期化関数）
│       ├── home.js         … ホーム
│       ├── record.js       … 学習を記録
│       ├── units.js        … 単元管理
│       ├── unit-detail.js  … 単元詳細
│       ├── report.js       … レポート
│       ├── ai-analysis.js  … AI分析
│       ├── settings.js     … 設定
│       └── help.js         … ヘルプ・使い方
├── firebase/
│   ├── config.js                                       … Firebase/Gemini設定（★要編集・非公開）
│   └── config.example.js                                 … 設定ファイルのテンプレート
├── icons/                                                   … PWAアイコン
├── manifest.json / service-worker.js                          … PWA関連
├── firestore.rules / firebase.json                              … Firebase設定
└── README.md
```

### SPAの仕組み（ルーティング）

URLは `index.html#/home` のようにハッシュで画面を表現します（例: `#/record`, `#/units`, `#/unit?id=xxx`, `#/report`, `#/ai`, `#/settings`, `#/help`）。
`js/main.js` がハッシュの変化を検知し、`js/views/` 以下の該当するビューの `template()`（HTML文字列）を `#app-root` に挿入して `init()` を呼びます。ページ全体の再読み込みが発生しないため、タブ・メニューの切り替えが高速です。

資格一覧・アクティブな資格は `js/appState.js` がメモリ上に保持し、画面遷移のたびにFirestoreへ再アクセスしないようにしています（起動時のみ取得し、追加・編集・削除時に更新します）。

---

## 2. セットアップ手順

### 2.1 Firebaseプロジェクトを作成

1. [Firebaseコンソール](https://console.firebase.google.com/) で新規プロジェクトを作成
2. 「Firestore Database」を有効化
3. 「プロジェクトの設定 → マイアプリ」からWebアプリを追加し、`firebaseConfig` を取得

### 2.2 Gemini APIキーを取得（任意）

1. [Google AI Studio](https://aistudio.google.com/apikey) でAPIキーを発行

Gemini APIキーが未設定・エラーの場合でも、AIアドバイス・AI分析は学習データから
計算するルールベースの簡易分析として動作します（アプリが完全に止まることはありません）。

### 2.3 設定ファイルを作成

```bash
cp firebase/config.example.js firebase/config.js   # 既にconfig.jsがある場合は直接編集
```

`firebase/config.js` を開き、Firebase設定とGemini APIキーを書き換えてください。
モデル名は自動更新エイリアスの `gemini-flash-latest` を推奨します（個別モデルの
廃止に強くなります）。

### 2.4 Firestoreセキュリティルールを適用

`firestore.rules` は `users/me` 配下のみ読み書きを許可する簡易ルールです。
Firebaseコンソールの「Firestore Database → ルール」に貼り付けて公開してください。

⚠️ 認証がないため、Firebaseの設定値が漏れると誰でも読み書きできてしまいます。
自分ひとりで使うMVPとして割り切った設計です。

### 2.5 公開する

GitHub Pages、Firebase Hostingいずれでも動作します。静的ファイルをそのまま
アップロードするだけで動きます（ビルド不要）。

画面はすべて `index.html#/home` のようなURLのハッシュ部分で切り替わる
SPA構成のため、GitHub Pagesでも特別なリライト設定は不要です
（ハッシュはサーバーに送信されないため、常に `index.html` が返ります）。

---

## 3. Firestoreデータ構成

```
users/
  me/
    certs/
      {certId}                       … 資格
        name, examDate,
        dailyGoalMinutes, weeklyGoalMinutes
        units/
          {unitId}                     … 単元
            name, memo, progress(0-100),
            totalMinutes, sessionCount, lastStudiedAt,
            byType: { input, practice, mock, review, video, other }
        logs/
          {logId}                        … 1回分の学習記録
            date, unitId, unitName, type, minutes, memo
```

- 単元の `progress`（進捗率）はAIによる自動判定ではなく、単元詳細画面のスライダーで
  自分で0〜100%に設定する値です。
- 学習記録を保存すると、対応する単元の `totalMinutes` / `sessionCount` / `byType` /
  `lastStudiedAt` が自動更新されます（Firestoreの `increment()` を利用）。
- アクティブな資格（どの資格を表示中か）は端末のlocalStorageに保存されます
  （複数端末間の同期はしません）。

---

## 4. AI機能について

`js/gemini.js` に、以下2つの関数があります。

- `generateAdvice(cert, units, logs)` … ホームの「AIからのアドバイス」
- `generateAnalysis(cert, units, logs)` … 「AI分析」画面の詳細分析

どちらも、まず学習データそのものから次の4つを計算するルールベースの分析
（`computeInsights`）を土台にしています。

1. 学習の偏り（学習内容の種類が偏っていないか）
2. 学習不足の単元（長期間放置されている単元）
3. 学習時間の傾向（今週と先週の比較）
4. 次におすすめの学習（進捗率が低い単元）

Gemini APIキーが設定されている場合は、この事実を自然な文章に言い換える
「仕上げ役」として呼び出します。API側のモデル廃止やエラーが起きても、
ルールベースの結果がそのまま表示されるため、AI機能が完全に止まることはありません。

---

## 5. PWAについて

- `manifest.json` によりホーム画面に追加可能
- `service-worker.js` が静的ファイルをキャッシュし、オフラインでも画面表示が可能
  （Firestore / Gemini APIの通信自体はオンラインが必要）
- ファイルを更新した際は `service-worker.js` の `CACHE_VERSION` を上げると、
  古いキャッシュが破棄され新しいファイルが確実に反映されます

---

## 6. 今後の拡張アイデア

- 学習記録の一覧・編集・削除画面（現状は記録の追加のみ）
- 通知（Web Push）でのリマインド
- 忘却曲線に基づいた自動復習スケジューリング
- Firebase Authenticationを導入し複数端末・複数人対応
- Gemini API呼び出しをCloud Functions経由にしてAPIキーをサーバー側に隠蔽
- 問題管理・模試スコアの記録
