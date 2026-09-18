const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { authenticateToken } = require('../middleware/auth.cjs');
const { findUserById } = require('../repositories/authRepo.cjs');
const {
  getCertificateById,
  getValidCertificateByUser,
  getCertificateByNumber,
  markDownloaded,
} = require('../repositories/certificateRepo.cjs');
const { getTrainingStatus } = require('../repositories/adminRepo.cjs');
const { getPracticalByUserId } = require('../repositories/adminRepo.cjs');
const { getById: getPracticalById } = require('../repositories/practicalRepo.cjs');
const { saveAuditLog } = require('../repositories/auditRepo.cjs');

const PASS_SCORE = 23;

async function auditInsert(userId, action, entityId, description, req) {
  try {
    await saveAuditLog({
      user_id: userId || null,
      action,
      entity_type: 'CERTIFICATE',
      entity_id: entityId != null ? String(entityId) : null,
      description: description || '',
      ip_address: (req && req.ip) || null,
      user_agent: (req && req.headers && req.headers['user-agent']) || null,
    });
  } catch (e) { console.warn('[CERTIFICATES/audit]', action, e.message); }
}

function practicalView(row) {
  if (!row) return null;
  let criteria = [];
  if (Array.isArray(row.criteria)) criteria = row.criteria;
  else { try { criteria = row.criteria_data ? JSON.parse(row.criteria_data) : []; } catch { criteria = []; } }
  return {
    id: row.id, result: row.result, evaluation_date: row.evaluation_date,
    observations: row.observations, criteria,
    evaluator_name: row.evaluator_name, evaluator_title: row.evaluator_title,
  };
}

function publicView(row, userName, practical) {
  const score = Number(row.score) || 0;
  return {
    certificate_number: row.certificate_number,
    participant: userName,
    training: row.training_name,
    modality: row.modality,
    workload_hours: row.workload_hours,
    completion_date: row.completion_date,
    issue_date: row.issue_date,
    result_final: 'TREINAMENTO CONCLUÍDO',
    theory: { result: score >= PASS_SCORE ? 'APROVADO' : 'NÃO APROVADO', score, total: row.total, percentage: row.percentage },
    practical: practical ? { result: practical.result, evaluation_date: practical.evaluation_date, evaluator_name: practical.evaluator_name } : null,
    exceptional: !!row.issue_note,
    status: row.status,
  };
}

function detailView(row, userName, practical, issuedByName, workloadDetail) {
  return {
    ...publicView(row, userName, practical),
    issued_by_name: issuedByName,
    workload_detail: workloadDetail,
    signer1_name: row.signer1_name,
    signer1_role: row.signer1_role,
    signer2_name: row.signer2_name,
    signer2_role: row.signer2_role,
  };
}

function baseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0];
  return `${proto}://${req.get('host')}`;
}

async function qrFor(req, number) {
  const url = `${baseUrl(req)}/validar/${number}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 220, margin: 1 });
  return { url, dataUrl };
}

function parseWorkloadDetail(v) {
  if (Array.isArray(v)) return v;
  try { return v ? JSON.parse(v) : []; } catch { return []; }
}

function stripStatus(st) {
  const { _best, ...rest } = st || {};
  return rest;
}

// ========================
// GET /api/certificates/my — status + checklist + certificado (se emitido).
// APROVAÇÃO TEÓRICA NÃO GERA CERTIFICADO; emissão é só ADMIN.
// ========================
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const st = stripStatus(await getTrainingStatus(req.user.id));
    let certificate = null;
    if (st.certificate) {
      const row = await getValidCertificateByUser(req.user.id);
      if (row) {
        const [me, pract, issuer] = await Promise.all([
          findUserById(req.user.id).catch(() => null),
          getPracticalByUserId(req.user.id).catch(() => null),
          row.issued_by ? findUserById(row.issued_by).catch(() => null) : null,
        ]);
        const wDetail = parseWorkloadDetail(row.workload_detail);
        const qr = await qrFor(req, row.certificate_number);
        await auditInsert(req.user.id, 'CERTIFICATE_VIEWED', row.id, `Certificado ${row.certificate_number} visualizado`, req);
        certificate = {
          ...detailView(row, me ? me.name : '', practicalView(pract), issuer ? issuer.name : null, wDetail),
          qr_data_url: qr.dataUrl, validation_url: qr.url,
        };
      }
    }
    res.json({ ...st, certificate });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao carregar certificado.' }); }
});

// ========================
// POST /api/certificates/my/downloaded — auditoria do download/PDF.
// ========================
router.post('/my/downloaded', authenticateToken, async (req, res) => {
  try {
    const row = await getValidCertificateByUser(req.user.id);
    if (!row) return res.status(404).json({ error: 'Certificado não encontrado.' });
    await auditInsert(req.user.id, 'CERTIFICATE_DOWNLOADED', row.id, `Certificado ${row.certificate_number} baixado/impresso`, req);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro.' }); }
});

// ========================
// PATCH /api/certificates/:id/downloaded — marca download (dono ou ADMIN).
// ========================
router.patch('/:id/downloaded', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id != null && String(req.params.id).trim() ? String(req.params.id).trim() : null;
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    const row = await getCertificateById(id);
    if (!row) return res.status(404).json({ error: 'Certificado não encontrado.' });
    if (String(row.user_id) !== String(req.user.id) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    await markDownloaded(id);
    await auditInsert(req.user.id, 'CERTIFICATE_DOWNLOADED', id, `Certificado ${row.certificate_number} baixado/impresso`, req);
    res.json({ ok: true, id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro.' }); }
});

// ========================
// GET /api/certificates/validate/:number — PÚBLICO, só autenticidade.
// ========================
router.get('/validate/:number', async (req, res) => {
  try {
    const number = String(req.params.number || '').trim().toUpperCase();
    const row = await getCertificateByNumber(number);
    if (!row) return res.status(404).json({ status: 'NOT_FOUND', error: 'Certificado não encontrado.' });
    const [u, pract] = await Promise.all([
      findUserById(row.user_id).catch(() => null),
      row.practical_evaluation_id ? getPracticalById(row.practical_evaluation_id).catch(() => null) : null,
    ]);
    await auditInsert(null, 'CERTIFICATE_VALIDATED', row.id, `Validação pública de ${row.certificate_number}`, req);
    res.json({ status: row.status, certificate: publicView(row, u ? u.name : '', practicalView(pract)) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro.' }); }
});

module.exports = router;
