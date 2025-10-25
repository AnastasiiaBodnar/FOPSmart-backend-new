'use strict';

const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/auth');

router.get('/fop', verifyToken, ProfileController.getFopInfo);
router.put('/fop', verifyToken, ProfileController.updateFopSettings);
router.get('/limit-status', verifyToken, ProfileController.getLimitStatus);

module.exports = router;