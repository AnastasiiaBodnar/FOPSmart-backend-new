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
 *     summary: Реєстрація нового користувача з групою ФОП
 *     description: |
 *       Реєструє нового користувача з автоматичним встановленням системи оподаткування 'single_tax' (єдиний податок).
 *       Це найкраща система для 99% ФОП в Україні.
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
 *                 description: Email адреса користувача
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: password123
 *                 description: Пароль (мінімум 6 символів)
 *               firstName:
 *                 type: string
 *                 example: Іван
 *                 description: Ім'я користувача
 *               lastName:
 *                 type: string
 *                 example: Петренко
 *                 description: Прізвище користувача
 *               fopGroup:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 example: 2
 *                 description: |
 *                   Група ФОП (обов'язково):
 *                   - 1: до 505,676 грн/рік (10% податок + 22% ЄСВ)
 *                   - 2: до 3,028,000 грн/рік (20% податок + 22% ЄСВ) ⭐ Найпопулярніше
 *                   - 3: до 7,000,000 грн/рік (5% податок + 22% ЄСВ + ПДВ 20%)
 *                   
 *                   Система оподаткування встановлюється автоматично як 'single_tax' (єдиний податок)
 *     responses:
 *       201:
 *         description: Користувача успішно зареєстровано
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Користувача успішно зареєстровано
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
 *                       description: Завжди 'single_tax'
 *                 fopLimit:
 *                   type: object
 *                   properties:
 *                     group:
 *                       type: integer
 *                     annualLimit:
 *                       type: number
 *                       description: Річний ліміт в гривнях
 *                     description:
 *                       type: string
 *                     taxRate:
 *                       type: number
 *                     ecvRate:
 *                       type: number
 *                 token:
 *                   type: string
 *                   description: JWT токен для авторизації
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
 *     summary: Вхід користувача
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
 *         description: Успішний вхід
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