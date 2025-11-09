'use strict';

const express = require('express');
const router = express.Router();

const TransactionController = require('../controllers/transactionController');
const ManualTransactionController = require('../controllers/manualTransactionController');
const { verifyToken } = require('../middleware/auth');
const { 
    createManualTransactionValidation, 
    updateManualTransactionValidation 
} = require('../middleware/validation');

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

/**
 * @swagger
 * /api/transactions/mcc-categories:
 *   get:
 *     summary: Get MCC categories for dropdown
 *     description: Returns list of all available MCC categories for transaction categorization
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of MCC categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       mcc:
 *                         type: integer
 *                         example: 5814
 *                       nameUk:
 *                         type: string
 *                         example: "Ресторани швидкого обслуговування"
 *                       nameEn:
 *                         type: string
 *                         example: "Fast Food Restaurants"
 *                       parentCategory:
 *                         type: string
 *                         example: "Ресторани"
 *                       color:
 *                         type: string
 *                         example: "#FF6B6B"
 *       401:
 *         description: Unauthorized
 */
router.get('/mcc-categories', verifyToken, ManualTransactionController.getMccCategories);

/**
 * @swagger
 * /api/transactions/fop-accounts:
 *   get:
 *     summary: Get user's FOP accounts for dropdown
 *     description: Returns list of user's FOP accounts for account selection when creating manual transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of FOP accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       iban:
 *                         type: string
 *                       maskedPan:
 *                         type: string
 *                       balance:
 *                         type: integer
 *                       currencyCode:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/fop-accounts', verifyToken, ManualTransactionController.getUserFopAccounts);

/**
 * @swagger
 * /api/transactions/manual:
 *   post:
 *     summary: Create manual transaction
 *     description: |
 *       Create a manual transaction for FOP account. 
 *       
 *       **accountId is now OPTIONAL!** 
 *       
 *       If accountId is not provided, the system will automatically use your first FOP account.
 *       
 *       Automatically updates income tracking and checks limit status.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - description
 *               - transactionDate
 *               - type
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 minimum: 0.01
 *                 example: 5000.00
 *                 description: Transaction amount (always positive, type determines income/expense)
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 example: "Оплата за послуги веб-розробки"
 *                 description: Transaction description
 *               transactionDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-11-05"
 *                 description: Transaction date (cannot be in future or older than 3 years)
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 example: income
 *                 description: Transaction type
 *               mcc:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 9999
 *                 example: 5814
 *                 description: MCC category code (optional)
 *               comment:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Клієнт ТОВ 'Приклад'"
 *                 description: Additional comment (optional)
 *               accountId:
 *                 type: integer
 *                 example: 123
 *                 description: |
 *                   FOP account ID (OPTIONAL!)
 *                   
 *                   If not provided, automatically uses your first FOP account.
 *                   
 *                   Only needed if you have multiple FOP accounts and want to specify which one to use.
 *           examples:
 *             withoutAccountId:
 *               summary: Without accountId (recommended)
 *               value:
 *                 amount: 5000
 *                 description: "Оплата за послуги веб-розробки"
 *                 transactionDate: "2024-11-05"
 *                 type: "income"
 *                 mcc: 5814
 *                 comment: "Клієнт ТОВ 'Приклад'"
 *             withAccountId:
 *               summary: With specific accountId
 *               value:
 *                 amount: 5000
 *                 description: "Оплата за послуги веб-розробки"
 *                 transactionDate: "2024-11-05"
 *                 type: "income"
 *                 mcc: 5814
 *                 comment: "Клієнт ТОВ 'Приклад'"
 *                 accountId: 123
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Transaction created successfully
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     description:
 *                       type: string
 *                     comment:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date-time
 *                     type:
 *                       type: string
 *                       enum: [income, expense]
 *                     mcc:
 *                       type: integer
 *                     account:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         iban:
 *                           type: string
 *                         type:
 *                           type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error, invalid account, or no FOP accounts found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No FOP accounts found. Please connect Monobank first"
 *       403:
 *         description: Account does not belong to you
 *       404:
 *         description: Account not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/manual', verifyToken, createManualTransactionValidation, ManualTransactionController.createManual);

/**
 * @swagger
 * /api/transactions/manual/{id}:
 *   put:
 *     summary: Update manual transaction
 *     description: Update a manually created transaction. Only manual transactions can be updated.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *               description:
 *                 type: string
 *               transactionDate:
 *                 type: string
 *                 format: date
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *               mcc:
 *                 type: integer
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *       400:
 *         description: Validation error or cannot update synced transaction
 *       404:
 *         description: Transaction not found
 *       401:
 *         description: Unauthorized
 */
router.put('/manual/:id', verifyToken, updateManualTransactionValidation, ManualTransactionController.updateManual);

/**
 * @swagger
 * /api/transactions/manual/{id}:
 *   delete:
 *     summary: Delete manual transaction
 *     description: Delete a manually created transaction. Only manual transactions can be deleted.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *       400:
 *         description: Cannot delete synced transaction
 *       404:
 *         description: Transaction not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/manual/:id', verifyToken, ManualTransactionController.deleteManual);

module.exports = router;