'use strict';

const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const {
    registerValidation,
    loginValidation
} = require('../middleware/validation');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user with FOP group
 *     description: |
 *       Registers a new user with automatic tax system setup as 'single_tax'.
 *       This is the best tax system for 99% of FOPs in Ukraine.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - fopGroup
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *                 description: User email address
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: password123
 *                 description: Password (minimum 6 characters)
 *               firstName:
 *                 type: string
 *                 example: Ivan
 *                 description: User first name
 *               lastName:
 *                 type: string
 *                 example: Petrenko
 *                 description: User last name
 *               fopGroup:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 example: 2
 *                 description: |
 *                   FOP group (required):
 *                   - 1: up to 505,676 UAH/year (10% tax + 22% ECV)
 *                   - 2: up to 3,028,000 UAH/year (20% tax + 22% ECV) ⭐ Most popular
 *                   - 3: up to 7,000,000 UAH/year (5% tax + 22% ECV + VAT 20%)
 *                   
 *                   Tax system is automatically set as 'single_tax'
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User successfully registered
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     fopGroup:
 *                       type: integer
 *                     taxSystem:
 *                       type: string
 *                       example: single_tax
 *                       description: Always 'single_tax'
 *                 fopLimit:
 *                   type: object
 *                   properties:
 *                     group:
 *                       type: integer
 *                     annualLimit:
 *                       type: number
 *                       description: Annual limit in UAH
 *                     description:
 *                       type: string
 *                     taxRate:
 *                       type: number
 *                     ecvRate:
 *                       type: number
 *                 token:
 *                   type: string
 *                   description: JWT token for authorization
 *       400:
 *         description: Помилка валідації
 *       409:
 *         description: Користувач вже існує
 */
router.post('/register', registerValidation, AuthController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                 fopLimit:
 *                   type: object
 *                 token:
 *                   type: string
 *       401:
 *         description: Невірні дані для входу
 */
router.post('/login', loginValidation, AuthController.login);

module.exports = router;