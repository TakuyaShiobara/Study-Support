// ============================================================
// js/views/help.js — 「ヘルプ・使い方」画面
// ============================================================

import { ICONS } from "../app.js";

export function template() {
  return `
  <header class="topbar">
    <div class="topbar__left">
      <button class="icon-btn" id="menu-btn" aria-label="メニュー"></button>
      <span class="topbar__title">ヘルプ・使い方</span>
    </div>
  </header>

  <main class="view">

    <div class="help-block" style="margin-top:16px;">
      <h3>基本の流れ</h3>
      <p>サイドバーの「資格を追加」で学習したい資格を登録し、「単元管理」から単元（科目）を追加します。学習したら「学習を記録」から30秒程度で記録しましょう。</p>
    </div>

    <div class="help-block">
      <h3>ホーム画面</h3>
      <p>試験までの残り日数、全体の進捗率、今日と今週の学習時間、単元ごとの進捗、AIからのアドバイスをまとめて確認できます。</p>
    </div>

    <div class="help-block">
      <h3>単元管理・単元詳細</h3>
      <p>単元ごとの進捗率は0〜100%で自由に編集できます。学習を記録すると、総学習時間・学習回数・最終学習日は自動で更新されます。</p>
    </div>

    <div class="help-block">
      <h3>レポート</h3>
      <p>今日・今週・今月・累計の学習時間、直近7日間の推移、単元別のランキング、学習内容別の割合を確認できます。</p>
    </div>

    <div class="help-block">
      <h3>AI分析</h3>
      <p>学習の偏りや放置している単元、学習時間の傾向、次におすすめの学習をまとめます。Gemini APIキーが未設定の場合も、学習データから計算した簡易分析が表示されます。</p>
    </div>

    <div class="help-block">
      <h3>データについて</h3>
      <p>このアプリはログインなしの個人利用を前提としており、データはFirebase Firestoreに保存されます。資格を削除すると、その資格に含まれる単元・学習記録もすべて削除されます。</p>
    </div>

  </main>`;
}

export async function init() {
  document.getElementById("menu-btn").innerHTML = ICONS.menu;
}
