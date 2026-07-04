// ============================================================
// js/views/units.js — 「単元管理」画面
// ============================================================

import {
  ICONS,
  formatMinutes,
  formatTimestampJP,
  badgeFor,
  escapeHtml,
  themeToggleButtonHtml,
  bindThemeToggleButton,
} from "../app.js";
import { getActiveCert } from "../appState.js";
import { listUnits } from "../firestore.js";
import { openUnitFormModal, openUnitContextMenu } from "../unitUi.js";

let activeCertId = "";
let units = [];

export function template() {
  return `
  <header class="topbar">
    <div class="topbar__left">
      <button class="icon-btn" id="menu-btn" aria-label="メニュー"></button>
      <span class="topbar__title">単元管理</span>
    </div>
    <div id="topbar-actions"></div>
  </header>

  <main class="view">

    <div id="no-cert-wrap" style="display:none;">
      <div class="empty-state"><p>先にホームで資格を登録してください。</p></div>
    </div>

    <div id="units-content" style="display:none;">
      <button class="btn btn-secondary" id="add-unit-btn" style="width:100%; margin-top:14px;">＋単元追加</button>
      <div id="unit-list" style="margin-top:18px;"></div>
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
  activeCertId = activeCert.id;
  document.getElementById("units-content").style.display = "block";

  document.getElementById("add-unit-btn").addEventListener("click", () => {
    openUnitFormModal({ certId: activeCertId, onSaved: reload });
  });

  await reload();
}

async function reload() {
  units = await listUnits(activeCertId);
  render();
}

function render() {
  const container = document.getElementById("unit-list");
  if (!units.length) {
    container.innerHTML = `<div class="empty-state"><p>まだ単元が登録されていません。<br>「＋単元追加」から始めましょう。</p></div>`;
    return;
  }
  container.innerHTML = units
    .map((u, i) => {
      const badge = badgeFor(i);
      return `
      <div class="unit-card" data-id="${u.id}">
        <div class="unit-badge" style="background:${badge.color}">${badge.icon}</div>
        <div class="unit-card__body">
          <div class="unit-card__top">
            <span class="unit-card__name">${escapeHtml(u.name)}</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${u.progress || 0}%;"></div></div>
          <div class="unit-card__meta">
            <span>進捗 ${u.progress || 0}%</span>
            <span>${formatMinutes(u.totalMinutes || 0)}</span>
            <span>${u.sessionCount || 0}回</span>
          </div>
          <div class="unit-card__meta">
            <span>最終学習日: ${formatTimestampJP(u.lastStudiedAt)}</span>
          </div>
        </div>
        <button class="unit-card__menu-btn" data-menu-id="${u.id}" aria-label="単元メニュー">${ICONS.dots}</button>
      </div>`;
    })
    .join("");

  container.querySelectorAll(".unit-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".unit-card__menu-btn")) return;
      location.hash = `#/unit?id=${encodeURIComponent(card.dataset.id)}`;
    });
  });
  container.querySelectorAll("[data-menu-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const unit = units.find((u) => u.id === btn.dataset.menuId);
      openUnitContextMenu(activeCertId, unit, btn, { onSaved: reload, onDeleted: reload });
    });
  });
}
