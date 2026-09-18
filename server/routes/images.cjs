const express = require('express');
const router = express.Router();
const { listImages } = require('../repositories/imagesRepo.cjs');

router.get('/', async (req, res) => {
  try {
    const images = await listImages();
    res.json({ images });
  } catch (e) { res.status(500).json({ error: 'Erro imagens.' }); }
});
module.exports = router;
