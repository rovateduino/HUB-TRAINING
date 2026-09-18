const crypto = require('crypto');
const { collection, docRef, parseDoc, parseDocs, now, batch, admin } = require('./_base.cjs');

const COL_MODULES = 'training_modules';
const COL_LESSONS = 'training_lessons';

function _normStr(v) { return v == null ? v : String(v).trim(); }

async function listModules() {
  const q = collection(COL_MODULES).orderBy('order_num', 'asc');
  return parseDocs(q);
}

async function getModuleById(id) {
  if (!id) return null;
  return parseDoc(await docRef(COL_MODULES, String(id)).get());
}

async function listLessonsByModule(moduleId) {
  if (!moduleId) return [];
  const key = _coerceIntOrString(moduleId);
  try {
    const q = collection(COL_LESSONS)
      .where('module_id', '==', key)
      .orderBy('order_num', 'asc');
    return await parseDocs(q);
  } catch {
    // Fallback sem índice composto: filtro simples + ordenação client-side
    const rows = await parseDocs(collection(COL_LESSONS).where('module_id', '==', key));
    const mine = rows.filter((l) => String(l.module_id) === String(moduleId));
    mine.sort((a, b) => (Number(a.order_num) || 0) - (Number(b.order_num) || 0));
    return mine;
  }
}

async function getLessonById(id) {
  if (!id) return null;
  return parseDoc(await docRef(COL_LESSONS, String(id)).get());
}

async function getAllLessons() {
  const q = collection(COL_LESSONS).orderBy('order_num', 'asc');
  return parseDocs(q);
}

async function updateModuleDescription(id, newDesc) {
  if (!id) throw new Error('updateModuleDescription: id obrigatório');
  const ref = docRef(COL_MODULES, String(id));
  const patch = { description: _normStr(newDesc), updated_at: now() };
  await ref.update(patch);
  return getModuleById(id);
}

async function appendLessonContent(id, htmlAppend, markerComment) {
  if (!id) throw new Error('appendLessonContent: id obrigatório');
  if (!markerComment) throw new Error('appendLessonContent: markerComment obrigatório para idempotência');
  const ref = docRef(COL_LESSONS, String(id));
  try {
    return await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { skipped: true, reason: 'lesson_not_found' };
      const data = snap.data() || {};
      const current = String(data.content || '');
      if (current.includes(markerComment)) {
        return { skipped: true, reason: 'marker_already_present' };
      }
      const concat = (current ? current + '\n\n' : '') + markerComment + '\n' + String(htmlAppend || '');
      tx.update(ref, { content: concat, updated_at: now() });
      return { skipped: false, appended: true };
    });
  } catch (e) {
    if (e && /no entity to update/i.test(e.message)) {
      const snap = await ref.get();
      if (!snap.exists) return { skipped: true, reason: 'lesson_not_found' };
      const data = snap.data() || {};
      const current = String(data.content || '');
      if (current.includes(markerComment)) return { skipped: true, reason: 'marker_already_present' };
      const concat = (current ? current + '\n\n' : '') + markerComment + '\n' + String(htmlAppend || '');
      await ref.update({ content: concat, updated_at: now() });
      return { skipped: false, appended: true };
    }
    throw e;
  }
}

async function createModule(data) {
  const payload = { ...data };
  const id = payload.id || crypto.randomUUID().replace(/-/g, '');
  delete payload.id;
  if (typeof payload.order_num === 'undefined') payload.order_num = 0;
  if (typeof payload.status === 'undefined') payload.status = 'PENDING_TECHNICAL_VALIDATION';
  payload.created_at = payload.created_at || now();
  payload.updated_at = now();
  if (payload.title) payload.title = _normStr(payload.title);
  if (payload.description) payload.description = _normStr(payload.description);
  const ref = docRef(COL_MODULES, String(id));
  await ref.set(payload);
  return getModuleById(id);
}

async function updateModule(id, patch) {
  if (!id) throw new Error('updateModule: id obrigatório');
  const ref = docRef(COL_MODULES, String(id));
  const data = { ...patch };
  delete data.id;
  data.updated_at = now();
  await ref.update(data);
  return getModuleById(id);
}

async function deleteModule(id) {
  if (!id) return false;
  await docRef(COL_MODULES, String(id)).delete();
  return true;
}

async function createLesson(data) {
  const payload = { ...data };
  const id = payload.id || crypto.randomUUID().replace(/-/g, '');
  delete payload.id;
  if (typeof payload.order_num === 'undefined') payload.order_num = 0;
  if (typeof payload.status === 'undefined') payload.status = 'PENDING_TECHNICAL_VALIDATION';
  payload.created_at = payload.created_at || now();
  payload.updated_at = now();
  if (payload.title) payload.title = _normStr(payload.title);
  const ref = docRef(COL_LESSONS, String(id));
  await ref.set(payload);
  return getLessonById(id);
}

async function updateLesson(id, patch) {
  if (!id) throw new Error('updateLesson: id obrigatório');
  const ref = docRef(COL_LESSONS, String(id));
  const data = { ...patch };
  delete data.id;
  data.updated_at = now();
  await ref.update(data);
  return getLessonById(id);
}

async function deleteLesson(id) {
  if (!id) return false;
  await docRef(COL_LESSONS, String(id)).delete();
  return true;
}

function _coerceIntOrString(v) {
  if (v == null) return v;
  const n = Number(v);
  return Number.isFinite(n) && String(v).match(/^\d+$/) ? n : String(v);
}

module.exports = {
  listModules,
  getModuleById,
  listLessonsByModule,
  getLessonById,
  getAllLessons,
  updateModuleDescription,
  appendLessonContent,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
};
