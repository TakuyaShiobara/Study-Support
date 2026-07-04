// ============================================================
// js/views/settings.js — 「設定」画面
// ============================================================

import { ICONS, getThemeMode, setThemeMode } from "../app.js";
import { GEMINI_API_KEY } from "../../firebase/config.js";

export function template() {
  return `
  <header class="topbar">
    <div class="topbar__left">
      <button class="icon-btn" id="menu-btn" aria-label="メニュー"></button>
      <span class="topbar__title">設定</span>
    </div>
  </header>

  <main class="view">

    <div class="section-head" style="margin-top:14px;"><h2>表示</h2></div>
    <div class="card">
      <div class="settings-row">
        <div>
          <div class="settings-row__label">ダークモード</div>
          <div class="settings-row__sub" id="theme-sub">端末の設定に合わせる</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="dark-toggle" />
          <span class="switch-track"></span>
        </label>
      </div>
    </div>

    <div class="section-head"><h2>AI機能</h2></div>
    <div class="card">
      <div class="settings-row" style="border-bottom:none;">
        <div>
          <div class="settings-row__label">Gemini API</div>
          <div class="settings-row__sub" id="gemini-status">確認中...</div>
        </div>
      </div>
    </div>

  </main>`;
}

export async function init() {
  document.getElementById("menu-btn").innerHTML = ICONS.menu;

  setupTheme();
  setupGeminiStatus();
}

function setupTheme() {
  const toggle = document.getElementById("dark-toggle");
  const sub = document.getElementById("theme-sub");
  const mode = getThemeMode();
  toggle.checked = mode === "dark";
  sub.textContent = mode === "system" ? "端末の設定に合わせる" : mode === "dark" ? "ダークモード" : "ライトモード";

  toggle.addEventListener("change", () => {
    const next = toggle.checked ? "dark" : "light";
    setThemeMode(next);
    sub.textContent = next === "dark" ? "ダークモード" : "ライトモード";
  });
}

function setupGeminiStatus() {
  const el = document.getElementById("gemini-status");
  const configured = Boolean(GEMINI_API_KEY) && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY";
  el.textContent = configured
    ? "設定済み（AIアドバイス・AI分析を利用できます）"
    : "未設定（学習データに基づく簡易分析のみ利用できます）";
}
