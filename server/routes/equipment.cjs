const express = require('express');
const router = express.Router();
const { listAllEquipment, listRelationships, getTopologyGraph } = require('../repositories/equipmentRepo.cjs');

// ========================
// GET /api/equipment
// Listar todos os equipamentos
// ========================
router.get('/', async (req, res) => {
  try {
    const equipment = await listAllEquipment({ withTypes: true });
    res.json({ equipment });
  } catch (error) {
    console.error('Erro ao buscar equipamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar equipamentos' });
  }
});

// ========================
// GET /api/equipment/relationships
// Listar relações entre equipamentos (topologia)
// ========================
router.get('/relationships', async (req, res) => {
  try {
    const all = await listRelationships();
    // INNER JOIN original: somente relações com ambas as pontas existentes
    const relationships = all.filter((r) => r.source_name && r.target_name);
    res.json({ relationships });
  } catch (error) {
    console.error('Erro ao buscar relações:', error);
    res.status(500).json({ error: 'Erro ao buscar relações' });
  }
});

// ========================
// GET /api/equipment/topology
// Retornar topologia completa estruturada
// ========================
router.get('/topology', async (req, res) => {
  try {
    const topology = await getTopologyGraph();
    res.json({ topology });
  } catch (error) {
    console.error('Erro ao buscar topologia:', error);
    res.status(500).json({ error: 'Erro ao buscar topologia' });
  }
});

module.exports = router;
