'use strict';

const express = require('express');
const router = express.Router();

const TransactionController = require('../controllers/transactionController');
const { verifyToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get user transactions with filters
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: dateFrom
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - name: dateTo
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [income, expense, all]
 *         description: Transaction type
 *       - name: accountId
 *         in: query
 *         schema:
 *           type: integer
 *         description: Filter by account ID
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search in description or counterparty name
 *       - name: mcc
 *         in: query
 *         schema:
 *           type: integer
 *         description: Filter by MCC code
 *       - name: excludeHolds
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Exclude pending transactions
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results per page
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of transactions
 *       401:
 *         description: Unauthorized
 */
router.get('/', verifyToken, TransactionController.getTransactions);

/**
 * @swagger
 * /api/transactions/stats:
 *   get:
 *     summary: Get transaction statistics
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: dateFrom
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: dateTo
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: accountId
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transaction statistics
 */
router.get('/stats', verifyToken, TransactionController.getStats);

/**
 * @swagger
 * /api/transactions/by-category:
 *   get:
 *     summary: Get transactions grouped by category
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: dateFrom
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: dateTo
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Transactions by category
 */
router.get('/by-category', verifyToken, TransactionController.getByCategory);

/**
 * @swagger
 * /api/transactions/balances:
 *   get:
 *     summary: Get account balances
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account balances
 */
router.get('/balances', verifyToken, TransactionController.getBalances);

module.exports = router;