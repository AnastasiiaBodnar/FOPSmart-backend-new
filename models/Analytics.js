'use strict';

const db = require('../db/pool');

class Analytics {
    static async getDashboardAnalytics(userId, days = 30) {
        const query = `
            WITH date_range AS (
                SELECT CURRENT_DATE - INTERVAL '${days} days' as start_date
            ),
            income_data AS (
                SELECT 
                    COUNT(*) as total_transactions,
                    COALESCE(SUM(amount), 0) as total_income
                FROM transactions
                WHERE user_id = $1 
                  AND amount > 0
                  AND transaction_date >= (SELECT start_date FROM date_range)
            ),
            expense_data AS (
                SELECT 
                    COUNT(*) as total_transactions,
                    COALESCE(SUM(ABS(amount)), 0) as total_expenses
                FROM transactions
                WHERE user_id = $1 
                  AND amount < 0
                  AND transaction_date >= (SELECT start_date FROM date_range)
            ),
            top_categories AS (
                SELECT 
                    t.mcc,
                    mcc.category_name_uk,
                    COUNT(*) as transaction_count,
                    SUM(ABS(t.amount)) as total_spent
                FROM transactions t
                LEFT JOIN mcc_categories mcc ON t.mcc = mcc.mcc_code
                WHERE t.user_id = $1 
                  AND t.amount < 0
                  AND t.transaction_date >= (SELECT start_date FROM date_range)
                GROUP BY t.mcc, mcc.category_name_uk
                ORDER BY total_spent DESC
                LIMIT 5
            ),
            daily_stats AS (
                SELECT 
                    DATE(transaction_date) as date,
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as daily_income,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as daily_expenses
                FROM transactions
                WHERE user_id = $1
                  AND transaction_date >= (SELECT start_date FROM date_range)
                GROUP BY DATE(transaction_date)
                ORDER BY date
            )
            SELECT 
                (SELECT json_build_object(
                    'totalTransactions', total_transactions,
                    'totalIncome', total_income
                ) FROM income_data) as income,
                (SELECT json_build_object(
                    'totalTransactions', total_transactions,
                    'totalExpenses', total_expenses
                ) FROM expense_data) as expenses,
                (SELECT json_agg(json_build_object(
                    'mcc', mcc,
                    'category', category_name_uk,
                    'count', transaction_count,
                    'total', total_spent
                )) FROM top_categories) as top_categories,
                (SELECT json_agg(json_build_object(
                    'date', date,
                    'income', daily_income,
                    'expenses', daily_expenses
                )) FROM daily_stats) as daily_trends
        `;

        const result = await db.query(query, [userId]);
        return result.rows[0];
    }

    static async getSpendingTrends(userId, period = 'month') {
        const periodMap = {
            week: '7 days',
            month: '30 days',
            quarter: '90 days',
            year: '365 days'
        };

        const interval = periodMap[period] || '30 days';

        const query = `
            SELECT 
                DATE_TRUNC('day', transaction_date) as date,
                mcc.category_name_uk as category,
                mcc.parent_category_uk as parent_category,
                COUNT(*) as transaction_count,
                SUM(ABS(amount)) as total_spent
            FROM transactions t
            LEFT JOIN mcc_categories mcc ON t.mcc = mcc.mcc_code
            WHERE t.user_id = $1 
              AND t.amount < 0
              AND t.transaction_date >= CURRENT_DATE - INTERVAL '${interval}'
            GROUP BY DATE_TRUNC('day', transaction_date), 
                     mcc.category_name_uk, 
                     mcc.parent_category_uk
            ORDER BY date, total_spent DESC
        `;

        const result = await db.query(query, [userId]);
        return result.rows;
    }

    static async getIncomeVsExpenses(userId, groupBy = 'month', limit = 12) {
        const truncMap = {
            day: 'day',
            week: 'week',
            month: 'month'
        };

        const trunc = truncMap[groupBy] || 'month';

        const query = `
            SELECT 
                DATE_TRUNC('${trunc}', transaction_date) as period,
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses,
                COUNT(CASE WHEN amount > 0 THEN 1 END) as income_count,
                COUNT(CASE WHEN amount < 0 THEN 1 END) as expense_count
            FROM transactions
            WHERE user_id = $1
            GROUP BY DATE_TRUNC('${trunc}', transaction_date)
            ORDER BY period DESC
            LIMIT $2
        `;

        const result = await db.query(query, [userId, limit]);
        return result.rows.reverse();
    }

    static async getFopLimitUtilization(userId, year = new Date().getFullYear()) {
        const query = `
            WITH user_info AS (
                SELECT fop_group FROM users WHERE id = $1
            ),
            monthly_income AS (
                SELECT 
                    EXTRACT(MONTH FROM transaction_date) as month,
                    SUM(amount) as income
                FROM transactions
                WHERE user_id = $1 
                  AND amount > 0
                  AND EXTRACT(YEAR FROM transaction_date) = $2
                GROUP BY EXTRACT(MONTH FROM transaction_date)
            )
            SELECT 
                (SELECT fop_group FROM user_info) as fop_group,
                json_object_agg(month, income) as monthly_income,
                SUM(income) as total_income,
                COUNT(*) as months_with_income
            FROM monthly_income
        `;

        const result = await db.query(query, [userId, year]);
        return result.rows[0];
    }
}

module.exports = Analytics;