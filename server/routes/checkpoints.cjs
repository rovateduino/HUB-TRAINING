const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.cjs');
const {
  getCheckpointsWithOptionsByLesson,
  getCheckpointById,
  getOptionById,
  hasAnswered,
  getMyAnswers,
  saveCheckpointAnswer,
} = require('../repositories/checkpointRepo.cjs');
const { saveAuditLog } = require('../repositories/auditRepo.cjs');

// ========================
// GET /api/checkpoints/lesson/:lessonId
// Listar checkpoints de uma lição (sem revelar respostas corretas)
// ========================
router.get('/lesson/:lessonId', async (req, res) => {
  try {
    const withOptions = await getCheckpointsWithOptionsByLesson(req.params.lessonId);

    // Agrupar opções por checkpoint (gabarito já removido pelo repository)
    const checkpoints = withOptions.map((c) => ({
      id: c.id,
      lesson_id: c.lesson_id,
      question: c.question,
      type: c.type,
      order_num: c.order_num,
      points: c.points,
      options: (c.options || []).map((o) => ({
        id: o.id,
        text: o.option_text,
        order: o.order_num,
      })),
    }));

    res.json({ checkpoints });
  } catch (error) {
    console.error('Erro ao buscar checkpoints:', error);
    res.status(500).json({ error: 'Erro ao buscar checkpoints' });
  }
});

// ========================
// GET /api/checkpoints/my-answers?lesson_id=:id
// Retorna checkpoints já respondidos pelo usuário (para travar no front)
// ========================
router.get('/my-answers', authenticateToken, async (req, res) => {
  try {
    const lessonId = req.query.lesson_id;
    const answers = await getMyAnswers(req.user.id);
    let rows = answers;
    if (lessonId != null && String(lessonId).trim() !== '') {
      // Filtra pelos checkpoints da lição (junção via catálogo, não depende de
      // desnormalização de lesson_id nas respostas migradas)
      const cps = await getCheckpointsWithOptionsByLesson(lessonId);
      const ids = new Set(cps.map((c) => String(c.id)));
      rows = answers.filter((a) => ids.has(String(a.checkpoint_id)));
    }
    res.json({ answered: rows.map((a) => ({ checkpoint_id: a.checkpoint_id, selected_option_id: a.selected_option_id })) });
  } catch (error) {
    console.error('Erro ao buscar respostas:', error);
    res.status(500).json({ error: 'Erro ao buscar respostas' });
  }
});

// ========================
// POST /api/checkpoints/:checkpointId/submit
// Submeter resposta de checkpoint — UMA vez só, não pode alterar
// ========================
router.post('/:checkpointId/submit', authenticateToken, async (req, res) => {
  try {
    const { selected_option_id } = req.body || {};
    const user_id = req.user.id;
    const checkpointId = req.params.checkpointId;

    if (!selected_option_id) {
      return res.status(400).json({ error: 'selected_option_id é obrigatório' });
    }

    // Trava: uma vez respondida, não pode mudar
    if (await hasAnswered(user_id, checkpointId)) {
      return res.status(409).json({ error: 'Resposta já registrada. Não é permitido alterar.', locked: true });
    }

    const option = await getOptionById(selected_option_id, checkpointId);

    if (!option) {
      return res.status(404).json({ error: 'Opção não encontrada' });
    }

    const isCorrect = option.is_correct === true || option.is_correct === 1;

    const checkpoint = await getCheckpointById(checkpointId);
    const saved = await saveCheckpointAnswer(
      user_id, checkpointId, selected_option_id, isCorrect,
      checkpoint ? checkpoint.lesson_id : null
    );
    if (saved.already_answered) {
      return res.status(409).json({ error: 'Resposta já registrada. Não é permitido alterar.', locked: true });
    }

    try {
      await saveAuditLog({
        user_id,
        action: 'CHECKPOINT_SUBMIT',
        entity_type: 'CHECKPOINT_ANSWER',
        entity_id: saved.answer && saved.answer.id != null ? String(saved.answer.id) : null,
        new_value: isCorrect ? 'CORRECT' : 'INCORRECT',
        description: 'Resposta de checkpoint submetida',
        ip_address: req.ip || null,
        user_agent: (req.headers && req.headers['user-agent']) || null,
      });
    } catch (e) { console.warn('[CHECKPOINTS/audit] CHECKPOINT_SUBMIT', e.message); }

    res.json({
      correct: isCorrect,
      message: isCorrect ? 'Resposta correta!' : 'Resposta incorreta.'
    });
  } catch (error) {
    console.error('Erro ao submeter checkpoint:', error);
    res.status(500).json({ error: 'Erro ao submeter checkpoint' });
  }
});

module.exports = router;
