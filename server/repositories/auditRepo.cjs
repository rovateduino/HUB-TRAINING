const crypto = require('crypto');
const { collection, docRef, parseDoc, parseDocs, now, batch } = require('./_base.cjs');

const COL = 'audit_logs';

function _coerceInt(v) {
  if (v == null) return v;
  const n = Number(v);
  return Number.isFinite(n) && String(v).match(/^-?\d+$/) ? n : v;
}

async function saveAuditLog(entry = {}) {
  const id = entry.id || crypto.randomUUID().replace(/-/g, '');
  const payload = { ...entry };
  delete payload.id;
  if (payload.user_id != null) payload.user_id = _coerceInt(payload.user_id);
  if (payload.entity_id != null) payload.entity_id = _coerceInt(payload.entity_id);
  payload.timestamp = payload.timestamp || now();
  if (!payload.action) payload.action = 'UNKNOWN';
  if (!payload.entity_type) payload.entity_type = 'UNKNOWN';
  const ref = docRef(COL, String(id));
  await ref.set(payload);
  return parseDoc(await ref.get());
}

async function listByUserId(userId, { limit = 50 } = {}) {
  if (!userId) return [];
  const uidC = _coerceInt(userId);
  let q;
  try {
    q = collection(COL).where('user_id', '==', uidC).orderBy('timestamp', 'desc');
    if (limit > 0) q = q.limit(Math.min(limit, 1000));
    return await parseDocs(q);
  } catch {
    const all = await parseDocs(collection(COL).orderBy('timestamp', 'desc').limit(Math.min(limit * 20, 5000)));
    return all.filter((r) => String(r.user_id) === String(userId)).slice(0, limit || undefined);
  }
}

async function listByEntity(entityType, entityId) {
  if (!entityType) return [];
  const etidC = entityId != null ? _coerceInt(entityId) : null;
  let rows;
  try {
    let q = collection(COL).where('entity_type', '==', entityType);
    if (etidC != null) q = q.where('entity_id', '==', etidC);
    q = q.orderBy('timestamp', 'asc');
    rows = await parseDocs(q);
  } catch {
    const all = await parseDocs(collection(COL).orderBy('timestamp', 'asc').limit(5000));
    rows = all.filter((r) => {
      if (r.entity_type !== entityType) return false;
      if (etidC != null && String(r.entity_id) !== String(etidC)) return false;
      return true;
    });
  }
  return rows;
}

async function listAll({ limit = 50, offset = 0, page = null, pageSize = 50 } = {}) {
  let actualLimit = limit;
  let actualOffset = offset;
  if (page != null) {
    const ps = pageSize || 50;
    actualLimit = ps;
    actualOffset = (Number(page) - 1) * ps;
  }
  let rows;
  try {
    rows = await parseDocs(collection(COL).orderBy('timestamp', 'desc').limit(Math.min((actualOffset || 0) + (actualLimit || 50) * 5, 5000)));
  } catch {
    rows = await parseDocs(collection(COL));
    rows.sort((a, b) => {
      const ta = new Date(a.timestamp || 0).getTime();
      const tb = new Date(b.timestamp || 0).getTime();
      return tb - ta;
    });
  }
  const total = rows.length;
  const sliced = actualOffset > 0 ? rows.slice(actualOffset, actualOffset + (actualLimit || 50)) : rows.slice(0, actualLimit || 50);
  return { logs: sliced, total, limit: actualLimit, offset: actualOffset };
}

module.exports = {
  saveAuditLog,
  listByUserId,
  listByEntity,
  listAll,
};
