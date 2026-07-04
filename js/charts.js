// ============================================================
// js/charts.js
// 外部ライブラリを使わない、軽量なバーチャート／ドーナツチャート描画。
// ============================================================

import { escapeHtml } from "./app.js";

/**
 * 棒グラフを描画する（例: 日別学習時間の推移）。
 * @param {HTMLElement} container
 * @param {{labels:string[], values:number[], valueFormatter?:(v:number)=>string, todayIndex?:number}} opts
 */
export function renderBarChart(container, { labels, values, valueFormatter, todayIndex }) {
  const max = Math.max(1, ...values);
  const fmt = valueFormatter || ((v) => String(v));

  container.innerHTML = `
    <div class="bar-chart">
      ${values
        .map((v, i) => {
          const heightPct = Math.max(2, Math.round((v / max) * 100));
          return `
          <div class="bar-chart__col">
            <div class="bar-chart__bar-wrap">
              <div class="bar-chart__bar ${i === todayIndex ? "is-today" : ""}" style="height:${heightPct}%;">
                ${v > 0 ? `<span class="bar-chart__value">${escapeHtml(fmt(v))}</span>` : ""}
              </div>
            </div>
            <div class="bar-chart__label">${escapeHtml(labels[i])}</div>
          </div>`;
        })
        .join("")}
    </div>`;
}

/**
 * ドーナツチャートを描画する（例: 学習内容の種別割合）。
 * @param {HTMLElement} container
 * @param {{segments:{label:string, value:number, color:string}[], centerValue:string, centerLabel:string}} opts
 */
export function renderDonutChart(container, { segments, centerValue, centerLabel }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  if (total <= 0) {
    container.innerHTML = `<p style="font-size:13px; color:var(--text-tertiary); padding:8px 0;">まだ学習記録がありません。</p>`;
    return;
  }

  let acc = 0;
  const stops = segments
    .filter((seg) => seg.value > 0)
    .map((seg) => {
      const start = (acc / total) * 360;
      acc += seg.value;
      const end = (acc / total) * 360;
      return `${seg.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  container.innerHTML = `
    <div class="donut-wrap">
      <div class="donut" style="background: conic-gradient(${stops});">
        <div class="donut__center">
          <div class="donut__center-value">${escapeHtml(centerValue)}</div>
          <div class="donut__center-label">${escapeHtml(centerLabel)}</div>
        </div>
      </div>
      <div class="legend">
        ${segments
          .map((seg) => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return `
            <div class="legend-row">
              <span class="legend-dot" style="background:${seg.color}"></span>
              <span class="legend-row__name">${escapeHtml(seg.label)}</span>
              <span class="legend-row__pct">${pct}%</span>
            </div>`;
          })
          .join("")}
      </div>
    </div>`;
}
