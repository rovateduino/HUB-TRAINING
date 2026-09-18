const crypto = require('crypto');
const { collection, docRef, parseDoc, parseDocs, now, counter, admin } = require('./_base.cjs');

const COL_SEQ = 'sequences';
const SEQ_DOC = 'certificates';
const COL = 'certificates';

function _coerceInt(v) {
  if (v == null) return v;
  const n = Number(v);
  return Number.isFinite(n) && String(v).match(/^-?\d+$/) ? n : v;
}

async function _getSequenceDoc() {
  return docRef(COL_SEQ, SEQ_DOC);
}

async function generateCertificateNumber(prefix = 'CERT') {
  const seqRef = await _getSequenceDoc();
  try {
    return await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(seqRef);
      let next = 1;
      if (snap.exists) {
        next = Number(snap.data().next_num || 0) + 1;
      }
      tx.set(seqRef, { next_num: next, updated_at: now() }, { merge: true });
      return `${String(prefix).toUpperCase()}-${String(next).padStart(5, '0')}`;
    });
  } catch (e) {
    const snap = await seqRef.get();
    let next = 1;
    if (snap.exists) next = Number(snap.data().next_num || 0) + 1;
    await seqRef.set({ next_num: next, updated_at: now() }, { merge: true });
    return `${String(prefix).toUpperCase()}-${String(next).padStart(5, '0')}`;
  }
}

async function createCertificate(userId, data = {}) {
  if (!userId) throw new Error('createCertificate: userId obrigatório');
  const uidC = _coerceInt(userId);
  const id = data.id || crypto.randomUUID().replace(/-/g, '');
  const payload = { ...data };
  delete payload.id;
  payload.user_id = uidC;
  if (!payload.certificate_number) {
    payload.certificate_number = await generateCertificateNumber('CERT');
  }
  if (!payload.status) payload.status = 'VALID';
  payload.created_at = payload.created_at || now();
  payload.updated_at = now();
  if (payload.issued_by != null) payload.issued_by = _coerceInt(payload.issued_by);
  const ref = docRef(COL, String(id));
  await ref.set(payload);
  return getCertificateById(id);
}

async function getCertificateById(id) {
  if (!id) return null;
  return parseDoc(await docRef(COL, String(id)).get());
}

async function getMyCertificates(userId) {
  if (!userId) return [];
  const uidC = _coerceInt(userId);
  let rows;
  try {
    rows = await parseDocs(collection(COL).where('user_id', '==', uidC).orderBy('created_at', 'desc'));
  } catch {
    const all = await parseDocs(collection(COL));
    rows = all.filter((r) => String(r.user_id) === String(userId));
    rows.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }
  return rows;
}

async function getCertificateByNumber(number) {
  if (!number) return null;
  const numUp = String(number).trim().toUpperCase();
  let rows;
  try {
    rows = await parseDocs(collection(COL).where('certificate_number', '==', numUp).limit(1));
  } catch {
    const all = await parseDocs(collection(COL));
    rows = all.filter((r) => String(r.certificate_number || '').toUpperCase() === numUp).slice(0, 1);
  }
  return rows && rows[0] ? rows[0] : null;
}

async function getValidCertificateByUser(userId) {
  const all = await getMyCertificates(userId);
  return all.find((c) => c.status === 'VALID') || null;
}

async function markDownloaded(certId) {
  if (!certId) return null;
  const ref = docRef(COL, String(certId));
  await ref.update({ downloaded_at: now(), updated_at: now() });
  return getCertificateById(certId);
}

async function revokeCertificate(certId, reason = null) {
  if (!certId) return null;
  const ref = docRef(COL, String(certId));
  const patch = { status: 'REVOKED', revoked_at: now(), updated_at: now() };
  if (reason) patch.revocation_reason = reason;
  await ref.update(patch);
  return getCertificateById(certId);
}

async function countByUser(userId) {
  return (await getMyCertificates(userId)).length;
}

async function hasIssuedFor(userId, trainingName = null) {
  const certs = await getMyCertificates(userId);
  if (!trainingName) return certs.some((c) => c.status === 'VALID');
  return certs.some((c) => c.status === 'VALID' && c.training_name === trainingName);
}

async function generateYearlyCertificateNumber(prefix = 'HUB') {
  const year = new Date().getFullYear();
  const seqRef = docRef(COL_SEQ, `${SEQ_DOC}_${year}`);
  try {
    return await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(seqRef);
      const next = snap.exists ? Number(snap.data().next_num || 0) + 1 : 1;
      tx.set(seqRef, { next_num: next, updated_at: now() }, { merge: true });
      return `${String(prefix).toUpperCase()}-${year}-${String(next).padStart(6, '0')}`;
    });
  } catch (e) {
    const snap = await seqRef.get();
    const next = snap.exists ? Number(snap.data().next_num || 0) + 1 : 1;
    await seqRef.set({ next_num: next, updated_at: now() }, { merge: true });
    return `${String(prefix).toUpperCase()}-${year}-${String(next).padStart(6, '0')}`;
  }
}

async function listAllCertificates(limit = 5000) {
  const n = Math.min(Math.max(Number(limit) || 5000, 1), 10000);
  try {
    return await parseDocs(collection(COL).orderBy('created_at', 'desc').limit(n));
  } catch {
    const all = await parseDocs(collection(COL));
    all.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return all.slice(0, n);
  }
}

module.exports = {
  generateCertificateNumber,
  generateYearlyCertificateNumber,
  listAllCertificates,
  createCertificate,
  getCertificateById,
  getMyCertificates,
  getCertificateByNumber,
  getValidCertificateByUser,
  markDownloaded,
  revokeCertificate,
  countByUser,
  hasIssuedFor,
};
