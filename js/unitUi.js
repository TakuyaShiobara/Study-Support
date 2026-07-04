// ============================================================
// js/unitUi.js
// 単元の追加・編集・削除に関する共通UI（モーダル・コンテキストメニュー）。
// ============================================================

import { addUnit, updateUnit, deleteUnit } from "./firestore.js";
import { showToast, confirmDialog, escapeHtml, ICONS } from "./app.js";

/** 単元の追加・名前編集モーダルを表示する */
export function openUnitFormModal({ certId, unit, onSaved }) {
  // ドロワーが開いたままだと、そのオーバーレイがモーダルの操作をブロックしてしまうため先に閉じる
  document.getElementById("drawer")?.classList.remove("is-open");
  document.getElementById("drawer-overlay")?.classList.remove("is-open");

  const isEdit = Boolean(unit);
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-sheet">
      <h3>${isEdit ? "単元を編集" : "単元を追加"}</h3>
      <label class="field-label">単元名</label>
      <input class="field" id="unit-form-name" placeholder="例）データベース" value="${escapeHtml(unit?.name || "")}" />
      <button class="btn btn-primary" id="unit-form-save" style="margin-top:20px;">保存する</button>
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

  const nameInput = overlay.querySelector("#unit-form-name");
  nameInput.focus();

  overlay.querySelector("#unit-form-save").addEventListener("click", async () => {
    const name = nameInput.value.trim();
    if (!name) {
      showToast("単元名を入力してください");
      return;
    }
    if (isEdit) {
      await updateUnit(certId, unit.id, { name });
    } else {
      await addUnit(certId, { name });
    }
    close();
    showToast(isEdit ? "単元を更新しました" : "単元を追加しました");
    onSaved?.();
  });
}

/** 単元の「…」メニュー（編集・削除） */
export function openUnitContextMenu(certId, unit, anchorEl, { onSaved, onDeleted }) {
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
    openUnitFormModal({ certId, unit, onSaved });
  });
  menu.querySelector('[data-act="delete"]').addEventListener("click", async () => {
    close();
    if (!confirmDialog(`「${unit.name}」を削除します。関連する学習記録も削除され、元に戻せません。よろしいですか？`)) return;
    await deleteUnit(certId, unit.id);
    showToast("単元を削除しました");
    onDeleted?.();
  });
}
