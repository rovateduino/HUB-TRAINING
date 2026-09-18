const crypto = require('crypto');
const { collection, docRef, parseDoc, parseDocs, now, batch } = require('./_base.cjs');

const COL_TYPES = 'equipment_types';
const COL_EQ = 'technical_equipment';
const COL_REL = 'equipment_relationships';

function _coerceInt(v) {
  if (v == null) return v;
  const n = Number(v);
  return Number.isFinite(n) && String(v).match(/^-?\d+$/) ? n : v;
}

async function listAllEquipment({ withTypes = false } = {}) {
  const eqs = await parseDocs(collection(COL_EQ).orderBy('name', 'asc'));
  if (!withTypes) return eqs;
  const typesMap = await _getTypesMap();
  return eqs.map((e) => {
    const t = typesMap[String(e.type_id)] || {};
    return { ...e, type_name: t.name || null, category: t.category || null };
  });
}

async function _getTypesMap() {
  const types = await parseDocs(collection(COL_TYPES));
  const m = {};
  for (const t of types) m[String(t.id)] = t;
  return m;
}

async function getEquipmentById(id) {
  if (!id) return null;
  return parseDoc(await docRef(COL_EQ, String(id)).get());
}

async function listEquipmentTypes() {
  return parseDocs(collection(COL_TYPES).orderBy('name', 'asc'));
}

async function listRelationships() {
  const rels = await parseDocs(collection(COL_REL).orderBy('relation_order', 'asc'));
  const eqMap = {};
  for (const e of await parseDocs(collection(COL_EQ))) eqMap[String(e.id)] = e;
  return rels.map((r) => {
    const s = eqMap[String(r.source_id)] || {};
    const t = eqMap[String(r.target_id)] || {};
    return { ...r, source_name: s.name || null, target_name: t.name || null };
  });
}

async function getTopologyGraph() {
  const eqs = await parseDocs(
    collection(COL_EQ).orderBy('name', 'asc')
  );
  const rels = await parseDocs(collection(COL_REL).orderBy('relation_order', 'asc'));
  const graph = {};
  for (const eq of eqs) {
    graph[String(eq.id)] = {
      id: eq.id, name: eq.name, function: eq.function,
      location: eq.location, system: eq.system, status: eq.status,
      connections: [],
    };
  }
  for (const rel of rels) {
    const s = String(rel.source_id);
    if (graph[s]) {
      graph[s].connections.push({
        target_id: rel.target_id, type: rel.relationship_type, order: rel.relation_order,
      });
    }
  }
  return graph;
}

async function createEquipmentType(data) {
  const payload = { ...data };
  const id = payload.id || crypto.randomUUID().replace(/-/g, '');
  delete payload.id;
  payload.created_at = payload.created_at || now();
  payload.updated_at = now();
  const ref = docRef(COL_TYPES, String(id));
  await ref.set(payload);
  return parseDoc(await ref.get());
}

async function updateEquipmentType(id, patch) {
  if (!id) throw new Error('updateEquipmentType: id obrigatório');
  const ref = docRef(COL_TYPES, String(id));
  const data = { ...patch };
  delete data.id;
  data.updated_at = now();
  await ref.update(data);
  return parseDoc(await ref.get());
}

async function deleteEquipmentType(id) {
  if (!id) return false;
  await docRef(COL_TYPES, String(id)).delete();
  return true;
}

async function createEquipment(data) {
  const payload = { ...data };
  const id = payload.id || crypto.randomUUID().replace(/-/g, '');
  delete payload.id;
  if (payload.type_id != null) payload.type_id = _coerceInt(payload.type_id);
  payload.created_at = payload.created_at || now();
  payload.updated_at = now();
  const ref = docRef(COL_EQ, String(id));
  await ref.set(payload);
  return getEquipmentById(id);
}

async function updateEquipment(id, patch) {
  if (!id) throw new Error('updateEquipment: id obrigatório');
  const ref = docRef(COL_EQ, String(id));
  const data = { ...patch };
  delete data.id;
  data.updated_at = now();
  await ref.update(data);
  return getEquipmentById(id);
}

async function deleteEquipment(id) {
  if (!id) return false;
  await docRef(COL_EQ, String(id)).delete();
  return true;
}

async function createRelationship(data) {
  const payload = { ...data };
  const id = payload.id || crypto.randomUUID().replace(/-/g, '');
  delete payload.id;
  if (payload.source_id != null) payload.source_id = _coerceInt(payload.source_id);
  if (payload.target_id != null) payload.target_id = _coerceInt(payload.target_id);
  if (typeof payload.relation_order === 'undefined') payload.relation_order = 0;
  payload.created_at = payload.created_at || now();
  payload.updated_at = now();
  const ref = docRef(COL_REL, String(id));
  await ref.set(payload);
  return parseDoc(await ref.get());
}

async function updateRelationship(id, patch) {
  if (!id) throw new Error('updateRelationship: id obrigatório');
  const ref = docRef(COL_REL, String(id));
  const data = { ...patch };
  delete data.id;
  data.updated_at = now();
  await ref.update(data);
  return parseDoc(await ref.get());
}

async function deleteRelationship(id) {
  if (!id) return false;
  await docRef(COL_REL, String(id)).delete();
  return true;
}

module.exports = {
  listAllEquipment,
  getEquipmentById,
  listEquipmentTypes,
  listRelationships,
  getTopologyGraph,
  createEquipmentType,
  updateEquipmentType,
  deleteEquipmentType,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  createRelationship,
  updateRelationship,
  deleteRelationship,
};
