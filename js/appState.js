// ============================================================
// js/appState.js
// SPA化にともなうアプリ全体の状態管理。
//
//   - 資格（cert）一覧・アクティブな資格をメモリ上に保持し、
//     ページ遷移（ハッシュルーティング）のたびにFirestoreへ
//     再アクセスしないようにする（これが体感速度改善の本体）。
//   - サイドバードロワー・下部タブバーはアプリ起動時に1回だけ
//     マウントする。
// ============================================================

import { listCerts } from "./firestore.js";
import {
  initTheme,
  registerServiceWorker,
  setupKeyboardAvoidance,
  getActiveCertId,
  setActiveCertId,
  mountDrawer,
  mountTabbar,
  withTimeout,
} from "./app.js";
import { openCertFormModal, openCertContextMenu } from "./certUi.js";

const CERTS_CACHE_KEY = "sc_certs_cache";

let certsState = [];
let activeCertIdState = "";
let currentPage = "home";

/* ---------------- localStorageキャッシュ ---------------- */

function readCertsCache() {
  try {
    const raw = localStorage.getItem(CERTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCertsCache(certs) {
  try {
    const minimal = certs.map((c) => ({
      id: c.id,
      name: c.name,
      examDate: c.examDate,
      dailyGoalMinutes: c.dailyGoalMinutes,
      weeklyGoalMinutes: c.weeklyGoalMinutes,
    }));
    localStorage.setItem(CERTS_CACHE_KEY, JSON.stringify(minimal));
  } catch {
    /* 保存できなくても致命的ではないので無視 */
  }
}

/* ---------------- 状態の参照 ---------------- */

export function getCerts() {
  return certsState;
}
export function getActiveCert() {
  return certsState.find((c) => c.id === activeCertIdState) || null;
}
export function getActiveCertIdValue() {
  return activeCertIdState;
}

function resolveActiveCert() {
  let id = getActiveCertId();
  if (!certsState.some((c) => c.id === id)) {
    id = certsState[0]?.id || "";
  }
  activeCertIdState = id;
  setActiveCertId(id);
}

/* ---------------- アプリ起動（1回だけ実行） ---------------- */

/**
 * アプリ全体を1回だけ初期化する。ドロワー・タブバーのマウントもここで行う。
 * @param {string} initialPage 起動直後に表示するページキー
 */
export async function bootstrapApp(initialPage) {
  currentPage = initialPage;
  initTheme();
  registerServiceWorker();
  setupKeyboardAvoidance();

  mountTabbar(initialPage);

  const cached = readCertsCache();
  if (cached) {
    certsState = cached;
    resolveActiveCert();
    renderDrawer();
  }

  try {
    certsState = await withTimeout(listCerts(), 10000, "資格一覧の取得");
    writeCertsCache(certsState);
  } catch (e) {
    if (!cached) throw e;
    console.warn("資格一覧の取得に失敗。キャッシュを使用します。", e);
  }
  resolveActiveCert();
  renderDrawer();
}

/** Firestoreから資格一覧を再取得し、ドロワーを更新する（追加・編集・削除後に呼ぶ） */
export async function refreshCerts() {
  certsState = await listCerts();
  writeCertsCache(certsState);
  resolveActiveCert();
  renderDrawer();
  return certsState;
}

export function switchActiveCert(id) {
  activeCertIdState = id;
  setActiveCertId(id);
  renderDrawer();
}

/** ルーターから、現在表示中のページキーを伝える（ドロワー再描画時のハイライトに使う） */
export function setCurrentPage(pageName) {
  currentPage = pageName;
}

function renderDrawer() {
  mountDrawer(currentPage, {
    certs: certsState,
    activeCertId: activeCertIdState,
    onSwitchCert: (id) => {
      switchActiveCert(id);
      goHomeAndRerender();
    },
    onAddCert: () => {
      openCertFormModal({
        onSaved: async (id) => {
          await refreshCerts();
          switchActiveCert(id);
          goHomeAndRerender();
        },
      });
    },
    onCertMenu: (id, btn) => {
      const cert = certsState.find((c) => c.id === id);
      if (!cert) return;
      openCertContextMenu(cert, btn, {
        onSaved: async () => {
          await refreshCerts();
          rerenderCurrentRoute();
        },
        onDeleted: async (deletedId) => {
          if (deletedId === activeCertIdState) switchActiveCert("");
          await refreshCerts();
          goHomeAndRerender();
        },
      });
    },
  });
}

/** ホームへ移動し、既に#/homeにいる場合も強制的に再描画する */
function goHomeAndRerender() {
  if (location.hash === "#/home") {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    location.hash = "#/home";
  }
}

/** 現在のルートを強制的に再描画する（データ更新後の反映用） */
function rerenderCurrentRoute() {
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
