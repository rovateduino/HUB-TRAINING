const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.cjs');
const { listModules, getAllLessons } = require('../repositories/trainingRepo.cjs');
const { getProgress } = require('../repositories/progressRepo.cjs');
const { getCheckpointsByLesson, countAnsweredCheckpoints } = require('../repositories/checkpointRepo.cjs');

// GET /api/dashboard/summary — indicadores reais do banco (módulos, aulas, checkpoints, progresso do usuário)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const [allModules, allLessons, myProgress, checkpointsAnswered] = await Promise.all([
      listModules(),
      getAllLessons(),
      getProgress(req.user.id),
      countAnsweredCheckpoints(req.user.id),
    ]);
    const modules = allModules.length;
    const lessons = allLessons.length;
    const cpsByLesson = await Promise.all(allLessons.map((l) => getCheckpointsByLesson(l.id)));
    const checkpoints = cpsByLesson.reduce((acc, arr) => acc + arr.length, 0);
    // Checkpoints respondidos pelo usuário (distintos) — antes o card exibia o total do
    // catálogo como "Concluídos", o que induzia ao erro de achar que estava tudo feito.
    const totalLessons = lessons;
    const done = myProgress.filter((p) => p.status === 'COMPLETED').length;
    const inprog = myProgress.length;
    const completedSet = new Set(
      myProgress.filter((p) => p.status === 'COMPLETED').map((p) => String(p.lesson_id))
    );
    const mods = allModules.map((m) => {
      const lids = allLessons.filter((l) => String(l.module_id) === String(m.id)).map((l) => l.id);
      let pct = 0, st = 'NOT_STARTED';
      if (lids.length) {
        const c = lids.filter((id) => completedSet.has(String(id))).length;
        pct = Math.round(c / lids.length * 100);
        st = pct === 100 ? 'COMPLETED' : (c > 0 ? 'IN_PROGRESS' : 'NOT_STARTED');
      }
      return { id: m.id, number: m.order_num, title: m.title, status: st, progress: pct };
    });
    const geral = totalLessons ? Math.round(done / totalLessons * 100) : 0;
    const eligible = (totalLessons > 0 && done === totalLessons);
    res.json({ indicators: { modules, lessons, checkpoints, checkpoints_answered: checkpointsAnswered, checkpoints_total: checkpoints, progress: geral, completed_lessons: done, started: inprog, eligible_for_quiz: eligible }, modules: mods, next_step: eligible ? { title: 'Próximo passo', text: 'Realize o simulado final para concluir sua avaliação.', cta: 'Iniciar Simulado Final' } : { title: 'Próximo passo', text: 'Continue os módulos para liberar o simulado final.', cta: null } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro dashboard.' }); }
});

module.exports = router;
