// ============================================================
// js/gemini.js
// AIコーチのロジック（ホームの「AIからのアドバイス」／「AI分析」画面）。
//
// 設計方針:
//   Gemini APIが未設定・エラーの場合でも、学習データそのものから
//   計算できるルールベースの分析（computeInsights）を必ず土台にする。
//   Gemini APIが使える場合は、その事実を自然な文章に言い換える
//   「仕上げ役」として利用する。こうすることで、モデル名の変更や
//   API側の一時的な不調でアプリの中核機能が止まらないようにしている。
// ============================================================

import { GEMINI_API_KEY, GEMINI_MODEL } from "../firebase/config.js";
import { formatMinutes, studyTypeLabel, currentWeekDates } from "./app.js";

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function isGeminiConfigured() {
  return Boolean(GEMINI_API_KEY) && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY";
}

async function callGemini(userText, systemInstruction, jsonMode = false) {
  const body = {
    contents: [{ role: "user", parts: [{ text: userText }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.7,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini APIエラー (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  if (!text) throw new Error("Gemini APIから応答が得られませんでした。");
  return text;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------
 * ルールベースの分析（Gemini APIなしで常に成立する土台）
 * ---------------------------------------------------------- */

/**
 * @param {Array} units 単元一覧（totalMinutes, byType, lastStudiedAt, progress, name を含む）
 * @param {Array} logs 学習記録一覧（date, minutes, type を含む）
 */
export function computeInsights(units, logs) {
  const insights = {
    staleUnit: null, // { name, days } | null
    dominantType: null, // { key, label, pct } | null
    trend: null, // { direction: "up"|"down"|"flat", thisWeek, lastWeek }
    recommendUnit: null, // { name, progress } | null
  };

  // 1. 学習の偏り：一番学習していない/放置されている単元
  if (units.length) {
    const now = Date.now();
    const withGap = units.map((u) => {
      const last = u.lastStudiedAt?.toDate ? u.lastStudiedAt.toDate() : null;
      const days = last ? Math.floor((now - last.getTime()) / 86400000) : Infinity;
      return { name: u.name, days };
    });
    withGap.sort((a, b) => b.days - a.days);
    if (withGap[0] && withGap[0].days > 2) {
      insights.staleUnit = withGap[0];
    }
  }

  // 2. 学習内容の偏り：種別ごとの合計時間から偏りを検出
  const typeTotals = {};
  logs.forEach((l) => {
    typeTotals[l.type] = (typeTotals[l.type] || 0) + (l.minutes || 0);
  });
  const totalAll = Object.values(typeTotals).reduce((s, v) => s + v, 0);
  if (totalAll > 0) {
    const [topKey, topVal] = Object.entries(typeTotals).sort((a, b) => b[1] - a[1])[0];
    const pct = Math.round((topVal / totalAll) * 100);
    if (pct >= 50) {
      insights.dominantType = { key: topKey, label: studyTypeLabel(topKey), pct };
    }
  }

  // 3. 学習時間の傾向：今週 vs 先週
  const weekDates = currentWeekDates();
  const lastWeekDates = weekDates.map((d) => {
    const dt = new Date(d + "T00:00:00");
    dt.setDate(dt.getDate() - 7);
    return dt.toISOString().slice(0, 10);
  });
  const sumFor = (dates) =>
    logs.filter((l) => dates.includes(l.date)).reduce((s, l) => s + (l.minutes || 0), 0);
  const thisWeek = sumFor(weekDates);
  const lastWeek = sumFor(lastWeekDates);
  let direction = "flat";
  if (thisWeek > lastWeek * 1.1) direction = "up";
  else if (thisWeek < lastWeek * 0.9 && lastWeek > 0) direction = "down";
  insights.trend = { direction, thisWeek, lastWeek };

  // 4. 次におすすめの単元：進捗率が最も低い単元
  if (units.length) {
    const lowest = [...units].sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0))[0];
    insights.recommendUnit = { name: lowest.name, progress: lowest.progress ?? 0 };
  }

  return insights;
}

/** ホーム画面の「AIからのアドバイス」用の短い箇条書きを作る */
export function fallbackAdviceBullets(insights) {
  const bullets = [];
  if (insights.staleUnit) {
    bullets.push(
      `最近「${insights.staleUnit.name}」を学習していません（${insights.staleUnit.days}日経過）`
    );
  }
  if (insights.dominantType) {
    bullets.push(`「${insights.dominantType.label}」の割合が${insights.dominantType.pct}%と高めです。他の学習方法も取り入れましょう`);
  }
  if (insights.trend?.direction === "down") {
    bullets.push("先週より学習時間が減っています。少しずつでも積み重ねましょう");
  } else if (insights.trend?.direction === "up") {
    bullets.push("先週より学習時間が増えています。この調子で続けましょう");
  }
  if (insights.recommendUnit && insights.recommendUnit.progress < 50) {
    bullets.push(`「${insights.recommendUnit.name}」の進捗がまだ低めです。次の学習候補にどうぞ`);
  }
  if (!bullets.length) {
    bullets.push("順調に学習が続いています。この調子で頑張りましょう");
  }
  return bullets.slice(0, 3);
}

/**
 * ホームの「AIからのアドバイス」を生成する。
 * Gemini APIが使える場合は自然な文章に言い換え、使えない場合はルールベースの箇条書きをそのまま返す。
 */
export async function generateAdvice(cert, units, logs) {
  const insights = computeInsights(units, logs);
  const bullets = fallbackAdviceBullets(insights);
  if (!isGeminiConfigured()) return bullets;

  try {
    const system = `あなたは資格試験の学習をサポートするAIコーチです。
以下の「事実」の配列を、利用者への前向きな一言アドバイスに書き直してください。
事実の意味を変えず、それぞれ40文字程度に整えてください。
出力は必ず文字列の配列のみのJSON形式で返してください（説明文は不要）。`;
    const text = await callGemini(JSON.stringify(bullets), system, true);
    const parsed = safeJsonParse(text);
    if (Array.isArray(parsed) && parsed.length) return parsed.slice(0, 3);
    return bullets;
  } catch (e) {
    console.warn("Geminiアドバイス生成に失敗。ルールベースの結果を使用します。", e);
    return bullets;
  }
}

/**
 * AI分析画面向けの詳細な分析を生成する。
 * 戻り値は常に4項目（偏り／学習不足／傾向／おすすめ）を含む。
 */
export async function generateAnalysis(cert, units, logs) {
  const insights = computeInsights(units, logs);

  const fallback = {
    imbalance: insights.dominantType
      ? `学習内容が「${insights.dominantType.label}」に偏っています（全体の${insights.dominantType.pct}%）。インプットと演習のバランスを見直しましょう。`
      : "学習内容の種類はバランス良く取り組めています。",
    weakUnit: insights.staleUnit
      ? `「${insights.staleUnit.name}」を${insights.staleUnit.days}日間学習していません。忘れる前に復習しておきましょう。`
      : "極端に放置されている単元はありません。",
    trend:
      insights.trend.direction === "up"
        ? `今週は${formatMinutes(insights.trend.thisWeek)}学習していて、先週（${formatMinutes(insights.trend.lastWeek)}）より増えています。良い流れです。`
        : insights.trend.direction === "down"
        ? `今週は${formatMinutes(insights.trend.thisWeek)}で、先週（${formatMinutes(insights.trend.lastWeek)}）より少なくなっています。無理のない範囲でペースを戻しましょう。`
        : `学習時間は先週と概ね同じペース（今週${formatMinutes(insights.trend.thisWeek)}）です。`,
    recommendation: insights.recommendUnit
      ? `次は「${insights.recommendUnit.name}」（進捗${insights.recommendUnit.progress}%）に取り組むのがおすすめです。`
      : "まずは単元を登録して学習を記録してみましょう。",
  };

  if (!isGeminiConfigured()) return fallback;

  try {
    const system = `あなたは資格試験の学習データを分析するAIコーチです。
以下のJSON（各項目は既に正しい分析結果です）を、利用者にとって読みやすい自然な文章に言い換えてください。
事実や数値は変えず、それぞれ80文字程度に整えてください。
出力は必ず次のJSON形式のみで返してください（説明文は不要）:
{"imbalance":"...","weakUnit":"...","trend":"...","recommendation":"..."}`;
    const text = await callGemini(JSON.stringify(fallback), system, true);
    const parsed = safeJsonParse(text);
    if (parsed && parsed.imbalance) return parsed;
    return fallback;
  } catch (e) {
    console.warn("Gemini分析生成に失敗。ルールベースの結果を使用します。", e);
    return fallback;
  }
}
