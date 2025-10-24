'use strict';

const db = require('../db/pool');

class Account {
    /**
     * Create new account(s) from Monobank client info
     * @param {number} userId - User ID
     * @param {number} monobankConnectionId - Monobank connection ID
     * @param {Array} accounts - Array of account objects from Monobank API
     * @returns {Promise<Array>} Created accounts
     */
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
                    account.type || 'black',
                    account.maskedPan ? account.maskedPan[0] : null,
                    account.type || null
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

    /**
     * Find all accounts for a user
     * @param {number} userId - User ID
     * @returns {Promise<Array>} Array of accounts
     */
    static async findByUserId(userId) {
        const query = `
            SELECT a.*, mc.client_name
            FROM accounts a
            LEFT JOIN monobank_connections mc ON a.monobank_connection_id = mc.id
            WHERE a.user_id = $1 AND a.is_active = true
            ORDER BY a.created_at DESC
        `;
        
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    /**
     * Find account by ID
     * @param {number} accountId - Account ID
     * @returns {Promise<Object|null>} Account or null
     */
    static async findById(accountId) {
        const query = `
            SELECT * FROM accounts
            WHERE id = $1 AND is_active = true
        `;
        
        const result = await db.query(query, [accountId]);
        return result.rows[0] || null;
    }

    /**
     * Find account by Monobank account_id
     * @param {number} userId - User ID
     * @param {string} accountId - Monobank account ID
     * @returns {Promise<Object|null>} Account or null
     */
    static async findByMonobankAccountId(userId, accountId) {
        const query = `
            SELECT * FROM accounts
            WHERE user_id = $1 AND account_id = $2 AND is_active = true
        `;
        
        const result = await db.query(query, [userId, accountId]);
        return result.rows[0] || null;
    }

    /**
     * Update account balance
     * @param {number} accountId - Account ID
     * @param {number} balance - New balance in kopiykas
     * @returns {Promise<Object>} Updated account
     */
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

    /**
     * Get total balance for all user accounts
     * @param {number} userId - User ID
     * @returns {Promise<Object>} Object with currency_code and total balance
     */
    static async getTotalBalance(userId) {
        const query = `
            SELECT 
                currency_code,
                SUM(balance) as total_balance,
                COUNT(*) as accounts_count
            FROM accounts
            WHERE user_id = $1 AND is_active = true
            GROUP BY currency_code
        `;
        
        const result = await db.query(query, [userId]);
        return result.rows;
    }
}

module.exports = Account;