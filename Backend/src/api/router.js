const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, status: 'operational', timestamp: new Date().toISOString() });
});

router.post('/', (req, res) => {
  res.status(201).json({ success: true, data: req.body });
});

router.get('/:id', (req, res) => {
  res.json({ success: true, data: { id: req.params.id } });
});

router.put('/:id', (req, res) => {
  res.json({ success: true, data: { id: req.params.id, ...req.body } });
});

router.delete('/:id', (req, res) => {
  res.json({ success: true, id: req.params.id });
});

module.exports = router;
