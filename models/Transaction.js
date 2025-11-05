'use strict';

const db = require('../db/pool');

class Transaction {
    static async create(data) {
        const query = `
            INSERT INTO transactions 
            (user_id, account_id, monobank_transaction_id, amount, balance, currency_code,
             description, comment, mcc, original_mcc, hold, time, transaction_date,
             counter_iban, counter_name, counter_edrpou, receipt_id, invoice_id,
             cashback_amount, commission_rate)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT (user_id, monobank_transaction_id) DO NOTHING
            RETURNING *
        `;
        
        const values = [
            data.userId,
            data.accountId,
            data.monobankTransactionId,
            data.amount,
            data.balance,
            data.currencyCode || 980,
            data.description || null,
            data.comment || null,
            data.mcc || 0,
            data.originalMcc || null,
            data.hold || false,
            data.time,
            data.transactionDate,
            data.counterIban || null,
            data.counterName || null,
            data.counterEdrpou || null,
            data.receiptId || null,
            data.invoiceId || null,
            data.cashbackAmount || 0,
            data.commissionRate || 0
        ];
        
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async bulkCreate(transactions) {
        if (!transactions || transactions.length === 0) {
            return 0;
        }

        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            let createdCount = 0;
            
            for (const tx of transactions) {
                const result = await this.create(tx);
                if (result) {
                    createdCount++;
                }
            }
            
            await client.query('COMMIT');
            return createdCount;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async findByUserId(userId, filters = {}) {
        let query = `
            SELECT 
                t.*,
                a.iban,
                a.masked_pan,
                a.account_type,
                mcc.category_name_uk,
                mcc.category_name_en,
                mcc.parent_category_uk,
                mcc.color
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            LEFT JOIN mcc_categories mcc ON t.mcc = mcc.mcc_code
            WHERE t.user_id = $1
        `;
        
        const params = [userId];
        let paramIndex = 2;

        if (filters.fopOnly) {
            query += ` AND a.account_type = 'fop'`;
        }

        if (filters.dateFrom) {
            query += ` AND t.transaction_date >= $${paramIndex}`;
            params.push(filters.dateFrom);
            paramIndex++;
        }

        if (filters.dateTo) {
            query += ` AND t.transaction_date <= $${paramIndex}`;
            params.push(filters.dateTo);
            paramIndex++;
        }

        if (filters.accountId) {
            query += ` AND t.account_id = $${paramIndex}`;
            params.push(filters.accountId);
            paramIndex++;
        }

        if (filters.type === 'income') {
            query += ` AND t.amount > 0`;
        } else if (filters.type === 'expense') {
            query += ` AND t.amount < 0`;
        }

        if (filters.mcc) {
            query += ` AND t.mcc = $${paramIndex}`;
            params.push(filters.mcc);
            paramIndex++;
        }

        if (filters.search) {
            query += ` AND (t.description ILIKE $${paramIndex} OR t.counter_name ILIKE $${paramIndex})`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        if (filters.excludeHolds) {
            query += ` AND t.hold = false`;
        }

        query += ` ORDER BY t.transaction_date DESC`;

        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        return result.rows;
    }

    static async count(userId, filters = {}) {
        let query = `
            SELECT COUNT(*) as total
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            WHERE t.user_id = $1
        `;
        
        const params = [userId];
        let paramIndex = 2;

        if (filters.fopOnly) {
            query += ` AND a.account_type = 'fop'`;
        }

        if (filters.dateFrom) {
            query += ` AND t.transaction_date >= $${paramIndex}`;
            params.push(filters.dateFrom);
            paramIndex++;
        }

        if (filters.dateTo) {
            query += ` AND t.transaction_date <= $${paramIndex}`;
            params.push(filters.dateTo);
            paramIndex++;
        }

        if (filters.accountId) {
            query += ` AND t.account_id = $${paramIndex}`;
            params.push(filters.accountId);
            paramIndex++;
        }

        if (filters.type === 'income') {
            query += ` AND t.amount > 0`;
        } else if (filters.type === 'expense') {
            query += ` AND t.amount < 0`;
        }

        if (filters.search) {
            query += ` AND (t.description ILIKE $${paramIndex} OR t.counter_name ILIKE $${paramIndex})`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        const result = await db.query(query, params);
        return parseInt(result.rows[0].total);
    }

    static async getStats(userId, filters = {}) {
        let query = `
            SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_income,
                SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END) as total_expense,
                SUM(CASE WHEN t.amount > 0 THEN 1 ELSE 0 END) as income_count,
                SUM(CASE WHEN t.amount < 0 THEN 1 ELSE 0 END) as expense_count,
                AVG(CASE WHEN t.amount < 0 THEN t.amount ELSE NULL END) as avg_expense,
                SUM(t.cashback_amount) as total_cashback
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            WHERE t.user_id = $1
        `;
        
        const params = [userId];
        let paramIndex = 2;

        if (filters.fopOnly) {
            query += ` AND a.account_type = 'fop'`;
        }

        if (filters.dateFrom) {
            query += ` AND t.transaction_date >= $${paramIndex}`;
            params.push(filters.dateFrom);
            paramIndex++;
        }

        if (filters.dateTo) {
            query += ` AND t.transaction_date <= $${paramIndex}`;
            params.push(filters.dateTo);
            paramIndex++;
        }

        if (filters.accountId) {
            query += ` AND t.account_id = $${paramIndex}`;
            params.push(filters.accountId);
            paramIndex++;
        }

        const result = await db.query(query, params);
        return result.rows[0];
    }

    static async getByCategory(userId, filters = {}) {
        let query = `
            SELECT 
                t.mcc,
                mcc.category_name_uk,
                mcc.category_name_en,
                mcc.parent_category_uk,
                mcc.color,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_spent
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            LEFT JOIN mcc_categories mcc ON t.mcc = mcc.mcc_code
            WHERE t.user_id = $1 AND t.amount < 0
        `;
        
        const params = [userId];
        let paramIndex = 2;

        if (filters.fopOnly) {
            query += ` AND a.account_type = 'fop'`;
        }

        if (filters.dateFrom) {
            query += ` AND t.transaction_date >= $${paramIndex}`;
            params.push(filters.dateFrom);
            paramIndex++;
        }

        if (filters.dateTo) {
            query += ` AND t.transaction_date <= $${paramIndex}`;
            params.push(filters.dateTo);
            paramIndex++;
        }

        query += `
            GROUP BY t.mcc, mcc.category_name_uk, mcc.category_name_en, 
                     mcc.parent_category_uk, mcc.color
            ORDER BY total_spent DESC
        `;

        const result = await db.query(query, params);
        return result.rows;
    }

    static async exists(userId, monobankTransactionId) {
        const query = `
            SELECT EXISTS(
                SELECT 1 FROM transactions 
                WHERE user_id = $1 AND monobank_transaction_id = $2
            ) as exists
        `;
        
        const result = await db.query(query, [userId, monobankTransactionId]);
        return result.rows[0].exists;
    }

    static async getLatestDate(accountId) {
        const query = `
            SELECT MAX(transaction_date) as latest_date
            FROM transactions
            WHERE account_id = $1
        `;
        
        const result = await db.query(query, [accountId]);
        return result.rows[0].latest_date;
    }
}

module.exports = Transaction;