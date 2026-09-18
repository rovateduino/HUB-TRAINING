const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, requireSelfOrAdmin } = require('../middleware/auth.cjs');
const { listByUserId, listByEntity, listAll } = require('../repositories/auditRepo.cjs');

// ========================
// GET /api/audit/user/:userId
// Listar logs de auditoria de um usuário
// ========================
router.get('/user/:userId', authenticateToken, requireSelfOrAdmin((req) => req.params.userId), async (req, res) => {
  try {
    const logs = await listByUserId(req.params.userId, { limit: 50 });
    res.json({ logs });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
});

// ========================
// GET /api/audit/entity/:entityType/:entityId
// Listar logs de uma entidade específica
// ========================
router.get('/entity/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const logs = await listByEntity(req.params.entityType, req.params.entityId);
    res.json({ logs });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
});

// ========================
// GET /api/audit
// Listar todos os logs (paginado) - rota administrativa
// ========================
router.get('/', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const data = await listAll({ limit, offset });

    res.json({ logs: data.logs, total: data.total, limit, offset });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
});

module.exports = router;
