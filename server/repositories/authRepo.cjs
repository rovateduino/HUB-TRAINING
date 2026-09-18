const crypto = require('crypto');
const { collection, docRef, parseDoc, parseDocs, now, counter, batch } = require('./_base.cjs');

const COL = 'users';

function _stripSensitiveFields(user) {
  if (!user) return user;
  const { password_hash, reset_token_hash, reset_token_expires_at, ...safe } = user;
  return safe;
}

async function findUserByEmail(email, { includeSensitive = false } = {}) {
  if (!email) return null;
  const q = collection(COL).where('email', '==', String(email).trim().toLowerCase()).limit(1);
  const docs = await parseDocs(q);
  const found = docs && docs[0] ? docs[0] : null;
  return includeSensitive ? found : _stripSensitiveFields(found);
}

async function findUserById(id, { includeSensitive = false } = {}) {
  if (!id) return null;
  const snap = await docRef(COL, id).get();
  const found = parseDoc(snap);
  return includeSensitive ? found : _stripSensitiveFields(found);
}

async function createUser(userData) {
  const nowIso = new Date().toISOString();
  const id = userData.id || crypto.randomUUID().replace(/-/g, '');
  const data = { ...userData };
  delete data.id;
  if (!data.email) throw new Error('createUser: email é obrigatório');
  data.email = String(data.email).trim().toLowerCase();
  if (data.name) data.name = String(data.name).trim();
  if (!data.role) data.role = 'STUDENT';
  if (typeof data.is_active === 'undefined') data.is_active = true;
  if (!data.created_at) data.created_at = now();
  if (!data.updated_at) data.updated_at = now();

  const ref = docRef(COL, id);
  await ref.set(data);
  const written = await findUserById(id, { includeSensitive: !!userData.password_hash });
  return written;
}

async function updateUser(id, patch) {
  if (!id) throw new Error('updateUser: id obrigatório');
  const ref = docRef(COL, id);
  const toPatch = { ...patch };
  delete toPatch.id;
  delete toPatch.email;
  toPatch.updated_at = now();
  await ref.update(toPatch);
  return findUserById(id, { includeSensitive: true });
}

async function setUserActive(id, isActive) {
  return updateUser(id, { is_active: !!isActive });
}

async function promoteUserRole(id, newRole) {
  return updateUser(id, { role: newRole, promoted_at: now() });
}

async function listUsers(filters = {}, { page = 1, pageSize = 50 } = {}) {
  let q = collection(COL);
  if (filters.role) q = q.where('role', '==', filters.role);
  if (typeof filters.is_active !== 'undefined') q = q.where('is_active', '==', !!filters.is_active);
  if (filters.search) {
    // Pesquisa simples por email/prefixo exato para não precisar de índice complexo
    q = q.where('email', '>=', String(filters.search).toLowerCase())
         .where('email', '<=', String(filters.search).toLowerCase() + '\uf8ff');
  }
  q = q.orderBy('created_at', 'desc').limit(Math.min(Number(pageSize) || 50, 200));
  if (Number(page) > 1) {
    q = q.offset((Number(page) - 1) * (Number(pageSize) || 50));
  }
  const items = await parseDocs(q);
  return {
    items: items.map(_stripSensitiveFields),
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 50,
  };
}

async function incrementUserField(id, field, delta = 1) {
  if (!id || !field) throw new Error('incrementUserField: id + field obrigatórios');
  const ref = docRef(COL, id);
  const payload = {};
  payload[field] = counter(delta);
  payload.updated_at = now();
  await ref.update(payload);
  return true;
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  setUserActive,
  promoteUserRole,
  listUsers,
  incrementUserField,
  _stripSensitiveFields,
};
