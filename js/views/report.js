// ============================================================
// js/views/report.js — 「レポート」画面
// タブ構成: 概要 / 学習時間 / 単元別 / 学習内容別
// ============================================================

import {
  ICONS,
  formatMinutes,
  todayStr,
  currentWeekDates,
  currentMonthPrefix,
  lastNDays,
  formatDateShort,
  escapeHtml,
  STUDY_TYPES,
  STUDY_TYPE_COLORS,
  themeToggleButtonHtml,
  bindThemeToggleButton,
} from "../app.js";
import { getActiveCert } from "../appState.js";
import { listUnits, listLogs } from "../firestore.js";
import { renderBarChart, renderDonutChart } from "../charts.js";

export function template() {
  return `
  <header class="topbar">
    <div class="topbar__left">
      <button class="icon-btn" id="menu-btn" aria-label="メニュー"></button>
      <span class="topbar__title">レポート</span>
    </div>
    <div id="topbar-actions"></div>
  </header>

  <main class="view">

    <div id="no-cert-wrap" style="display:none;">
      <div class="empty-state"><p>先にホームで資格を登録してください。</p></div>
    </div>

    <div id="report-content" style="display:none;">
      <div class="segment" id="report-tabs" style="margin-top:14px;">
        <button data-tab="overview" class="is-active">概要</button>
        <button data-tab="time">学習時間</button>
        <button data-tab="unit">単元別</button>
        <button data-tab="type">内容別</button>
      </div>

      <div class="report-tab-panel is-active" data-panel="overview">
        <div class="stat-grid-4">
          <div class="stat-card"><div class="stat-card__label">今日</div><div class="stat-card__value" id="ov-today">-</div></div>
          <div class="stat-card"><div class="stat-card__label">今週</div><div class="stat-card__value" id="ov-week">-</div></div>
          <div class="stat-card"><div class="stat-card__label">今月</div><div class="stat-card__value" id="ov-month">-</div></div>
          <div class="stat-card"><div class="stat-card__label">累計</div><div class="stat-card__value" id="ov-total">-</div></div>
        </div>
      </div>

      <div class="report-tab-panel" data-panel="time">
        <div class="card">
          <div id="time-chart"></div>
        </div>
      </div>

      <div class="report-tab-panel" data-panel="unit">
        <div class="card">
          <div id="unit-rank-list"></div>
        </div>
      </div>

      <div class="report-tab-panel" data-panel="type">
        <div class="card">
          <div id="type-donut"></div>
        </div>
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
  document.getElementById("report-content").style.display = "block";

  setupTabs();

  const [units, logs] = await Promise.all([listUnits(activeCert.id), listLogs(activeCert.id)]);

  renderOverview(logs);
  renderTimeChart(logs);
  renderUnitRanking(units);
  renderTypeDonut(logs);
}

function setupTabs() {
  const tabs = document.getElementById("report-tabs");
  tabs.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
      document.querySelectorAll(".report-tab-panel").forEach((p) => {
        p.classList.toggle("is-active", p.dataset.panel === btn.dataset.tab);
      });
    });
  });
}

function sumMinutes(logs, dates) {
  return logs.filter((l) => dates.includes(l.date)).reduce((s, l) => s + (l.minutes || 0), 0);
}

function renderOverview(logs) {
  const today = todayStr();
  const week = currentWeekDates();
  const monthPrefix = currentMonthPrefix();

  const todayMin = sumMinutes(logs, [today]);
  const weekMin = sumMinutes(logs, week);
  const monthMin = logs.filter((l) => l.date.startsWith(monthPrefix)).reduce((s, l) => s + (l.minutes || 0), 0);
  const totalMin = logs.reduce((s, l) => s + (l.minutes || 0), 0);

  document.getElementById("ov-today").textContent = formatMinutes(todayMin);
  document.getElementById("ov-week").textContent = formatMinutes(weekMin);
  document.getElementById("ov-month").textContent = formatMinutes(monthMin);
  document.getElementById("ov-total").textContent = formatMinutes(totalMin);
}

function renderTimeChart(logs) {
  const days = lastNDays(7);
  const values = days.map((d) => sumMinutes(logs, [d]));
  const labels = days.map((d) => formatDateShort(d));
  renderBarChart(document.getElementById("time-chart"), {
    labels,
    values,
    valueFormatter: (v) => `${v}分`,
    todayIndex: days.length - 1,
  });
}

function renderUnitRanking(units) {
  const container = document.getElementById("unit-rank-list");
  const ranked = [...units].filter((u) => (u.totalMinutes || 0) > 0).sort((a, b) => (b.totalMinutes || 0) - (a.totalMinutes || 0));

  if (!ranked.length) {
    container.innerHTML = `<p style="font-size:13px; color:var(--text-tertiary); padding:4px;">まだ学習記録がありません。</p>`;
    return;
  }
  const max = ranked[0].totalMinutes || 1;
  container.innerHTML = ranked
    .map((u, i) => {
      const pct = Math.round(((u.totalMinutes || 0) / max) * 100);
      return `
      <div class="rank-row">
        <div class="rank-num">${i + 1}</div>
        <div class="rank-bar-wrap">
          <div style="display:flex; justify-content:space-between; font-size:13.5px; font-weight:600;">
            <span>${escapeHtml(u.name)}</span>
            <span style="color:var(--text-tertiary); font-weight:500;">${formatMinutes(u.totalMinutes || 0)}</span>
          </div>
          <div class="rank-bar-track"><div class="rank-bar-fill" style="width:${pct}%; background:var(--accent);"></div></div>
        </div>
      </div>`;
    })
    .join("");
}

function renderTypeDonut(logs) {
  const totals = {};
  logs.forEach((l) => {
    totals[l.type] = (totals[l.type] || 0) + (l.minutes || 0);
  });
  const totalAll = Object.values(totals).reduce((s, v) => s + v, 0);
  const segments = STUDY_TYPES.map((t) => ({
    label: t.label,
    value: totals[t.key] || 0,
    color: STUDY_TYPE_COLORS[t.key],
  }));
  renderDonutChart(document.getElementById("type-donut"), {
    segments,
    centerValue: formatMinutes(totalAll),
    centerLabel: "総学習時間",
  });
}
