const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.cjs');
const { listModules, getModuleById, listLessonsByModule, getLessonById } = require('../repositories/trainingRepo.cjs');
const { saveLessonProgress } = require('../repositories/progressRepo.cjs');
const { getCheckpointsWithOptionsByLesson } = require('../repositories/checkpointRepo.cjs');
const { saveAuditLog } = require('../repositories/auditRepo.cjs');

// ========================
// GET /api/training/modules
// Listar todos os módulos
// ========================
router.get('/modules', async (req, res) => {
  try {
    const modules = await listModules();
    res.json({ modules });
  } catch (error) {
    console.error('Erro ao buscar módulos:', error);
    res.status(500).json({ error: 'Erro ao buscar módulos' });
  }
});

// ========================
// GET /api/training/module/:id
// Detalhes de um módulo específico
// ========================
router.get('/module/:id', async (req, res) => {
  try {
    const module = await getModuleById(req.params.id);

    if (!module) {
      return res.status(404).json({ error: 'Módulo não encontrado' });
    }

    // Buscar lições do módulo (sem o conteúdo HTML — detalhe fica no GET lesson/:id)
    const all = await listLessonsByModule(module.id);
    const lessons = all.map((l) => ({
      id: l.id,
      title: l.title,
      order_num: l.order_num,
      objective: l.objective != null ? l.objective : null,
      classification: l.classification != null ? l.classification : null,
      status: l.status != null ? l.status : null,
    }));

    res.json({ module, lessons });
  } catch (error) {
    console.error('Erro ao buscar módulo:', error);
    res.status(500).json({ error: 'Erro ao buscar módulo' });
  }
});

// ========================
// GET /api/training/lesson/:id
// Detalhes de uma lição específica
// ========================
router.get('/lesson/:id', async (req, res) => {
  try {
    const lesson = await getLessonById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ error: 'Lição não encontrada' });
    }

    res.json({ lesson });
  } catch (error) {
    console.error('Erro ao buscar lição:', error);
    res.status(500).json({ error: 'Erro ao buscar lição' });
  }
});

// ========================
// POST /api/training/lesson/:lessonId/complete
// Concluir aula (autenticado, progresso do próprio usuário)
// ========================
router.post('/lesson/:lessonId/complete', authenticateToken, async (req, res) => {
  try {
    const lesson = await getLessonById(req.params.lessonId);
    if (!lesson) { return res.status(404).json({ error: 'Lição não encontrada' }); }
    await saveLessonProgress(req.user.id, req.params.lessonId, { status: 'COMPLETED', progress: 100 });
    try {
      await saveAuditLog({
        user_id: req.user.id,
        action: 'LESSON_COMPLETE',
        entity_type: 'LESSON_PROGRESS',
        entity_id: String(req.params.lessonId),
        description: 'Aula concluída',
        ip_address: req.ip || null,
        user_agent: (req.headers && req.headers['user-agent']) || null,
      });
    } catch (e) { console.warn('[TRAINING/audit] LESSON_COMPLETE', e.message); }
    const lid = req.params.lessonId;
    res.json({ message: 'Aula concluída', lesson_id: (/^-?\d+$/.test(String(lid)) ? Number(lid) : lid) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao concluir aula' }); }
});

// GET /api/training/lesson/:lessonId/checkpoints — alias sem gabarito
router.get('/lesson/:lessonId/checkpoints', async (req, res) => {
  try {
    const withOptions = await getCheckpointsWithOptionsByLesson(req.params.lessonId);
    const checkpoints = withOptions.map((c) => ({
      id: c.id,
      lesson_id: c.lesson_id,
      question: c.question,
      type: c.type,
      order_num: c.order_num,
      points: c.points,
      options: (c.options || []).map((o) => ({ id: o.id, option_text: o.option_text, order_num: o.order_num })),
    }));
    res.json({ checkpoints });
  } catch (e) { res.status(500).json({ error: 'Erro checkpoints' }); }
});

module.exports = router;
