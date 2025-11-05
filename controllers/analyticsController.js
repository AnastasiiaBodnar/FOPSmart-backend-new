'use strict';

const Analytics = require('../models/Analytics');
const LimitService = require('../services/limitService');
const { getLimitByGroup } = require('../config/fopLimits');

class AnalyticsController {
    static async getDashboard(req, res) {
        try {
            const userId = req.user.id;
            const days = parseInt(req.query.days) || 30;
            const fopOnly = req.query.fopOnly === 'false' ? false : true; // За замовчуванням true

            const analytics = await Analytics.getDashboardAnalytics(userId, days, fopOnly);
            
            const limitStatus = await LimitService.checkUserLimit(userId);

            res.json({
                fopOnly,
                period: {
                    days,
                    from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
                    to: new Date().toISOString()
                },
                income: {
                    totalTransactions: parseInt(analytics.income?.totalTransactions || 0),
                    totalAmount: parseInt(analytics.income?.totalIncome || 0) / 100
                },
                expenses: {
                    totalTransactions: parseInt(analytics.expenses?.totalTransactions || 0),
                    totalAmount: parseInt(analytics.expenses?.totalExpenses || 0) / 100
                },
                netIncome: (parseInt(analytics.income?.totalIncome || 0) - parseInt(analytics.expenses?.totalExpenses || 0)) / 100,
                topCategories: (analytics.top_categories || []).map(cat => ({
                    mcc: cat.mcc,
                    category: cat.category,
                    transactionCount: parseInt(cat.count),
                    totalSpent: parseInt(cat.total) / 100
                })),
                dailyTrends: (analytics.daily_trends || []).map(day => ({
                    date: day.date,
                    income: parseInt(day.income) / 100,
                    expenses: parseInt(day.expenses) / 100
                })),
                limitStatus: limitStatus.hasLimit ? {
                    fopGroup: limitStatus.fopGroup,
                    currentIncome: limitStatus.currentIncomeUAH,
                    limit: limitStatus.annualLimitUAH,
                    percentage: limitStatus.percentage,
                    remaining: limitStatus.remainingUAH,
                    status: limitStatus.status
                } : null
            });

        } catch (error) {
            console.error('Get dashboard error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async getSpendingTrends(req, res) {
        try {
            const userId = req.user.id;
            const period = req.query.period || 'month';
            const fopOnly = req.query.fopOnly === 'false' ? false : true;

            if (!['week', 'month', 'quarter', 'year'].includes(period)) {
                return res.status(400).json({
                    message: 'Invalid period. Must be: week, month, quarter, or year'
                });
            }

            const trends = await Analytics.getSpendingTrends(userId, period, fopOnly);

            res.json({
                fopOnly,
                period,
                trends: trends.map(t => ({
                    date: t.date,
                    category: t.category,
                    parentCategory: t.parent_category,
                    transactionCount: parseInt(t.transaction_count),
                    totalSpent: parseInt(t.total_spent) / 100
                }))
            });

        } catch (error) {
            console.error('Get spending trends error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async getIncomeVsExpenses(req, res) {
        try {
            const userId = req.user.id;
            const groupBy = req.query.groupBy || 'month';
            const limit = parseInt(req.query.limit) || 12;
            const fopOnly = req.query.fopOnly === 'false' ? false : true;

            if (!['day', 'week', 'month'].includes(groupBy)) {
                return res.status(400).json({
                    message: 'Invalid groupBy. Must be: day, week, or month'
                });
            }

            const data = await Analytics.getIncomeVsExpenses(userId, groupBy, limit, fopOnly);

            res.json({
                fopOnly,
                groupBy,
                periods: data.length,
                data: data.map(d => ({
                    period: d.period,
                    income: parseInt(d.income) / 100,
                    expenses: parseInt(d.expenses) / 100,
                    netIncome: (parseInt(d.income) - parseInt(d.expenses)) / 100,
                    incomeCount: parseInt(d.income_count),
                    expenseCount: parseInt(d.expense_count)
                }))
            });

        } catch (error) {
            console.error('Get income vs expenses error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async getLimitUtilization(req, res) {
        try {
            const userId = req.user.id;
            const year = parseInt(req.query.year) || new Date().getFullYear();

            const utilization = await Analytics.getFopLimitUtilization(userId, year);
            
            if (!utilization || !utilization.fop_group) {
                return res.json({
                    year,
                    configured: false,
                    message: 'FOP group not configured'
                });
            }

            const limitInfo = getLimitByGroup(utilization.fop_group);
            const totalIncome = parseInt(utilization.total_income || 0);

            const monthlyData = utilization.monthly_income || {};
            const months = [];
            for (let month = 1; month <= 12; month++) {
                const income = parseInt(monthlyData[month] || 0);
                months.push({
                    month,
                    income: income / 100,
                    percentage: (income / limitInfo.annualLimit * 100).toFixed(2)
                });
            }

            res.json({
                year,
                configured: true,
                fopGroup: utilization.fop_group,
                limit: limitInfo.annualLimitUAH,
                totalIncome: totalIncome / 100,
                utilizationPercentage: (totalIncome / limitInfo.annualLimit * 100).toFixed(2),
                remaining: (limitInfo.annualLimit - totalIncome) / 100,
                monthsWithIncome: parseInt(utilization.months_with_income || 0),
                monthlyBreakdown: months,
                note: 'This data includes only FOP account transactions'
            });

        } catch (error) {
            console.error('Get limit utilization error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }
}

module.exports = AnalyticsController;