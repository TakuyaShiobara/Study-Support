// ============================================================
// js/views/home.js — ホーム画面
// ============================================================

import {
  ICONS,
  formatMinutes,
  formatDateJP,
  daysUntil,
  todayStr,
  currentWeekDates,
  badgeFor,
  showToast,
  themeToggleButtonHtml,
  bindThemeToggleButton,
  escapeHtml,
} from "../app.js";
import { getActiveCert, refreshCerts } from "../appState.js";
import { listUnits, listLogs } from "../firestore.js";
import { openCertFormModal } from "../certUi.js";
import { generateAdvice } from "../gemini.js";

export function template() {
  return `
  <header class="topbar">
    <div class="topbar__left">
      <button class="icon-btn" id="menu-btn" aria-label="メニュー"></button>
      <button class="cert-switch" id="cert-switch-btn"><span id="cert-switch-name">読み込み中...</span></button>
    </div>
    <div id="topbar-actions" style="display:flex; gap:4px;"></div>
  </header>

  <main class="view">

    <div id="empty-state-wrap" style="display:none;">
      <div class="empty-state">
        <p>まだ資格が登録されていません。<br>まずは学習したい資格を追加しましょう。</p>
        <button class="btn btn-primary" id="empty-add-cert-btn" style="margin-top:16px;">＋ 資格を追加</button>
      </div>
    </div>

    <div id="home-content" style="display:none;">

      <section class="hero">
        <div class="hero__row">
          <div>
            <div class="hero__exam-name" id="exam-name">-</div>
            <div class="hero__days" style="margin-top:10px;">
              <span class="hero__days-num" id="days-num">–</span>
              <span class="hero__days-label">日</span>
            </div>
            <div class="hero__date" id="exam-date">試験日: –</div>
          </div>
          <div class="progress-ring" id="progress-ring">
            <svg viewBox="0 0 84 84">
              <circle class="track" cx="42" cy="42" r="36"></circle>
              <circle class="fill" id="ring-fill" cx="42" cy="42" r="36"
                stroke-dasharray="226.19" stroke-dashoffset="226.19"></circle>
            </svg>
            <div class="progress-ring__label">
              <span class="progress-ring__pct" id="ring-pct">0%</span>
              <span class="progress-ring__cap">達成率</span>
            </div>
          </div>
        </div>
      </section>

      <div class="section-head"><h2>今日の学習</h2></div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-card__label">今日の学習時間</div>
          <div class="stat-card__value" id="today-minutes">0<small>分</small></div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">今週の学習時間</div>
          <div class="stat-card__value" id="week-minutes">0<small>分</small></div>
        </div>
      </div>

      <button class="btn btn-primary fab-start" id="record-btn">＋ 学習を記録</button>

      <div class="section-head">
        <h2>単元の進捗</h2>
        <a href="#/units" class="section-sub" style="color:var(--accent); font-weight:600;">すべて見る ›</a>
      </div>
      <div class="card" id="unit-progress-card">
        <div id="unit-progress-list"></div>
      </div>

      <div class="section-head">
        <h2>AIからのアドバイス</h2>
        <a href="#/ai" class="section-sub" style="color:var(--accent); font-weight:600;">もっと見る ›</a>
      </div>
      <div class="advice-card">
        <span class="advice-card__label">AIコーチより</span>
        <ul id="advice-list" style="padding-left:18px; margin:0; font-size:13.5px; line-height:1.9; color:var(--text-primary);"></ul>
      </div>

    </div>

  </main>`;
}

export async function init() {
  const activeCert = getActiveCert();

  document.getElementById("menu-btn").innerHTML = ICONS.menu;
  document.getElementById("cert-switch-btn").innerHTML = `<span id="cert-switch-name"></span>${ICONS.chevronDown}`;
  document.getElementById("topbar-actions").innerHTML =
    `<button class="icon-btn" id="bell-btn" aria-label="通知">${ICONS.bell}</button>` + themeToggleButtonHtml();
  bindThemeToggleButton();
  document.getElementById("bell-btn").addEventListener("click", () => {
    showToast("通知機能は準備中です");
  });
  document.getElementById("cert-switch-btn").addEventListener("click", () => {
    document.getElementById("menu-btn").click();
  });
  document.getElementById("empty-add-cert-btn").addEventListener("click", () => {
    openCertFormModal({
      onSaved: async () => {
        await refreshCerts();
        if (location.hash === "#/home") {
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        } else {
          location.hash = "#/home";
        }
      },
    });
  });

  if (!activeCert) {
    document.getElementById("empty-state-wrap").style.display = "block";
    return;
  }

  document.getElementById("home-content").style.display = "block";
  document.getElementById("cert-switch-name").textContent = activeCert.name || "無題の資格";

  renderExamInfo(activeCert);
  document.getElementById("record-btn").addEventListener("click", () => {
    location.hash = "#/record";
  });

  const [units, logs] = await Promise.all([listUnits(activeCert.id), listLogs(activeCert.id)]);

  renderProgressRing(units);
  renderTodayWeek(logs);
  renderUnitList(units);
  loadAdvice(activeCert, units, logs);
}

function renderExamInfo(cert) {
  document.getElementById("exam-name").textContent = cert.name || "資格名未設定";
  document.getElementById("exam-date").textContent = `試験日: ${formatDateJP(cert.examDate)}`;
  const d = daysUntil(cert.examDate);
  document.getElementById("days-num").textContent = d === null ? "–" : d;
}

function renderProgressRing(units) {
  const pct = units.length
    ? Math.round(units.reduce((s, u) => s + (u.progress || 0), 0) / units.length)
    : 0;
  const circumference = 226.19;
  const offset = circumference - (circumference * pct) / 100;
  document.getElementById("ring-fill").style.strokeDashoffset = offset;
  document.getElementById("ring-pct").textContent = `${pct}%`;
}

function renderTodayWeek(logs) {
  const today = todayStr();
  const weekDates = currentWeekDates();
  const todayMinutes = logs.filter((l) => l.date === today).reduce((s, l) => s + (l.minutes || 0), 0);
  const weekMinutes = logs.filter((l) => weekDates.includes(l.date)).reduce((s, l) => s + (l.minutes || 0), 0);

  document.getElementById("today-minutes").innerHTML = `${todayMinutes}<small>分</small>`;
  document.getElementById("week-minutes").innerHTML = `${formatMinutes(weekMinutes)}`;
}

function renderUnitList(units) {
  const container = document.getElementById("unit-progress-list");
  if (!units.length) {
    container.innerHTML = `<div class="empty-state" style="padding:24px 0;"><p>単元を登録すると、ここに進捗が表示されます。</p></div>`;
    return;
  }
  const top = [...units].sort((a, b) => (b.totalMinutes || 0) - (a.totalMinutes || 0)).slice(0, 5);
  container.innerHTML = top
    .map((u, i) => {
      const badge = badgeFor(i);
      const pct = u.progress || 0;
      return `
      <div class="unit-progress-row">
        <div class="unit-badge" style="background:${badge.color}">${badge.icon}</div>
        <div class="unit-progress-row__body">
          <div class="unit-progress-row__top">
            <span class="unit-progress-row__name">${escapeHtml(u.name)}</span>
            <span class="unit-progress-row__pct">${pct}%</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;"></div></div>
        </div>
      </div>`;
    })
    .join("");
}

async function loadAdvice(cert, units, logs) {
  const list = document.getElementById("advice-list");
  list.innerHTML = `<li>読み込み中...</li>`;
  try {
    const bullets = await generateAdvice(cert, units, logs);
    list.innerHTML = bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
  } catch (e) {
    list.innerHTML = `<li>アドバイスの取得に失敗しました</li>`;
  }
}
