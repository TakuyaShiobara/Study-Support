// ============================================================
// firebase/config.js
// Firebase / Gemini API の初期化設定。
//
// ★★★ このファイルは公開してはいけません（.gitignore 推奨） ★★★
// 下記の値は自分の Firebase プロジェクト / Gemini API キーに
// 置き換えてから利用してください。
//
// このMVPは「自分ひとりが使う」前提で、Firebase Authentication
// を使わずクライアントから直接 Firestore / Gemini API を呼び出します。
// そのため Firestore のセキュリティルールで書き込み元を絞る等の
// 対策は別途検討してください（README参照）。
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Firebase プロジェクト設定 ---------------------------------
// Firebaseコンソール > プロジェクトの設定 > 全般 > マイアプリ から取得
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// --- Gemini API 設定 --------------------------------------------
// https://aistudio.google.com/apikey で取得したAPIキーを設定してください。
// ローカル開発時は、このファイルをコピーして config.local.js 等にし、
// .env 相当の値をビルド前に注入する運用も可能です（README参照）。
export const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
// "-latest" のついたエイリアスはGoogle側で自動的に新しいモデルへ切り替わるため、
// 個別モデルの廃止（例: gemini-2.0-flashは2026年6月に廃止）に強くなります。
export const GEMINI_MODEL = "gemini-flash-latest";

// --- 初期化 --------------------------------------------------------
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 認証なしMVPのため、ユーザーIDは固定
export const USER_ID = "me";
