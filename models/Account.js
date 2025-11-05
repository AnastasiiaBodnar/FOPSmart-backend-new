'use strict';

const db = require('../db/pool');

class Account {
    static async bulkCreate(userId, monobankConnectionId, accounts) {
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            const createdAccounts = [];
            
            for (const account of accounts) {
                const query = `
                    INSERT INTO accounts 
                    (user_id, monobank_connection_id, account_id, balance, credit_limit, 
                     currency_code, cashback_type, iban, account_type, masked_pan, card_type)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (user_id, account_id) 
                    DO UPDATE SET
                        balance = EXCLUDED.balance,
                        credit_limit = EXCLUDED.credit_limit,
                        account_type = EXCLUDED.account_type,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `;
                
                const values = [
                    userId,
                    monobankConnectionId,
                    account.id,
                    account.balance || 0,
                    account.creditLimit || 0,
                    account.currencyCode || 980,
                    account.cashbackType || null,
                    account.iban || null,
                    account.type, 
                    account.maskedPan ? account.maskedPan[0] : null,
                    account.type 
                ];
                
                const result = await client.query(query, values);
                createdAccounts.push(result.rows[0]);
            }
            
            await client.query('COMMIT');
            return createdAccounts;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async findByUserId(userId, fopOnly = false) {
        let query = `
            SELECT a.*, mc.client_name
            FROM accounts a
            LEFT JOIN monobank_connections mc ON a.monobank_connection_id = mc.id
            WHERE a.user_id = $1 AND a.is_active = true
        `;
        
        if (fopOnly) {
            query += ` AND a.account_type = 'fop'`;
        }
        
        query += ` ORDER BY a.created_at DESC`;
        
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    static async findById(accountId) {
        const query = `
            SELECT * FROM accounts
            WHERE id = $1 AND is_active = true
        `;
        
        const result = await db.query(query, [accountId]);
        return result.rows[0] || null;
    }

    static async findByMonobankAccountId(userId, accountId) {
        const query = `
            SELECT * FROM accounts
            WHERE user_id = $1 AND account_id = $2 AND is_active = true
        `;
        
        const result = await db.query(query, [userId, accountId]);
        return result.rows[0] || null;
    }

    static async updateBalance(accountId, balance) {
        const query = `
            UPDATE accounts 
            SET balance = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        
        const result = await db.query(query, [balance, accountId]);
        return result.rows[0];
    }


    static async getTotalBalance(userId, fopOnly = false) {
        let query = `
            SELECT 
                currency_code,
                SUM(balance) as total_balance,
                COUNT(*) as accounts_count
            FROM accounts
            WHERE user_id = $1 AND is_active = true
        `;
        
        if (fopOnly) {
            query += ` AND account_type = 'fop'`;
        }
        
        query += ` GROUP BY currency_code`;
        
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    static async getFopAccounts(userId) {
        return this.findByUserId(userId, true);
    }
}

module.exports = Account;