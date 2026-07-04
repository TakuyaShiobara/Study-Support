// ============================================================
// js/app.js
// 全ページで共通して使うユーティリティ群。
//   - ダークモード切替
//   - Service Worker登録（PWA）
//   - 日付・時間まわりのヘルパー
//   - トースト通知 / 簡易確認ダイアログ
//   - サイドバードロワー（ハンバーガーメニュー）
//   - アクティブな資格（cert）の管理
// ============================================================

const THEME_KEY = "sc_theme"; // "light" | "dark" | "system"
const ACTIVE_CERT_KEY = "sc_active_cert_id";

/* ---------------- テーマ ---------------- */

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "system";
  applyTheme(saved);
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if ((localStorage.getItem(THEME_KEY) || "system") === "system") {
        applyTheme("system");
      }
    });
}

function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", mode);
  }
}

export function getThemeMode() {
  return localStorage.getItem(THEME_KEY) || "system";
}

export function setThemeMode(mode) {
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  setThemeMode(next);
  return next;
}

/* ---------------- Service Worker ---------------- */

export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./service-worker.js")
        .catch((err) => console.warn("Service Worker登録失敗:", err));
    });
  }
}

/* ---------------- 日付・時間ヘルパー ---------------- */

export function todayStr() {
  return dateToStr(new Date());
}

export function dateToStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date(todayStr() + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

export function formatDateJP(dateStr) {
  if (!dateStr) return "未設定";
  const d = new Date(dateStr + "T00:00:00");
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${w})`;
}

export function formatDateShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 直近N日分の日付文字列を古い→新しい順で返す（今日を含む） */
export function lastNDays(n) {
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(dateToStr(d));
  }
  return arr;
}

/** 今週（月曜始まり）の日付文字列一覧を返す */
export function currentWeekDates() {
  const now = new Date();
  const day = now.getDay(); // 0=日
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const arr = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    arr.push(dateToStr(d));
  }
  return arr;
}

export function currentMonthPrefix() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 分を「○時間○分」形式に整形する */
export function formatMinutes(min) {
  const m = Math.max(0, Math.round(min || 0));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}分`;
  if (rest === 0) return `${h}時間`;
  return `${h}時間${rest}分`;
}

export function formatTimestampJP(ts) {
  if (!ts) return "未学習";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d)) return "未学習";
  return formatDateJP(dateToStr(d));
}

/* ---------------- トースト通知 ---------------- */

let toastTimer = null;
export function showToast(message) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add("is-visible"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2400);
}

/** シンプルな確認ダイアログ（ブラウザ標準のconfirmをラップ。将来カスタムUIに差し替えやすいように分離） */
export function confirmDialog(message) {
  return window.confirm(message);
}

/* ---------------- アクティブな資格（cert）管理 ----------------
 * 複数端末での同期は考慮せず、この端末で最後に開いた資格をlocalStorageに保持する。
 */

export function getActiveCertId() {
  return localStorage.getItem(ACTIVE_CERT_KEY) || "";
}

export function setActiveCertId(certId) {
  localStorage.setItem(ACTIVE_CERT_KEY, certId || "");
}

/* ---------------- HTMLエスケープ ---------------- */

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ---------------- アイコン素材 ---------------- */

export const ICONS = {
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16"/><rect x="6" y="11" width="3" height="6"/><rect x="10.5" y="7" width="3" height="10"/><rect x="15" y="4" width="3" height="13"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>`,
  help: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3 2.45c-.7.2-1 .75-1 1.55"/><path d="M12 17h.01"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  dots: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="18" r="1.2"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>`,
  questionCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3 2.45c-.7.2-1 .75-1 1.55"/><path d="M12 17h.01"/></svg>`,
  rotate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 2h6v3H9z"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m10 9 5 3-5 3Z"/></svg>`,
  dotsHorizontal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5Z"/></svg>`,
  database: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>`,
  wifi: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.5a16 16 0 0 1 20 0"/><path d="M5 12.5a11 11 0 0 1 14 0"/><path d="M8.5 16.5a6 6 0 0 1 7 0"/><path d="M12 20h.01"/></svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 8-4 4 4 4"/><path d="m15 8 4 4-4 4"/></svg>`,
  cloudCheck: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a5 5 0 1 1 1.3-9.8A6 6 0 0 1 22 12.5 3.5 3.5 0 0 1 17.5 19Z"/><path d="m9 12 2 2 4-4"/></svg>`,
  wifiOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M8.5 16.5a6 6 0 0 1 7 0"/><path d="M5 12.5a11 11 0 0 1 5-2.7M19 12.5a11 11 0 0 0-2.5-2"/><path d="M2 8.5a16 16 0 0 1 5-2.7M17 5.8a16 16 0 0 1 5 2.7"/><path d="M12 20h.01"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>`,
  trend: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>`,
  scale: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 8l-4 6h8l-4-6ZM17 8l-4 6h8l-4-6Z"/></svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
};

// 資格アイコン・単元バッジに使う色付きアイコンのローテーション
export const BADGE_PALETTE = [
  { icon: ICONS.shield, color: "#ec4899" },
  { icon: ICONS.database, color: "#3557e8" },
  { icon: ICONS.wifi, color: "#f59e0b" },
  { icon: ICONS.code, color: "#22c55e" },
  { icon: ICONS.gear, color: "#8b5cf6" },
  { icon: ICONS.layers, color: "#06b6d4" },
];
export function badgeFor(index) {
  return BADGE_PALETTE[index % BADGE_PALETTE.length];
}

/* ---------------- 学習内容タイプ定義 ---------------- */

export const STUDY_TYPES = [
  { key: "input", label: "インプット", icon: ICONS.book },
  { key: "practice", label: "問題演習", icon: ICONS.questionCircle },
  { key: "mock", label: "模試", icon: ICONS.clipboard },
  { key: "review", label: "復習", icon: ICONS.rotate },
  { key: "video", label: "動画視聴", icon: ICONS.play },
  { key: "other", label: "その他", icon: ICONS.dotsHorizontal },
];
export const STUDY_TYPE_COLORS = {
  input: "#3557e8",
  practice: "#22c55e",
  mock: "#f59e0b",
  review: "#8b5cf6",
  video: "#06b6d4",
  other: "#9c9ca3",
};
export function studyTypeLabel(key) {
  return STUDY_TYPES.find((t) => t.key === key)?.label || "その他";
}

/* ---------------- トップバー・サイドバー共通マウント ---------------- */

// 画面下部の固定タブバーに表示する主要5画面
const TAB_ITEMS = [
  { page: "home", label: "ホーム", href: "#/home", icon: ICONS.home },
  { page: "record", label: "学習記録", href: "#/record", icon: ICONS.edit },
  { page: "units", label: "単元管理", href: "#/units", icon: ICONS.layers },
  { page: "report", label: "レポート", href: "#/report", icon: ICONS.chart },
  { page: "ai", label: "AI分析", href: "#/ai", icon: ICONS.sparkle },
];

// サイドバードロワーに表示するメニュー（主要5画面はタブバー側にあるため、ここには含めない）
const DRAWER_NAV_ITEMS = [
  { page: "settings", label: "設定", href: "#/settings", icon: ICONS.gear },
  { page: "help", label: "ヘルプ・使い方", href: "#/help", icon: ICONS.help },
];

/**
 * サイドバードロワーと開閉トリガーをbodyに挿入する。
 * ページ側は topbar 内に id="menu-btn" のボタンを用意しておくこと。
 * @param {string} activePage 現在のページキー（NAV_ITEMSのpageと一致させる）
 * @param {{certs: Array, activeCertId: string, onSwitchCert: Function, onAddCert: Function, onCertMenu: Function}} opts
 */
let currentDrawerOpen = null;
let menuBtnDelegationBound = false;

export function mountDrawer(activePage, opts = {}) {
  // 資格一覧のキャッシュ表示→最新データでの再描画のため、複数回呼ばれることがある。
  // 既存の要素があれば一旦削除してから作り直す（開いていた場合は開いた状態を維持する）。
  const wasOpen = document.getElementById("drawer")?.classList.contains("is-open") || false;
  document.getElementById("drawer-overlay")?.remove();
  document.getElementById("drawer")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "drawer-overlay";
  overlay.id = "drawer-overlay";

  const drawer = document.createElement("div");
  drawer.className = "drawer";
  drawer.id = "drawer";

  const certs = opts.certs || [];
  const activeCertId = opts.activeCertId || "";

  drawer.innerHTML = `
    <div class="drawer__brand">${ICONS.sparkle}<span>AI資格コーチ</span></div>
    <div class="drawer__scroll">
      <div class="drawer__label">資格</div>
      <div id="drawer-cert-list">
        ${certs
          .map((c, i) => {
            const badge = badgeFor(i);
            return `
            <div class="cert-row ${c.id === activeCertId ? "is-active" : ""}" data-cert-id="${c.id}">
              <div class="cert-row__icon" style="background:${badge.color}">${badge.icon}</div>
              <div class="cert-row__body">
                <div class="cert-row__name">${escapeHtml(c.name || "無題の資格")}</div>
                <div class="cert-row__date">試験日: ${c.examDate ? formatDateShort(c.examDate) : "未設定"}</div>
              </div>
              <button class="cert-row__menu-btn" data-cert-menu-id="${c.id}" aria-label="資格メニュー">${ICONS.dots}</button>
            </div>`;
          })
          .join("")}
      </div>
      <div class="add-cert-row" id="drawer-add-cert">${ICONS.plus}<span>資格を追加</span></div>
      <div class="drawer__divider"></div>
      <div class="drawer__label">メニュー</div>
      ${DRAWER_NAV_ITEMS.map(
        (item) => `
        <a class="nav-link ${item.page === activePage ? "is-active" : ""}" data-page="${item.page}" href="${item.href}">
          ${item.icon}<span>${item.label}</span>
        </a>`
      ).join("")}
    </div>
    <div class="drawer__footer">
      <div class="sync-box" id="sync-box">
        <div class="sync-box__icon">${ICONS.cloudCheck}</div>
        <div class="sync-box__text">
          <div class="sync-box__title">データ同期</div>
          <div class="sync-box__sub" id="sync-box-sub">最新の状態です</div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  const open = () => {
    overlay.classList.add("is-open");
    drawer.classList.add("is-open");
  };
  const close = () => {
    overlay.classList.remove("is-open");
    drawer.classList.remove("is-open");
  };
  overlay.addEventListener("click", close);

  // SPAではビューのHTML（#menu-btnを含む）がmountDrawerより後に挿入されることがあるため、
  // document全体へのイベント委任で拾う（menu-btnが後から生成されても機能する）。
  currentDrawerOpen = open;
  if (!menuBtnDelegationBound) {
    document.addEventListener("click", (e) => {
      if (e.target.closest("#menu-btn")) currentDrawerOpen?.();
    });
    menuBtnDelegationBound = true;
  }

  drawer.querySelectorAll(".cert-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".cert-row__menu-btn")) return;
      const id = row.dataset.certId;
      opts.onSwitchCert?.(id);
    });
  });
  drawer.querySelectorAll("[data-cert-menu-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      opts.onCertMenu?.(btn.dataset.certMenuId, btn);
    });
  });
  document.getElementById("drawer-add-cert").addEventListener("click", () => {
    close();
    opts.onAddCert?.();
  });
  drawer.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => close());
  });

  updateSyncBox();
  window.addEventListener("online", updateSyncBox);
  window.addEventListener("offline", updateSyncBox);

  if (wasOpen) open();

  return { open, close };
}

function updateSyncBox() {
  const box = document.getElementById("sync-box");
  const sub = document.getElementById("sync-box-sub");
  if (!box || !sub) return;
  if (navigator.onLine) {
    box.classList.remove("is-offline");
    box.querySelector(".sync-box__icon").innerHTML = ICONS.cloudCheck;
    box.querySelector(".sync-box__title").textContent = "データ同期";
    sub.textContent = `最終取得: ${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
  } else {
    box.classList.add("is-offline");
    box.querySelector(".sync-box__icon").innerHTML = ICONS.wifiOff;
    box.querySelector(".sync-box__title").textContent = "オフライン";
    sub.textContent = "通信が復旧すると同期されます";
  }
}

/** ページ下部に固定タブバーを挿入する。主要5画面（ホーム・学習記録・単元管理・レポート・AI分析）用。 */
export function mountTabbar(activePage) {
  const bar = document.createElement("div");
  bar.className = "tabbar";
  bar.innerHTML = `
    <div class="tabbar__inner">
      ${TAB_ITEMS.map(
        (item) => `
        <a href="${item.href}" class="tab-link ${item.page === activePage ? "is-active" : ""}" data-page="${item.page}">
          ${item.icon}<span>${item.label}</span>
        </a>`
      ).join("")}
    </div>`;
  document.body.appendChild(bar);

  // 実際のページ遷移（読み込み）を待たず、タップした瞬間に見た目だけ先に切り替える。
  // ページ遷移自体の速度は変わらないが、体感の反応速度が上がる。
  bar.querySelectorAll(".tab-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (link.classList.contains("is-active")) return;
      bar.querySelectorAll(".tab-link").forEach((l) => l.classList.remove("is-active"));
      link.classList.add("is-active");
    });
  });
}

/** ルート変更時に、タブバー・ドロワー両方のアクティブ表示を更新する（SPAルーター用） */
export function setActiveNav(pageName) {
  document.querySelectorAll(".tab-link").forEach((a) => {
    a.classList.toggle("is-active", a.dataset.page === pageName);
  });
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("is-active", a.dataset.page === pageName);
  });
}

export function themeToggleButtonHtml() {
  return `<button class="icon-btn" id="theme-toggle-btn" aria-label="テーマ切替">${ICONS.moon}</button>`;
}
export function bindThemeToggleButton() {
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) btn.addEventListener("click", () => toggleTheme());
}

/* ---------------- キーボード表示時の見切れ対策 ----------------
 * iOSでは、フォームにフォーカスするとキーボードが画面下から出るが、
 * モーダルシートなど position:fixed の要素はキーボードの下に隠れて
 * しまうことがある。visualViewport APIでキーボードの高さを検知し、
 * CSS変数 --keyboard-inset に反映することで、CSS側でずらせるようにする。
 * また、フォーカスした入力欄が画面外に隠れないよう自動でスクロールする。
 */
export function setupKeyboardAvoidance() {
  if (window.visualViewport) {
    const vv = window.visualViewport;
    const adjust = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
    };
    vv.addEventListener("resize", adjust);
    vv.addEventListener("scroll", adjust);
    adjust();
  }

  document.addEventListener(
    "focusin",
    (e) => {
      const el = e.target;
      if (!el.matches("input, textarea, select")) return;
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    },
    true
  );
}

/* ---------------- 致命的エラーの可視化 ----------------
 * どこかで例外が発生してページが固まった場合に、原因を画面に
 * そのまま表示する。「読み込み中のまま」になる問題の切り分け用。
 */
export function showFatalError(err) {
  console.error(err);
  const pre = document.createElement("pre");
  pre.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:#fff;color:#c0392b;" +
    "padding:16px;font-size:12px;white-space:pre-wrap;overflow:auto;margin:0;" +
    "font-family:monospace;line-height:1.6;";
  const message = err?.stack || err?.message || String(err);
  pre.textContent = "エラーが発生しました:\n\n" + message;
  document.body.appendChild(pre);
}

/** 指定ミリ秒でタイムアウトするPromiseラッパー。Firestore呼び出しが固まった場合の保険。 */
export function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`タイムアウト: ${label || "処理"}が${ms}ms以内に完了しませんでした（通信環境やFirebase設定をご確認ください）`)), ms)
    ),
  ]);
}
