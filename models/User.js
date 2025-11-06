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
        RETURNING id, email, first_name, last_name, fop_group, tax_system, is_active
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
            SELECT id, email, password_hash, first_name, last_name, is_active
            FROM users 
            WHERE email = $1 AND is_active = true
        `;
        
        const result = await db.query(query, [email]);
        return result.rows[0];
    }

    static async findById(id) {
        const query = `
            SELECT id, email, first_name, last_name, is_active
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
}

module.exports = User;