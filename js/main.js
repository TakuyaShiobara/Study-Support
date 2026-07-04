// ============================================================
// js/main.js
// SPAのエントリーポイント兼ルーター。
// URLのハッシュ（#/home, #/record?... など）に応じて、
// #app-root の中身だけを差し替える。ページ全体の再読み込みが
// 発生しないため、タブ・メニューの切り替えが高速になる。
// ============================================================

import { showFatalError, setActiveNav } from "./app.js";
import { bootstrapApp, setCurrentPage } from "./appState.js";

import * as HomeView from "./views/home.js";
import * as RecordView from "./views/record.js";
import * as UnitsView from "./views/units.js";
import * as UnitDetailView from "./views/unit-detail.js";
import * as ReportView from "./views/report.js";
import * as AiAnalysisView from "./views/ai-analysis.js";
import * as SettingsView from "./views/settings.js";
import * as HelpView from "./views/help.js";

// ルートパス -> { view, navPage(タブ/ドロワーのハイライト用キー) }
const ROUTES = {
  home: { view: HomeView, navPage: "home" },
  record: { view: RecordView, navPage: "record" },
  units: { view: UnitsView, navPage: "units" },
  unit: { view: UnitDetailView, navPage: "units" },
  report: { view: ReportView, navPage: "report" },
  ai: { view: AiAnalysisView, navPage: "ai" },
  settings: { view: SettingsView, navPage: "settings" },
  help: { view: HelpView, navPage: "help" },
};

function parseHash() {
  // "#/units?id=xxx" -> { path: "units", params: URLSearchParams }
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, queryStr] = raw.split("?");
  return {
    path: path || "home",
    params: new URLSearchParams(queryStr || ""),
  };
}

let renderToken = 0;

async function renderRoute() {
  const { path, params } = parseHash();
  const route = ROUTES[path] || ROUTES.home;
  const myToken = ++renderToken;

  const root = document.getElementById("app-root");
  root.innerHTML = route.view.template();
  setActiveNav(route.navPage);
  setCurrentPage(route.navPage);

  try {
    await route.view.init(params);
  } catch (e) {
    // 途中で別の画面に移動していた場合は、古い描画のエラーを表示しない
    if (myToken === renderToken) showFatalError(e);
  }
}

window.addEventListener("hashchange", () => {
  renderRoute().catch(showFatalError);
});

async function boot() {
  const { path } = parseHash();
  const initialNavPage = (ROUTES[path] || ROUTES.home).navPage;
  await bootstrapApp(initialNavPage);
  await renderRoute();
}

boot().catch(showFatalError);
