const crypto = require('crypto');
const { collection, docRef, parseDoc, parseDocs, now, counter, admin } = require('./_base.cjs');

const COL = 'lesson_progress';

function _docId(userId, lessonId) {
  return `${String(userId)}_${String(lessonId)}`;
}

function _coerceInt(v) {
  if (v == null) return v;
  const n = Number(v);
  return Number.isFinite(n) && String(v).match(/^-?\d+$/) ? n : v;
}

async function saveLessonProgress(userId, lessonId, data = {}) {
  if (!userId || !lessonId) throw new Error('saveLessonProgress: userId e lessonId obrigatórios');
  const id = _docId(userId, lessonId);
  const ref = docRef(COL, id);
  const uidC = _coerceInt(userId);
  const lidC = _coerceInt(lessonId);
  const nowIso = new Date().toISOString();
  const snap = await ref.get();
  const existing = snap.exists;
  const payload = { ...data };
  delete payload.id;
  payload.user_id = uidC;
  payload.lesson_id = lidC;
  if (!existing) {
    payload.status = payload.status || 'IN_PROGRESS';
    payload.progress = typeof payload.progress === 'number' ? payload.progress : 0;
    payload.started_at = payload.started_at || now();
    payload.created_at = payload.created_at || now();
  } else {
    if (payload.status === 'COMPLETED' && !snap.data().completed_at) {
      payload.completed_at = now();
    }
  }
  payload.updated_at = now();
  payload.last_accessed_at = now();
  await ref.set(payload, { merge: true });
  return getLessonProgress(userId, lessonId);
}

async function getProgress(userId) {
  if (!userId) return [];
  const uidC = _coerceInt(userId);
  const q = collection(COL).where('user_id', '==', uidC).orderBy('updated_at', 'desc');
  try {
    return await parseDocs(q);
  } catch {
    const all = await parseDocs(collection(COL));
    return all.filter((p) => String(p.user_id) === String(userId));
  }
}

async function getLessonProgress(userId, lessonId) {
  if (!userId || !lessonId) return null;
  const id = _docId(userId, lessonId);
  return parseDoc(await docRef(COL, id).get());
}

async function getProgressById(progressId) {
  if (!progressId) return null;
  return parseDoc(await docRef(COL, String(progressId)).get());
}

async function patchProgressById(progressId, patch = {}) {
  if (!progressId) throw new Error('patchProgressById: id obrigatório');
  const ref = docRef(COL, String(progressId));
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = { ...patch };
  delete data.id;
  delete data.user_id;
  delete data.lesson_id;
  if (data.status === 'COMPLETED' && !snap.data().completed_at) {
    data.completed_at = now();
  }
  data.updated_at = now();
  data.last_accessed_at = now();
  await ref.update(data);
  return parseDoc(await ref.get());
}

async function deleteProgressById(progressId) {
  if (!progressId) return false;
  await docRef(COL, String(progressId)).delete();
  return true;
}

async function countCompletedLessons(userId) {
  const all = await getProgress(userId);
  return all.filter((p) => p.status === 'COMPLETED').length;
}

module.exports = {
  saveLessonProgress,
  getProgress,
  getLessonProgress,
  getProgressById,
  patchProgressById,
  deleteProgressById,
  countCompletedLessons,
};
