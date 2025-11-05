'use strict';

const PDFService = require('../services/pdfService');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const LimitService = require('../services/limitService');
const moment = require('moment');

class ReportController {
    static async generateReport(req, res) {
        try {
            const userId = req.user.id;
            const { 
                dateFrom, 
                dateTo, 
                reportType = 'full' 
            } = req.body;

            const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const to = dateTo ? new Date(dateTo) : new Date();

            if (from > to) {
                return res.status(400).json({
                    message: 'Дата початку не може бути пізніше дати кінця'
                });
            }

            const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24));

            if (days > 365) {
                return res.status(400).json({
                    message: 'Період звіту не може перевищувати 365 днів'
                });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    message: 'Користувача не знайдено'
                });
            }

            const fopInfo = await User.getFopInfo(userId);

            const analytics = await Analytics.getDashboardAnalytics(userId, days, true); // fopOnly = true

            let limitStatus = null;
            if (fopInfo && fopInfo.fop_group) {
                const limitCheck = await LimitService.checkUserLimit(userId);
                if (limitCheck.hasLimit) {
                    limitStatus = {
                        fopGroup: limitCheck.fopGroup,
                        currentIncome: limitCheck.currentIncomeUAH,
                        limit: limitCheck.annualLimitUAH,
                        percentage: limitCheck.percentage,
                        remaining: limitCheck.remainingUAH,
                        status: limitCheck.status
                    };
                }
            }

            const topCategories = (analytics.top_categories || []).map(cat => ({
                mcc: cat.mcc,
                category: cat.category,
                transactionCount: parseInt(cat.count),
                totalSpent: parseInt(cat.total) / 100
            }));

            const monthlyData = await Analytics.getIncomeVsExpenses(userId, 'month', 12, true); // fopOnly = true
            const formattedMonthlyData = monthlyData.map(m => ({
                period: m.period,
                income: parseInt(m.income) / 100,
                expenses: parseInt(m.expenses) / 100,
                incomeCount: parseInt(m.income_count),
                expenseCount: parseInt(m.expense_count)
            }));

            const reportData = {
                user: {
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    fopGroup: fopInfo?.fop_group || null,
                    taxSystem: fopInfo?.tax_system || null
                },
                period: {
                    from: from.toISOString(),
                    to: to.toISOString(),
                    days
                },
                summary: {
                    income: parseInt(analytics.income?.totalIncome || 0) / 100,
                    expenses: parseInt(analytics.expenses?.totalExpenses || 0) / 100,
                    netIncome: (parseInt(analytics.income?.totalIncome || 0) - parseInt(analytics.expenses?.totalExpenses || 0)) / 100,
                    incomeCount: parseInt(analytics.income?.totalTransactions || 0),
                    expenseCount: parseInt(analytics.expenses?.totalTransactions || 0),
                    totalTransactions: parseInt(analytics.income?.totalTransactions || 0) + parseInt(analytics.expenses?.totalTransactions || 0)
                },
                topCategories,
                monthlyData: formattedMonthlyData,
                limitStatus
            };

            let pdfDoc;
            if (reportType === 'quick') {
                pdfDoc = PDFService.generateQuickSummary(reportData);
            } else {
                pdfDoc = PDFService.generateFinancialReport(reportData);
            }

            const fileName = `fopsmart-report-${moment(from).format('YYYY-MM-DD')}-${moment(to).format('YYYY-MM-DD')}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            pdfDoc.pipe(res);

        } catch (error) {
            console.error('Generate report error:', error);
            res.status(500).json({
                message: 'Помилка генерації звіту',
                error: error.message
            });
        }
    }

    static async previewReport(req, res) {
        try {
            const userId = req.user.id;
            const { 
                dateFrom, 
                dateTo 
            } = req.query;

            const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const to = dateTo ? new Date(dateTo) : new Date();

            if (from > to) {
                return res.status(400).json({
                    message: 'Дата початку не може бути пізніше дати кінця'
                });
            }

            const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24));

            const user = await User.findById(userId);
            const fopInfo = await User.getFopInfo(userId);

            const analytics = await Analytics.getDashboardAnalytics(userId, days, true);

            let limitStatus = null;
            if (fopInfo && fopInfo.fop_group) {
                const limitCheck = await LimitService.checkUserLimit(userId);
                if (limitCheck.hasLimit) {
                    limitStatus = {
                        fopGroup: limitCheck.fopGroup,
                        currentIncome: limitCheck.currentIncomeUAH,
                        limit: limitCheck.annualLimitUAH,
                        percentage: limitCheck.percentage,
                        remaining: limitCheck.remainingUAH
                    };
                }
            }

            res.json({
                fopOnly: true, 
                user: {
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    fopGroup: fopInfo?.fop_group
                },
                period: {
                    from: from.toISOString(),
                    to: to.toISOString(),
                    days
                },
                summary: {
                    income: parseInt(analytics.income?.totalIncome || 0) / 100,
                    expenses: parseInt(analytics.expenses?.totalExpenses || 0) / 100,
                    netIncome: (parseInt(analytics.income?.totalIncome || 0) - parseInt(analytics.expenses?.totalExpenses || 0)) / 100
                },
                limitStatus
            });

        } catch (error) {
            console.error('Preview report error:', error);
            res.status(500).json({
                message: 'Помилка попереднього перегляду звіту'
            });
        }
    }

    static async getReportTypes(req, res) {
        res.json({
            types: [
                {
                    id: 'full',
                    name: 'Повний звіт',
                    description: 'Детальний фінансовий звіт з аналітикою та графіками (тільки ФОП транзакції)'
                },
                {
                    id: 'quick',
                    name: 'Швидка зводка',
                    description: 'Коротка зводка доходів та витрат (тільки ФОП транзакції)'
                }
            ]
        });
    }
}

module.exports = ReportController;