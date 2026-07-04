// ============================================================
// js/achievementUi.js
// 「資格取得履歴」の追加・編集・削除に関する共通UI（モーダル・コンテキストメニュー）。
// ============================================================

import { addAchievement, updateAchievement, deleteAchievement } from "./firestore.js";
import { showToast, confirmDialog, escapeHtml, todayStr, ICONS } from "./app.js";

/** 資格取得履歴の追加・編集モーダルを表示する。保存に成功したらonSavedを呼ぶ。 */
export function openAchievementFormModal({ achievement, onSaved }) {
  document.getElementById("drawer")?.classList.remove("is-open");
  document.getElementById("drawer-overlay")?.classList.remove("is-open");

  const isEdit = Boolean(achievement);
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-sheet">
      <h3>${isEdit ? "資格取得履歴を編集" : "資格取得履歴を追加"}</h3>
      <label class="field-label">資格名</label>
      <input class="field" id="achievement-form-name" placeholder="例）応用情報技術者" value="${escapeHtml(achievement?.name || "")}" />
      <label class="field-label">取得日</label>
      <input class="field field--date" type="date" id="achievement-form-date" value="${escapeHtml(achievement?.acquiredDate || todayStr())}" />
      <label class="field-label">メモ（任意）</label>
      <textarea class="field" id="achievement-form-memo" rows="3" placeholder="スコアや補足など">${escapeHtml(achievement?.memo || "")}</textarea>
      <button class="btn btn-primary" id="achievement-form-save" style="margin-top:20px;">保存する</button>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-open"));

  const close = () => {
    overlay.classList.remove("is-open");
    setTimeout(() => overlay.remove(), 220);
  };
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const nameInput = overlay.querySelector("#achievement-form-name");
  const dateInput = overlay.querySelector("#achievement-form-date");
  const memoInput = overlay.querySelector("#achievement-form-memo");
  nameInput.focus();

  overlay.querySelector("#achievement-form-save").addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const acquiredDate = dateInput.value;
    const memo = memoInput.value.trim();
    if (!name) {
      showToast("資格名を入力してください");
      return;
    }
    if (!acquiredDate) {
      showToast("取得日を入力してください");
      return;
    }
    if (isEdit) {
      await updateAchievement(achievement.id, { name, acquiredDate, memo });
    } else {
      await addAchievement({ name, acquiredDate, memo });
    }
    close();
    showToast(isEdit ? "資格取得履歴を更新しました" : "資格取得履歴を追加しました");
    onSaved?.();
  });
}

/** 資格取得履歴の「…」メニュー（編集・削除） */
export function openAchievementContextMenu(achievement, anchorEl, { onSaved, onDeleted }) {
  document.querySelectorAll(".context-menu").forEach((m) => m.remove());

  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.innerHTML = `
    <button data-act="edit">${ICONS.edit}編集</button>
    <button data-act="delete" class="is-danger">${ICONS.trash}削除する</button>`;
  document.body.appendChild(menu);

  const rect = anchorEl.getBoundingClientRect();
  menu.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - 120)}px`;
  menu.style.left = `${Math.max(8, rect.right - 168)}px`;
  requestAnimationFrame(() => menu.classList.add("is-open"));

  const close = () => menu.remove();
  setTimeout(() => document.addEventListener("click", closeOnce), 0);
  function closeOnce(e) {
    if (!menu.contains(e.target)) {
      close();
      document.removeEventListener("click", closeOnce);
    }
  }

  menu.querySelector('[data-act="edit"]').addEventListener("click", () => {
    close();
    openAchievementFormModal({ achievement, onSaved });
  });
  menu.querySelector('[data-act="delete"]').addEventListener("click", async () => {
    close();
    if (!confirmDialog(`「${achievement.name}」を削除します。よろしいですか？`)) return;
    await deleteAchievement(achievement.id);
    showToast("資格取得履歴を削除しました");
    onDeleted?.();
  });
}
