const { getFirestore, getTimestampNow, increment, arrayUnion, arrayRemove, admin } = require('../services/firebase.cjs');

function _isTimestamp(v) {
  return v && typeof v === 'object' && typeof v.toDate === 'function' && typeof v.toMillis === 'function';
}

function _convertTypes(v, depth = 0) {
  if (depth > 8) return v;
  if (v == null) return v;
  if (_isTimestamp(v)) {
    try { return v.toDate().toISOString(); } catch { return v; }
  }
  if (Array.isArray(v)) return v.map((x) => _convertTypes(x, depth + 1));
  if (typeof v === 'object' && v.constructor === Object) {
    const out = {};
    for (const k of Object.keys(v)) out[k] = _convertTypes(v[k], depth + 1);
    return out;
  }
  return v;
}

function collection(name) {
  return getFirestore().collection(name);
}

function docRef(c, id) {
  return typeof c === 'string' ? getFirestore().doc(`${c}/${id}`) : c.doc(id);
}

function parseDoc(snap) {
  if (!snap || !snap.exists) return null;
  return _convertTypes({ ...snap.data(), id: snap.id });
}

async function parseDocs(q) {
  const snap = typeof q.get === 'function' ? await q.get() : q;
  if (snap && typeof snap.docs === 'undefined') {
    return Array.isArray(snap) ? snap : [snap];
  }
  const out = [];
  for (const s of snap.docs) {
    const obj = parseDoc(s);
    if (obj) out.push(obj);
  }
  return out;
}

function batch() {
  return getFirestore().batch();
}

function commitBatch(b) {
  return b.commit();
}

function now() {
  return getTimestampNow();
}

function counter(delta = 1) {
  return increment(delta);
}

module.exports = {
  admin,
  collection,
  docRef,
  parseDoc,
  parseDocs,
  batch,
  commitBatch,
  now,
  counter,
  arrayUnion,
  arrayRemove,
};
