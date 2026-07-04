// ============================================================
// js/views/record.js — 「学習を記録」画面
// 30秒以内で入力を終えられることを目標にしたシンプルなフォーム。
// ============================================================

import { ICONS, STUDY_TYPES, todayStr, showToast, escapeHtml } from "../app.js";
import { getActiveCert } from "../appState.js";
import { listUnits, addUnit, addLog } from "../firestore.js";

let selectedType = "input";
let units = [];
let activeCertId = "";

export function template() {
  return `
  <header class="topbar">
    <button class="icon-btn" id="back-btn" aria-label="戻る"></button>
    <span class="topbar__title">学習を記録</span>
    <span style="width:38px;"></span>
  </header>

  <main class="view">

    <div id="no-cert-wrap" style="display:none;">
      <div class="empty-state"><p>先にホームで資格を登録してください。</p></div>
    </div>

    <form id="record-form" style="display:none;">
      <label class="field-label" style="margin-top:0;">日付</label>
      <input class="field" type="date" id="f-date" required />

      <label class="field-label">単元</label>
      <select class="field" id="f-unit"></select>

      <label class="field-label">学習内容</label>
      <div class="type-grid" id="f-type-grid"></div>

      <label class="field-label">学習時間</label>
      <div class="minutes-field-wrap">
        <input class="field" type="number" inputmode="numeric" min="1" id="f-minutes" placeholder="45" required />
        <span>分</span>
      </div>

      <label class="field-label">メモ（任意）</label>
      <textarea class="field" id="f-memo" rows="3" placeholder="今日の学習内容を一言メモ"></textarea>

      <button type="submit" class="btn btn-primary" id="f-save" style="width:100%; margin-top:24px;">保存する</button>
    </form>

  </main>`;
}

export async function init() {
  selectedType = "input";
  document.getElementById("back-btn").innerHTML = ICONS.arrowLeft;
  document.getElementById("back-btn").addEventListener("click", () => (location.hash = "#/home"));

  const activeCert = getActiveCert();
  if (!activeCert) {
    document.getElementById("no-cert-wrap").style.display = "block";
    return;
  }
  activeCertId = activeCert.id;

  document.getElementById("record-form").style.display = "block";
  document.getElementById("f-date").value = todayStr();

  renderTypeGrid();

  units = await listUnits(activeCertId);
  renderUnitOptions();

  document.getElementById("record-form").addEventListener("submit", handleSubmit);
}

function renderTypeGrid() {
  const grid = document.getElementById("f-type-grid");
  grid.innerHTML = STUDY_TYPES.map(
    (t) => `
    <button type="button" class="type-btn ${t.key === selectedType ? "is-selected" : ""}" data-type="${t.key}">
      ${t.icon}<span>${t.label}</span>
    </button>`
  ).join("");
  grid.querySelectorAll(".type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedType = btn.dataset.type;
      grid.querySelectorAll(".type-btn").forEach((b) => b.classList.toggle("is-selected", b === btn));
    });
  });
}

function renderUnitOptions() {
  const select = document.getElementById("f-unit");
  if (!units.length) {
    select.innerHTML = `<option value="">（単元が未登録です）</option>`;
    return;
  }
  select.innerHTML = units.map((u) => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join("");
}

async function handleSubmit(e) {
  e.preventDefault();
  const date = document.getElementById("f-date").value;
  let unitId = document.getElementById("f-unit").value;
  const minutes = Number(document.getElementById("f-minutes").value);
  const memo = document.getElementById("f-memo").value.trim();

  if (!date || !minutes || minutes <= 0) {
    showToast("日付と学習時間を入力してください");
    return;
  }

  if (!unitId) {
    if (!units.length) {
      unitId = await addUnit(activeCertId, { name: "未分類" });
    } else {
      showToast("単元を選択してください");
      return;
    }
  }

  const unit = units.find((u) => u.id === unitId);
  const saveBtn = document.getElementById("f-save");
  saveBtn.disabled = true;
  saveBtn.textContent = "保存中...";

  try {
    await addLog(activeCertId, {
      date,
      unitId,
      unitName: unit?.name || "未分類",
      type: selectedType,
      minutes,
      memo,
    });
    showToast("学習記録を保存しました");
    location.hash = "#/home";
  } catch (err) {
    console.error(err);
    showToast("保存に失敗しました");
    saveBtn.disabled = false;
    saveBtn.textContent = "保存する";
  }
}
