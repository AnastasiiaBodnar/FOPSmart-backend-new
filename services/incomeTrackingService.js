'use strict';

const db = require('../db/pool');

class IncomeTrackingService {
    
    static async updateUserIncome(userId, year = new Date().getFullYear()) {
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            const incomeQuery = `
                SELECT COALESCE(SUM(t.amount), 0) as total_income
                FROM transactions t
                JOIN accounts a ON t.account_id = a.id
                WHERE t.user_id = $1
                  AND a.account_type = 'fop'
                  AND t.amount > 0
                  AND EXTRACT(YEAR FROM t.transaction_date) = $2
            `;
            
            const result = await client.query(incomeQuery, [userId, year]);
            const totalIncome = parseInt(result.rows[0].total_income);
            
            const upsertQuery = `
                INSERT INTO income_tracking (user_id, year, total_income)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, year, quarter, month)
                DO UPDATE SET 
                    total_income = EXCLUDED.total_income,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            
            const trackingResult = await client.query(upsertQuery, [userId, year, totalIncome]);
            
            await client.query('COMMIT');
            
            return {
                year,
                totalIncome: totalIncome / 100, 
                updated: true
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    static async updateAllUserIncomes() {
        const query = `
            SELECT DISTINCT user_id 
            FROM transactions 
            WHERE EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        `;
        
        const result = await db.query(query);
        const userIds = result.rows.map(r => r.user_id);
        
        for (const userId of userIds) {
            try {
                await this.updateUserIncome(userId);
            } catch (error) {
                console.error(`Failed to update income for user ${userId}:`, error);
            }
        }
    }
}

module.exports = IncomeTrackingService;