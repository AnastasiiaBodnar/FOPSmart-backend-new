'use strict';

const express = require('express');
const router = express.Router();

const ReportController = require('../controllers/reportController');
const { verifyToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: PDF report generation and management
 */

/**
 * @swagger
 * /api/reports/generate:
 *   post:
 *     summary: Generate financial report PDF
 *     description: |
 *       Generates a comprehensive financial report in PDF format.
 *       Report includes: income/expense summary, top categories, monthly breakdown, and FOP limit status.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dateFrom:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *                 description: Start date (defaults to 30 days ago)
 *               dateTo:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *                 description: End date (defaults to today)
 *               reportType:
 *                 type: string
 *                 enum: [full, quick]
 *                 default: full
 *                 description: Type of report (full - detailed, quick - summary only)
 *     responses:
 *       200:
 *         description: PDF file downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid date range or parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Дата початку не може бути пізніше дати кінця"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/generate', verifyToken, ReportController.generateReport);

/**
 * @swagger
 * /api/reports/preview:
 *   get:
 *     summary: Preview report data
 *     description: Get JSON preview of report data before generating PDF
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: dateFrom
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (defaults to 30 days ago)
 *       - name: dateTo
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (defaults to today)
 *     responses:
 *       200:
 *         description: Report preview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     fopGroup:
 *                       type: integer
 *                 period:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                     to:
 *                       type: string
 *                     days:
 *                       type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     income:
 *                       type: number
 *                     expenses:
 *                       type: number
 *                     netIncome:
 *                       type: number
 *                 limitStatus:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/preview', verifyToken, ReportController.previewReport);

/**
 * @swagger
 * /api/reports/types:
 *   get:
 *     summary: Get available report types
 *     description: Returns list of available report types and their descriptions
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of report types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 types:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 */
router.get('/types', verifyToken, ReportController.getReportTypes);

module.exports = router;