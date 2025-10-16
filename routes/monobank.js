'use strict';

const express = require('express');
const router = express.Router();

const MonobankController = require('../controllers/monobankController');
const { verifyToken } = require('../middleware/auth');
const { connectMonobankValidation } = require('../middleware/validation');

/**
 * @swagger
 * /api/monobank/connect:
 *   post:
 *     summary: Connect Monobank account
 *     tags: [Monobank]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Monobank API token
 *                 example: uD1234567890abcdefghijklmnopqrstuvwxyz
 *     responses:
 *       201:
 *         description: Monobank connected successfully
 *       400:
 *         description: Invalid token
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Connection already exists
 */
router.post('/connect', MonobankController.connect);

/**
 * @swagger
 * /api/monobank/status:
 *   get:
 *     summary: Get Monobank connection status
 *     tags: [Monobank]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection status
 */
router.get('/status', verifyToken, MonobankController.getStatus);

/**
 * @swagger
 * /api/monobank/client-info:
 *   get:
 *     summary: Get client info and accounts from Monobank
 *     tags: [Monobank]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client info retrieved successfully
 *       401:
 *         description: Token invalid or expired
 *       404:
 *         description: No connection found
 */
router.get('/client-info', verifyToken, MonobankController.getClientInfo);

/**
 * @swagger
 * /api/monobank/disconnect:
 *   delete:
 *     summary: Disconnect Monobank account
 *     tags: [Monobank]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disconnected successfully
 *       404:
 *         description: No connection found
 */
router.delete('/disconnect', verifyToken, MonobankController.disconnect);

module.exports = router;