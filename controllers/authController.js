'use strict';

const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

class AuthController {
    static async register(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { email, password, firstName, lastName } = req.body;

            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    message: 'User with this email already exists'
                });
            }

            const user = await User.create({
                email,
                password,
                firstName,
                lastName
            });

            const token = generateToken({
                id: user.id,
                email: user.email
            });

            res.status(201).json({
                message: 'User created successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name
                },
                token
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { email, password } = req.body;

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    message: 'Invalid email or password'
                });
            }

            const isValidPassword = await User.validatePassword(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    message: 'Invalid email or password'
                });
            }

            const token = generateToken({
                id: user.id,
                email: user.email
            });

            res.json({
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name
                },
                token
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }
}

module.exports = AuthController;