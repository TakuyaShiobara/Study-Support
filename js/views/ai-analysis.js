// ============================================================
// js/views/ai-analysis.js — 「AI分析」画面
// ============================================================

import { ICONS, escapeHtml, themeToggleButtonHtml, bindThemeToggleButton } from "../app.js";
import { getActiveCert } from "../appState.js";
import { listUnits, listLogs } from "../firestore.js";
import { generateAnalysis } from "../gemini.js";

const SECTIONS = [
  { key: "imbalance", title: "学習の偏り", icon: ICONS.scale, color: "#f59e0b" },
  { key: "weakUnit", title: "学習不足の単元", icon: ICONS.target, color: "#ec4899" },
  { key: "trend", title: "学習時間の傾向", icon: ICONS.trend, color: "#3557e8" },
  { key: "recommendation", title: "次におすすめの学習", icon: ICONS.sparkle, color: "#22c55e" },
];

export function template() {
  return `
  <header class="topbar">
    <div class="topbar__left">
      <button class="icon-btn" id="menu-btn" aria-label="メニュー"></button>
      <span class="topbar__title">AI分析</span>
    </div>
    <div id="topbar-actions"></div>
  </header>

  <main class="view">

    <div id="no-cert-wrap" style="display:none;">
      <div class="empty-state"><p>先にホームで資格を登録してください。</p></div>
    </div>

    <div id="analysis-content" style="display:none;">
      <div class="section-head" style="margin-top:14px;"><h2>学習データからの分析</h2></div>
      <div id="insight-list">
        <div class="empty-state"><div class="spinner spinner-accent" style="margin:0 auto 12px;"></div><p>分析中...</p></div>
      </div>
    </div>

  </main>`;
}

export async function init() {
  document.getElementById("menu-btn").innerHTML = ICONS.menu;
  document.getElementById("topbar-actions").innerHTML = themeToggleButtonHtml();
  bindThemeToggleButton();

  const activeCert = getActiveCert();
  if (!activeCert) {
    document.getElementById("no-cert-wrap").style.display = "block";
    return;
  }
  document.getElementById("analysis-content").style.display = "block";

  const [units, logs] = await Promise.all([listUnits(activeCert.id), listLogs(activeCert.id)]);
  const analysis = await generateAnalysis(activeCert, units, logs);
  render(analysis);
}

function render(analysis) {
  const container = document.getElementById("insight-list");
  container.innerHTML = SECTIONS.map(
    (s) => `
    <div class="insight-card">
      <div class="insight-card__icon" style="background:${s.color}22; color:${s.color};">${s.icon}</div>
      <div>
        <div class="insight-card__title">${escapeHtml(s.title)}</div>
        <div class="insight-card__text">${escapeHtml(analysis[s.key] || "")}</div>
      </div>
    </div>`
  ).join("");
}
