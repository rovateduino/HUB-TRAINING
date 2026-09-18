const express = require('express');
const router = express.Router();
const { authenticateToken, requireSelfOrAdmin } = require('../middleware/auth.cjs');
const { saveLessonProgress, getProgress, getLessonProgress, getProgressById, patchProgressById } = require('../repositories/progressRepo.cjs');
const { getAllLessons, listModules } = require('../repositories/trainingRepo.cjs');
const { saveAuditLog } = require('../repositories/auditRepo.cjs');

async function auditInsert(uid, action, entityType, entityId, newValue, description, req) {
  try {
    await saveAuditLog({
      user_id: uid || null,
      action,
      entity_type: entityType,
      entity_id: entityId != null ? String(entityId) : null,
      new_value: newValue != null ? newValue : null,
      description: description || '',
      ip_address: (req && req.ip) || null,
      user_agent: (req && req.headers && req.headers['user-agent']) || null,
    });
  } catch (e) { console.warn('[PROGRESS/audit]', action, e.message); }
}

// ========================
// GET /api/progress/user/:userId
// Listar todo o progresso de um usuário
// ========================
router.get('/user/:userId', authenticateToken, requireSelfOrAdmin((req) => req.params.userId), async (req, res) => {
  try {
    const [progress, lessons, modules] = await Promise.all([
      getProgress(req.params.userId),
      getAllLessons(),
      listModules(),
    ]);
    const lessonById = new Map(lessons.map((l) => [String(l.id), l]));
    const moduleById = new Map(modules.map((m) => [String(m.id), m]));
    const enriched = progress.map((p) => {
      const lesson = lessonById.get(String(p.lesson_id));
      const mod = lesson ? moduleById.get(String(lesson.module_id)) : null;
      return {
        ...p,
        lesson_title: lesson ? lesson.title : null,
        module_title: mod ? mod.title : null,
      };
    });
    res.json({ progress: enriched });
  } catch (error) {
    console.error('Erro ao buscar progresso:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

// ========================
// GET /api/progress/lesson/:lessonId/user/:userId
// Progresso específico de uma lição
// ========================
router.get('/lesson/:lessonId/user/:userId', authenticateToken, requireSelfOrAdmin((req) => req.params.userId), async (req, res) => {
  try {
    const progress = await getLessonProgress(req.params.userId, req.params.lessonId);

    if (!progress) {
      return res.json({ progress: null, status: 'NOT_STARTED' });
    }

    res.json({ progress });
  } catch (error) {
    console.error('Erro ao buscar progresso:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

// ========================
// POST /api/progress
// Criar ou atualizar progresso
// ========================
router.post('/', authenticateToken, async (req, res) => {
  try {
    let { user_id, lesson_id, status, progress } = req.body || {};
    if (req.user.role !== 'ADMIN' && String(user_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Acesso negado: só é permitido registrar o próprio progresso.' });
    }
    if (!user_id) user_id = req.user.id;

    if (!user_id || !lesson_id) {
      return res.status(400).json({ error: 'user_id e lesson_id são obrigatórios' });
    }

    const existing = await getLessonProgress(user_id, lesson_id);

    if (existing) {
      const finalStatus = status ?? existing.status;
      const finalProgress = progress ?? existing.progress;
      const data = {};
      if (status !== undefined) data.status = status;
      if (progress !== undefined) data.progress = progress;
      const saved = await saveLessonProgress(user_id, lesson_id, data);

      const action = finalStatus === 'COMPLETED' ? 'LESSON_COMPLETED' : 'PROGRESS_UPDATE';
      await auditInsert(user_id, action, 'LESSON_PROGRESS', saved.id,
        JSON.stringify({ status: finalStatus, progress: finalProgress }),
        action === 'LESSON_COMPLETED' ? 'Lição concluída' : 'Progresso de lição atualizado', req);

      return res.json({ progress: saved, message: 'Progresso atualizado' });
    }

    const finalStatusNew = status ?? 'IN_PROGRESS';
    const finalProgressNew = progress ?? 0;
    const saved = await saveLessonProgress(user_id, lesson_id, {
      status: finalStatusNew,
      progress: finalProgressNew,
    });

    const actionNew = finalStatusNew === 'COMPLETED' ? 'LESSON_COMPLETED' : 'LESSON_START';
    await auditInsert(user_id, actionNew, 'LESSON_PROGRESS', saved.id,
      JSON.stringify({ status: finalStatusNew, progress: finalProgressNew }),
      actionNew === 'LESSON_COMPLETED' ? 'Lição concluída' : 'Lição iniciada', req);

    res.json({ progress: saved, message: 'Progresso criado' });
  } catch (error) {
    console.error('Erro ao criar/atualizar progresso:', error);
    res.status(500).json({ error: 'Erro ao criar/atualizar progresso' });
  }
});

// ========================
// PATCH /api/progress/:id
// Atualizar progresso parcialmente
// ========================
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, progress } = req.body || {};
    const progressId = req.params.id;

    const existing = await getProgressById(progressId);

    if (!existing) {
      return res.status(404).json({ error: 'Progresso não encontrado' });
    }
    if (req.user.role !== 'ADMIN' && String(existing.user_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Acesso negado: progresso pertence a outro usuário.' });
    }

    const patch = {};
    if (status !== undefined) patch.status = status;
    if (progress !== undefined) patch.progress = progress;
    await patchProgressById(progressId, patch);

    res.json({ message: 'Progresso atualizado' });
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error);
    res.status(500).json({ error: 'Erro ao atualizar progresso' });
  }
});

module.exports = router;
