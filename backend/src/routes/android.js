const express = require('express');
const androidController = require('../controllers/androidController');

const router = express.Router();

router.get('/latest', (req, res) => androidController.latest(req, res));
router.get('/latest/download/:filename', (req, res) => androidController.downloadLatest(req, res));
router.get('/latest/download', (req, res) => androidController.downloadLatest(req, res));

module.exports = router;
