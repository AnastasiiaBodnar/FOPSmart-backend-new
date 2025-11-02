'use strict';

const express = require('express');
const router = express.Router();

const AnalyticsController = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Income, expense, and user activity analytics
 */

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get analytics dashboard
 *     description: Returns comprehensive analytics for specified period (income, expenses, top categories, trends)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: days
 *         in: query
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                 income:
 *                   type: object
 *                 expenses:
 *                   type: object
 *                 netIncome:
 *                   type: number
 *                 topCategories:
 *                   type: array
 *                 dailyTrends:
 *                   type: array
 *                 limitStatus:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', verifyToken, AnalyticsController.getDashboard);

/**
 * @swagger
 * /api/analytics/spending-trends:
 *   get:
 *     summary: Get spending trends by category
 *     description: Analyze spending by categories for specified period
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *         description: Analysis period
 *     responses:
 *       200:
 *         description: Spending trends
 *       400:
 *         description: Invalid period
 */
router.get('/spending-trends', verifyToken, AnalyticsController.getSpendingTrends);

/**
 * @swagger
 * /api/analytics/income-vs-expenses:
 *   get:
 *     summary: Income vs expenses comparison
 *     description: Historical dynamics of income vs expenses with period grouping
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: groupBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: month
 *         description: Data grouping
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Number of periods
 *     responses:
 *       200:
 *         description: Comparison data
 */
router.get('/income-vs-expenses', verifyToken, AnalyticsController.getIncomeVsExpenses);

/**
 * @swagger
 * /api/analytics/limit-utilization:
 *   get:
 *     summary: FOP limit utilization
 *     description: Detailed analytics of annual FOP limit usage by month
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: year
 *         in: query
 *         schema:
 *           type: integer
 *         description: Year to analyze (defaults to current year)
 *     responses:
 *       200:
 *         description: Limit utilization data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 year:
 *                   type: integer
 *                 configured:
 *                   type: boolean
 *                 fopGroup:
 *                   type: integer
 *                 limit:
 *                   type: number
 *                 totalIncome:
 *                   type: number
 *                 utilizationPercentage:
 *                   type: string
 *                 remaining:
 *                   type: number
 *                 monthsWithIncome:
 *                   type: integer
 *                 monthlyBreakdown:
 *                   type: array
 */
router.get('/limit-utilization', verifyToken, AnalyticsController.getLimitUtilization);

module.exports = router;