// ============================================================
// js/views/achievements.js — 「資格取得履歴」画面
// これまでに取得した資格と取得日を一覧管理する。
// ============================================================

import {
  ICONS,
  formatDateJP,
  badgeFor,
  escapeHtml,
  themeToggleButtonHtml,
  bindThemeToggleButton,
} from "../app.js";
import { listAchievements } from "../firestore.js";
import { openAchievementFormModal, openAchievementContextMenu } from "../achievementUi.js";

let achievements = [];

export function template() {
  return `
  <header class="topbar">
    <div class="topbar__left">
      <button class="icon-btn" id="menu-btn" aria-label="メニュー"></button>
      <span class="topbar__title">資格取得履歴</span>
    </div>
    <div id="topbar-actions"></div>
  </header>

  <main class="view">
    <button class="btn btn-secondary" id="add-achievement-btn" style="width:100%; margin-top:14px;">＋資格取得履歴を追加</button>
    <div id="achievement-list" style="margin-top:18px;"></div>
  </main>`;
}

export async function init() {
  document.getElementById("menu-btn").innerHTML = ICONS.menu;
  document.getElementById("topbar-actions").innerHTML = themeToggleButtonHtml();
  bindThemeToggleButton();

  document.getElementById("add-achievement-btn").addEventListener("click", () => {
    openAchievementFormModal({ onSaved: reload });
  });

  await reload();
}

async function reload() {
  achievements = await listAchievements();
  render();
}

function render() {
  const container = document.getElementById("achievement-list");
  if (!achievements.length) {
    container.innerHTML = `<div class="empty-state"><p>まだ取得した資格が登録されていません。<br>「＋資格取得履歴を追加」から、過去に取得した資格も登録できます。</p></div>`;
    return;
  }
  container.innerHTML = achievements
    .map((a, i) => {
      const badge = badgeFor(i);
      return `
      <div class="achievement-card" data-id="${a.id}">
        <div class="achievement-badge" style="background:${badge.color}">${badge.icon}</div>
        <div class="achievement-card__body">
          <div class="achievement-card__name">${escapeHtml(a.name)}</div>
          <div class="achievement-card__date">取得日: ${formatDateJP(a.acquiredDate)}</div>
          ${a.memo ? `<div class="achievement-card__memo">${escapeHtml(a.memo)}</div>` : ""}
        </div>
        <button class="achievement-card__menu-btn" data-menu-id="${a.id}" aria-label="資格取得履歴メニュー">${ICONS.dots}</button>
      </div>`;
    })
    .join("");

  container.querySelectorAll("[data-menu-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const achievement = achievements.find((a) => a.id === btn.dataset.menuId);
      openAchievementContextMenu(achievement, btn, { onSaved: reload, onDeleted: reload });
    });
  });
}
