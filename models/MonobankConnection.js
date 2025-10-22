'use strict';

const db = require('../db/pool');
const { encrypt, decrypt } = require('../utils/encryption');

class MonobankConnection {
    /**
     * Creates a new Monobank connection for a user
     * @param {number} userId 
     * @param {string} token 
     * @param {string} clientName 
     * @param {string} clientId 
     * @returns {Promise<Object>} 
     */
    static async create({ userId, token, clientName, clientId }) {
        const tokenEncrypted = encrypt(token);
        
        const query = `
            INSERT INTO monobank_connections 
            (user_id, token_encrypted, client_name, client_id, is_active)
            VALUES ($1, $2, $3, $4, true)
            RETURNING id, user_id, client_name, client_id, is_active, created_at
        `;
        
        const result = await db.query(query, [userId, tokenEncrypted, clientName, clientId]);
        return result.rows[0];
    }

    /**
     * Finds connection by user ID
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} Connection or null
     */
    static async findByUserId(userId) {
        const query = `
            SELECT id, user_id, token_encrypted, client_name, client_id, 
                   is_active, last_sync_at, created_at, updated_at
            FROM monobank_connections 
            WHERE user_id = $1 AND is_active = true
        `;
        
        const result = await db.query(query, [userId]);
        return result.rows[0] || null;
    }

    /**
     * Gets decrypted token for a user
     * @param {number} userId - User ID
     * @returns {Promise<string|null>} Decrypted token or null
     */
    static async getToken(userId) {
        const connection = await this.findByUserId(userId);
        
        if (!connection || !connection.token_encrypted) {
            return null;
        }
        
        try {
            return decrypt(connection.token_encrypted);
        } catch (error) {
            console.error('Failed to decrypt token:', error);
            return null;
        }
    }

    /**
     * Updates connection token
     * @param {number} userId - User ID
     * @param {string} token - New plain token
     * @returns {Promise<Object>} Updated connection
     */
    static async updateToken(userId, token) {
        const tokenEncrypted = encrypt(token);
        
        const query = `
            UPDATE monobank_connections 
            SET token_encrypted = $1, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2 AND is_active = true
            RETURNING id, user_id, client_name, client_id, is_active, updated_at
        `;
        
        const result = await db.query(query, [tokenEncrypted, userId]);
        return result.rows[0];
    }

    /**
     * Updates last sync timestamp
     * @param {number} userId - User ID
     * @returns {Promise<void>}
     */
    static async updateLastSync(userId) {
        const query = `
            UPDATE monobank_connections 
            SET last_sync_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND is_active = true
        `;
        
        await db.query(query, [userId]);
    }

    /**
     * Deactivates (soft delete) connection
     * @param {number} userId - User ID
     * @returns {Promise<void>}
     */
    static async deactivate(userId) {
        const query = `
            UPDATE monobank_connections 
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND is_active = true
        `;
        
        await db.query(query, [userId]);
    }

    /**
     * Permanently deletes connection
     * @param {number} userId - User ID
     * @returns {Promise<void>}
     */
    static async delete(userId) {
        const query = `
            DELETE FROM monobank_connections 
            WHERE user_id = $1
        `;
        
        await db.query(query, [userId]);
    }

    /**
     * Checks if user has active connection
     * @param {number} userId - User ID
     * @returns {Promise<boolean>}
     */
    static async hasConnection(userId) {
        const connection = await this.findByUserId(userId);
        return connection !== null;
    }
}

module.exports = MonobankConnection;