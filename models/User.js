'use strict';

const bcrypt = require('bcryptjs');
const db = require('../db/pool');

class User {
    static async create({ email, password, firstName, lastName }) {
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        const query = `
            INSERT INTO users (email, password_hash, first_name, last_name)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, first_name, last_name, is_active
        `;
        
        const result = await db.query(query, [email, passwordHash, firstName, lastName]);
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
}

module.exports = User;