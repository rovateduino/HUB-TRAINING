// Imagens técnicas: catálogo de metadados (arquivos vivem em /static).
// data_base64 é opcional — quando presente, guarda o binário como string (migração do legado).
const crypto = require('crypto');
const { collection, docRef, parseDoc, parseDocs, now } = require('./_base.cjs');

const COL = 'technical_images';

async function listImages() {
  let rows;
  try {
    rows = await parseDocs(collection(COL).orderBy('created_at', 'asc'));
  } catch {
    rows = await parseDocs(collection(COL));
    rows.sort((a, b) => String(a.id) < String(b.id) ? -1 : 1);
  }
  return rows;
}

async function createImage(data = {}) {
  const payload = { ...data };
  const id = payload.id || crypto.randomUUID().replace(/-/g, '');
  delete payload.id;
  if (!payload.filename) throw new Error('createImage: filename obrigatório');
  if (!payload.classification) payload.classification = 'DOCUMENTACAO_TECNICA';
  payload.created_at = payload.created_at || now();
  payload.updated_at = now();
  const ref = docRef(COL, String(id));
  await ref.set(payload);
  return parseDoc(await ref.get());
}

async function deleteImage(id) {
  if (!id) return false;
  await docRef(COL, String(id)).delete();
  return true;
}

module.exports = {
  listImages,
  createImage,
  deleteImage,
};
