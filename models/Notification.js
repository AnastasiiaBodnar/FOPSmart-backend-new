'use strict';

const db = require('../db/pool');

class Notification {
    static async create(data) {
        const query = `
            INSERT INTO notifications 
            (user_id, type, title, message, data, sent_via)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        
        const values = [
            data.userId,
            data.type,
            data.title,
            data.message,
            JSON.stringify(data.data || {}),
            data.sentVia || ['in_app']
        ];
        
        const result = await db.query(query, values);
        return result.rows[0];
    }


    static async findByUserId(userId, options = {}) {
        const {
            unreadOnly = false,
            limit = 50,
            offset = 0,
            type = null
        } = options;

        let query = `
            SELECT * FROM notifications
            WHERE user_id = $1
        `;
        
        const params = [userId];
        let paramIndex = 2;

        if (unreadOnly) {
            query += ` AND is_read = false`;
        }

        if (type) {
            query += ` AND type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC`;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        return result.rows;
    }

    static async getUnreadCount(userId) {
        const query = `
            SELECT COUNT(*) as count
            FROM notifications
            WHERE user_id = $1 AND is_read = false
        `;
        
        const result = await db.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }

    static async markAsRead(notificationId, userId) {
        const query = `
            UPDATE notifications
            SET is_read = true, read_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        
        const result = await db.query(query, [notificationId, userId]);
        return result.rows[0];
    }

    static async markAllAsRead(userId) {
        const query = `
            UPDATE notifications
            SET is_read = true, read_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND is_read = false
            RETURNING id
        `;
        
        const result = await db.query(query, [userId]);
        return result.rowCount;
    }


    static async delete(notificationId, userId) {
        const query = `
            DELETE FROM notifications
            WHERE id = $1 AND user_id = $2
        `;
        
        const result = await db.query(query, [notificationId, userId]);
        return result.rowCount > 0;
    }

    static async deleteOldNotifications(daysOld = 30) {
        const query = `
            DELETE FROM notifications
            WHERE is_read = true 
            AND read_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
            RETURNING id
        `;
        
        const result = await db.query(query);
        return result.rowCount;
    }
}

module.exports = Notification;