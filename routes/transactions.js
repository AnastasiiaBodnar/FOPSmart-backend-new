'use strict';

const express = require('express');
const router = express.Router();

const TransactionController = require('../controllers/transactionController');
const { verifyToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get user transactions with filters (FOP accounts only by default)
 *     description: |
 *       Returns transactions from user's accounts. By default, only FOP account transactions are returned.
 *       To include all accounts, set fopOnly=false.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: fopOnly
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter only FOP account transactions (default true)
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
 *     summary: Get transaction statistics (FOP accounts only by default)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: fopOnly
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Calculate only FOP account statistics (default true)
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
 *     summary: Get transactions grouped by category (FOP accounts only by default)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: fopOnly
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Group only FOP account transactions (default true)
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
 *     summary: Get account balances (FOP accounts only by default)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: fopOnly
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Show only FOP account balances (default true)
 *     responses:
 *       200:
 *         description: Account balances
 */
router.get('/balances', verifyToken, TransactionController.getBalances);

module.exports = router;