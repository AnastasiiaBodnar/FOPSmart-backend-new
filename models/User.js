'use strict';

const bcrypt = require('bcryptjs');
const db = require('../db/pool');

class User {
    static async create({ email, password, firstName, lastName, fopGroup }) {
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        const query = `
            INSERT INTO users (email, password_hash, first_name, last_name, fop_group, tax_system)
            VALUES ($1, $2, $3, $4, $5, 'single_tax')
            RETURNING id, email, first_name, last_name, fop_group, tax_system, is_active, created_at
        `;
        
        const result = await db.query(query, [
            email, 
            passwordHash, 
            firstName, 
            lastName, 
            fopGroup
        ]);
        return result.rows[0];
    }

    static async findByEmail(email) {
        const query = `
            SELECT id, email, password_hash, first_name, last_name, is_active, created_at
            FROM users 
            WHERE email = $1 AND is_active = true
        `;
        
        const result = await db.query(query, [email]);
        return result.rows[0];
    }

    static async findById(id) {
        const query = `
            SELECT id, email, first_name, last_name, is_active, created_at
            FROM users 
            WHERE id = $1 AND is_active = true
        `;
        
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    static async validatePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    static async updateFopSettings(userId, fopGroup, taxSystem) {
        const query = `
            UPDATE users 
            SET fop_group = $1, tax_system = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id, fop_group, tax_system
        `;
        
        const result = await db.query(query, [fopGroup, taxSystem, userId]);
        return result.rows[0];
    }

    static async getFopInfo(userId) {
        const query = `
            SELECT fop_group, tax_system, created_at
            FROM users
            WHERE id = $1
        `;
        
        const result = await db.query(query, [userId]);
        return result.rows[0];
    }

    static async updateProfile(userId, updates) {
        const { firstName, lastName, email } = updates;
        
        const query = `
            UPDATE users 
            SET first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                email = COALESCE($3, email),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING id, email, first_name, last_name, updated_at
        `;
        
        const result = await db.query(query, [firstName, lastName, email, userId]);
        return result.rows[0];
    }

    static async updatePassword(userId, newPassword) {
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        
        const query = `
            UPDATE users 
            SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, email, updated_at
        `;
        
        const result = await db.query(query, [passwordHash, userId]);
        return result.rows[0];
    }

    static async checkEmailExists(email, excludeUserId = null) {
        let query = `
            SELECT id FROM users 
            WHERE email = $1 AND is_active = true
        `;
        
        const params = [email];
        
        if (excludeUserId) {
            query += ` AND id != $2`;
            params.push(excludeUserId);
        }
        
        const result = await db.query(query, params);
        return result.rows.length > 0;
    }

    static async deactivate(userId) {
        const query = `
            UPDATE users 
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, email, is_active
        `;
        
        const result = await db.query(query, [userId]);
        return result.rows[0];
    }


    static async hardDelete(userId) {
        const query = `
            DELETE FROM users 
            WHERE id = $1
        `;
        
        const result = await db.query(query, [userId]);
        return result.rowCount > 0;
    }
}

module.exports = User;