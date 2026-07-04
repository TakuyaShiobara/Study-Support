// ============================================================
// js/certUi.js
// 「資格を追加」「名前変更」「試験日変更」「削除」など、
// 資格（cert）に関する共通UI（モーダル・コンテキストメニュー）。
// サイドバーの資格一覧・ホーム画面など複数箇所から利用する。
// ============================================================

import { addCert, updateCert, deleteCert } from "./firestore.js";
import { showToast, confirmDialog, escapeHtml, ICONS } from "./app.js";

/** 資格の追加・編集モーダルを表示する。保存に成功したらonSavedを呼ぶ。 */
export function openCertFormModal({ cert, focus, onSaved }) {
  // ドロワーが開いたままだと、そのオーバーレイがモーダルの操作をブロックしてしまうため先に閉じる
  document.getElementById("drawer")?.classList.remove("is-open");
  document.getElementById("drawer-overlay")?.classList.remove("is-open");

  const isEdit = Boolean(cert);
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-sheet">
      <h3>${isEdit ? "資格を編集" : "資格を追加"}</h3>
      <label class="field-label">資格名</label>
      <input class="field" id="cert-form-name" placeholder="例）応用情報技術者" value="${escapeHtml(cert?.name || "")}" />
      <label class="field-label">試験日</label>
      <input class="field" type="date" id="cert-form-date" value="${escapeHtml(cert?.examDate || "")}" />
      <button class="btn btn-primary" id="cert-form-save" style="margin-top:20px;">保存する</button>
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

  const nameInput = overlay.querySelector("#cert-form-name");
  const dateInput = overlay.querySelector("#cert-form-date");
  if (focus === "date") dateInput.focus();
  else nameInput.focus();

  overlay.querySelector("#cert-form-save").addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const examDate = dateInput.value;
    if (!name) {
      showToast("資格名を入力してください");
      return;
    }
    if (isEdit) {
      await updateCert(cert.id, { name, examDate });
    } else {
      const id = await addCert({ name, examDate });
      cert = { id };
    }
    close();
    showToast(isEdit ? "資格を更新しました" : "資格を追加しました");
    onSaved?.(cert.id);
  });
}

/** 資格の「…」メニュー（名前変更・試験日変更・削除）をボタン付近に表示する */
export function openCertContextMenu(cert, anchorEl, { onSaved, onDeleted }) {
  document.querySelectorAll(".context-menu").forEach((m) => m.remove());

  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.innerHTML = `
    <button data-act="rename">${ICONS.edit}名前を変更</button>
    <button data-act="date">${ICONS.calendar}試験日を変更</button>
    <button data-act="delete" class="is-danger">${ICONS.trash}削除する</button>`;
  document.body.appendChild(menu);

  const rect = anchorEl.getBoundingClientRect();
  menu.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - 160)}px`;
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

  menu.querySelector('[data-act="rename"]').addEventListener("click", () => {
    close();
    openCertFormModal({ cert, focus: "name", onSaved });
  });
  menu.querySelector('[data-act="date"]').addEventListener("click", () => {
    close();
    openCertFormModal({ cert, focus: "date", onSaved });
  });
  menu.querySelector('[data-act="delete"]').addEventListener("click", async () => {
    close();
    if (!confirmDialog(`「${cert.name}」を削除します。単元・学習記録もすべて削除され、元に戻せません。よろしいですか？`)) return;
    await deleteCert(cert.id);
    showToast("資格を削除しました");
    onDeleted?.(cert.id);
  });
}
