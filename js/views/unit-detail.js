// ============================================================
// js/views/unit-detail.js — 「単元詳細」画面
// ============================================================

import { ICONS, formatMinutes, formatTimestampJP, STUDY_TYPES, STUDY_TYPE_COLORS, showToast } from "../app.js";
import { getActiveCert } from "../appState.js";
import { getUnit, updateUnit } from "../firestore.js";
import { openUnitFormModal } from "../unitUi.js";
import { renderDonutChart } from "../charts.js";

let activeCertId = "";
let unitId = "";
let unit = null;

export function template() {
  return `
  <header class="topbar">
    <button class="icon-btn" id="back-btn" aria-label="戻る"></button>
    <span class="topbar__title" id="unit-title">単元詳細</span>
    <button class="icon-btn" id="edit-btn" aria-label="編集"></button>
  </header>

  <main class="view">

    <div id="not-found-wrap" style="display:none;">
      <div class="empty-state"><p>単元が見つかりませんでした。</p></div>
    </div>

    <div id="detail-content" style="display:none;">

      <div class="section-head" style="margin-top:16px;"><h2>進捗</h2></div>
      <div class="card">
        <div class="progress-slider-row">
          <input type="range" min="0" max="100" step="5" id="progress-slider" />
          <span class="progress-slider-row__value" id="progress-value">0%</span>
        </div>
      </div>

      <div class="mini-stat-grid">
        <div class="mini-stat">
          <div class="mini-stat__label">総学習時間</div>
          <div class="mini-stat__value" id="total-minutes">-</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat__label">学習回数</div>
          <div class="mini-stat__value" id="session-count">-</div>
        </div>
      </div>
      <div class="mini-stat" style="margin-top:10px;">
        <div class="mini-stat__label">最終学習日</div>
        <div class="mini-stat__value" id="last-studied">-</div>
      </div>

      <div class="section-head"><h2>学習内容の割合</h2></div>
      <div class="card" id="donut-card"></div>

      <div class="section-head"><h2>メモ</h2></div>
      <div class="card">
        <textarea class="field" id="memo-field" rows="4" placeholder="重要なポイントを整理しよう"></textarea>
        <button class="btn btn-secondary btn-sm" id="memo-save-btn" style="margin-top:12px;">メモを保存</button>
      </div>

    </div>

  </main>`;
}

export async function init(params) {
  unitId = params.get("id") || "";

  document.getElementById("back-btn").innerHTML = ICONS.arrowLeft;
  document.getElementById("back-btn").addEventListener("click", () => (location.hash = "#/units"));
  document.getElementById("edit-btn").innerHTML = ICONS.edit;

  const activeCert = getActiveCert();
  if (!activeCert || !unitId) {
    document.getElementById("not-found-wrap").style.display = "block";
    return;
  }
  activeCertId = activeCert.id;

  unit = await getUnit(activeCertId, unitId);
  if (!unit) {
    document.getElementById("not-found-wrap").style.display = "block";
    return;
  }

  document.getElementById("detail-content").style.display = "block";
  document.getElementById("unit-title").textContent = unit.name;
  document.getElementById("edit-btn").addEventListener("click", () => {
    openUnitFormModal({
      certId: activeCertId,
      unit,
      onSaved: async () => {
        unit = await getUnit(activeCertId, unitId);
        document.getElementById("unit-title").textContent = unit.name;
      },
    });
  });

  renderStats();
  renderDonut();
  bindProgressSlider();
  bindMemo();
}

function renderStats() {
  document.getElementById("total-minutes").textContent = formatMinutes(unit.totalMinutes || 0);
  document.getElementById("session-count").textContent = `${unit.sessionCount || 0}回`;
  document.getElementById("last-studied").textContent = formatTimestampJP(unit.lastStudiedAt);
}

function renderDonut() {
  const byType = unit.byType || {};
  const segments = STUDY_TYPES.map((t) => ({
    label: t.label,
    value: byType[t.key] || 0,
    color: STUDY_TYPE_COLORS[t.key],
  }));
  renderDonutChart(document.getElementById("donut-card"), {
    segments,
    centerValue: formatMinutes(unit.totalMinutes || 0),
    centerLabel: "総学習時間",
  });
}

function bindProgressSlider() {
  const slider = document.getElementById("progress-slider");
  const valueLabel = document.getElementById("progress-value");
  slider.value = unit.progress || 0;
  valueLabel.textContent = `${slider.value}%`;

  slider.addEventListener("input", () => {
    valueLabel.textContent = `${slider.value}%`;
  });
  slider.addEventListener("change", async () => {
    const progress = Number(slider.value);
    await updateUnit(activeCertId, unitId, { progress });
    unit.progress = progress;
    showToast("進捗を更新しました");
  });
}

function bindMemo() {
  const field = document.getElementById("memo-field");
  field.value = unit.memo || "";
  document.getElementById("memo-save-btn").addEventListener("click", async () => {
    await updateUnit(activeCertId, unitId, { memo: field.value });
    showToast("メモを保存しました");
  });
}
