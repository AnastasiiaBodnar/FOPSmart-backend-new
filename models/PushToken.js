'use strict';

const db = require('../db/pool');

class PushToken {

    static async upsert(data) {
        const query = `
            INSERT INTO user_push_tokens 
            (user_id, fcm_token, platform, device_info, is_active, last_used_at)
            VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, platform) 
            DO UPDATE SET
                fcm_token = EXCLUDED.fcm_token,
                device_info = EXCLUDED.device_info,
                is_active = true,
                last_used_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        
        const values = [
            data.userId,
            data.fcmToken,
            data.platform, // 'android' or 'web'
            JSON.stringify(data.deviceInfo || {})
        ];
        
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async findByUserId(userId) {
        const query = `
            SELECT * FROM user_push_tokens
            WHERE user_id = $1 AND is_active = true
            ORDER BY updated_at DESC
        `;
        
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    static async findByPlatform(userId, platform) {
        const query = `
            SELECT * FROM user_push_tokens
            WHERE user_id = $1 AND platform = $2 AND is_active = true
        `;
        
        const result = await db.query(query, [userId, platform]);
        return result.rows[0] || null;
    }

    static async deactivate(userId, platform) {
        const query = `
            UPDATE user_push_tokens
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND platform = $2
        `;
        
        const result = await db.query(query, [userId, platform]);
        return result.rowCount > 0;
    }

    static async delete(userId, platform) {
        const query = `
            DELETE FROM user_push_tokens
            WHERE user_id = $1 AND platform = $2
        `;
        
        const result = await db.query(query, [userId, platform]);
        return result.rowCount > 0;
    }

    static async updateLastUsed(userId, platform) {
        const query = `
            UPDATE user_push_tokens
            SET last_used_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND platform = $2
        `;
        
        await db.query(query, [userId, platform]);
    }

    static async getAllActive() {
        const query = `
            SELECT 
                pt.*,
                u.email,
                u.first_name,
                u.last_name
            FROM user_push_tokens pt
            JOIN users u ON pt.user_id = u.id
            WHERE pt.is_active = true
            ORDER BY pt.updated_at DESC
        `;
        
        const result = await db.query(query);
        return result.rows;
    }

    static async cleanupInactive(daysInactive = 90) {
        const query = `
            DELETE FROM user_push_tokens
            WHERE is_active = false 
            AND updated_at < CURRENT_TIMESTAMP - INTERVAL '${daysInactive} days'
            RETURNING id
        `;
        
        const result = await db.query(query);
        return result.rowCount;
    }
}

module.exports = PushToken;