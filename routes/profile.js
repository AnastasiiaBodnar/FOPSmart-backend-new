'use strict';

const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/auth');
const { updateFopSettingsValidation } = require('../middleware/validation');

/**
 * @swagger
 * /api/profile/fop:
 *   get:
 *     summary: Get FOP profile information
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: FOP profile info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configured:
 *                   type: boolean
 *                 fopGroup:
 *                   type: integer
 *                 taxSystem:
 *                   type: string
 *                 limit:
 *                   type: object
 */
router.get('/fop', verifyToken, ProfileController.getFopInfo);

/**
 * @swagger
 * /api/profile/fop:
 *   put:
 *     summary: Update FOP settings
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fopGroup
 *             properties:
 *               fopGroup:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 example: 2
 *               taxSystem:
 *                 type: string
 *                 enum: [single_tax, general, simplified]
 *                 example: single_tax
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Validation error
 */
router.put('/fop', verifyToken, updateFopSettingsValidation, ProfileController.updateFopSettings);

/**
 * @swagger
 * /api/profile/limit-status:
 *   get:
 *     summary: Get current limit status
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: year
 *         in: query
 *         schema:
 *           type: integer
 *         description: Year to check
 *     responses:
 *       200:
 *         description: Limit status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configured:
 *                   type: boolean
 *                 year:
 *                   type: integer
 *                 fopGroup:
 *                   type: integer
 *                 currentIncome:
 *                   type: number
 *                 limit:
 *                   type: number
 *                 percentage:
 *                   type: number
 *                 remaining:
 *                   type: number
 *                 status:
 *                   type: string
 */
router.get('/limit-status', verifyToken, ProfileController.getLimitStatus);

module.exports = router;