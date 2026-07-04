// ============================================================
// js/firestore.js
// Firestoreへの読み書きをまとめたデータアクセス層。
// 認証は使わず、ユーザーは固定で "me" とする。
//
// コレクション構成:
//   users/me/certs/{certId}                        … 資格（試験名・試験日・目標学習時間）
//   users/me/certs/{certId}/units/{unitId}          … 単元（進捗率・メモ・学習時間集計）
//   users/me/certs/{certId}/logs/{logId}            … 学習記録（1回分の学習ログ）
// ============================================================

import {
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  writeBatch,
  increment,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, USER_ID } from "../firebase/config.js";

const certsCol = () => collection(db, "users", USER_ID, "certs");
const certDocRef = (certId) => doc(db, "users", USER_ID, "certs", certId);
const unitsCol = (certId) => collection(db, "users", USER_ID, "certs", certId, "units");
const unitDocRef = (certId, unitId) => doc(db, "users", USER_ID, "certs", certId, "units", unitId);
const logsCol = (certId) => collection(db, "users", USER_ID, "certs", certId, "logs");
const logDocRef = (certId, logId) => doc(db, "users", USER_ID, "certs", certId, "logs", logId);

const EMPTY_BY_TYPE = { input: 0, practice: 0, mock: 0, review: 0, video: 0, other: 0 };

/* ================= 資格（Certs） ================= */

/** 登録済みの資格一覧を作成日順で取得する */
export async function listCerts() {
  const q = query(certsCol(), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  return list;
}

export async function getCert(certId) {
  if (!certId) return null;
  const snap = await getDoc(certDocRef(certId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** 資格を新規追加する。戻り値は新しいcertId */
export async function addCert({ name, examDate }) {
  const ref = await addDoc(certsCol(), {
    name: name || "無題の資格",
    examDate: examDate || "",
    dailyGoalMinutes: 90,
    weeklyGoalMinutes: 600,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCert(certId, data) {
  await updateDoc(certDocRef(certId), { ...data, updatedAt: serverTimestamp() });
}

/** 資格を削除する（配下の単元・学習記録も含めてすべて削除） */
export async function deleteCert(certId) {
  const [unitsSnap, logsSnap] = await Promise.all([
    getDocs(unitsCol(certId)),
    getDocs(logsCol(certId)),
  ]);
  const batch = writeBatch(db);
  unitsSnap.forEach((d) => batch.delete(d.ref));
  logsSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(certDocRef(certId));
  await batch.commit();
}

/* ================= 単元（Units） ================= */

export async function listUnits(certId) {
  const q = query(unitsCol(certId), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  return list;
}

export async function getUnit(certId, unitId) {
  const snap = await getDoc(unitDocRef(certId, unitId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** 単元を新規追加する。戻り値は新しいunitId */
export async function addUnit(certId, { name, memo }) {
  const ref = await addDoc(unitsCol(certId), {
    name: name || "無題の単元",
    memo: memo || "",
    progress: 0,
    totalMinutes: 0,
    sessionCount: 0,
    byType: { ...EMPTY_BY_TYPE },
    lastStudiedAt: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateUnit(certId, unitId, data) {
  await updateDoc(unitDocRef(certId, unitId), data);
}

/** 単元を削除する（配下の学習記録も削除） */
export async function deleteUnit(certId, unitId) {
  const logsSnap = await getDocs(logsCol(certId));
  const batch = writeBatch(db);
  logsSnap.forEach((d) => {
    if (d.data().unitId === unitId) batch.delete(d.ref);
  });
  batch.delete(unitDocRef(certId, unitId));
  await batch.commit();
}

/* ================= 学習記録（Logs） ================= */

/** 学習記録を全件取得する（日付降順ではなくcreatedAt降順） */
export async function listLogs(certId) {
  const q = query(logsCol(certId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  return list;
}

/**
 * 学習記録を1件保存し、対応する単元の集計（総学習時間・回数・種別内訳・最終学習日）を更新する。
 */
export async function addLog(certId, { date, unitId, unitName, type, minutes, memo }) {
  await addDoc(logsCol(certId), {
    date,
    unitId,
    unitName,
    type,
    minutes,
    memo: memo || "",
    createdAt: serverTimestamp(),
  });

  await updateDoc(unitDocRef(certId, unitId), {
    totalMinutes: increment(minutes),
    sessionCount: increment(1),
    [`byType.${type}`]: increment(minutes),
    lastStudiedAt: serverTimestamp(),
  });
}

export async function deleteLog(certId, logId) {
  await deleteDoc(logDocRef(certId, logId));
}
