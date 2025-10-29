'use strict';

const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { getLimitByGroup } = require('../config/fopLimits');

class AuthController {
    static async register(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Помилка валідації',
                    errors: errors.array()
                });
            }

            const { email, password, firstName, lastName, fopGroup } = req.body;

            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    message: 'Користувач з таким email вже існує'
                });
            }

            const limitInfo = getLimitByGroup(fopGroup);

            const user = await User.create({
                email,
                password,
                firstName,
                lastName,
                fopGroup
            });

            const token = generateToken({
                id: user.id,
                email: user.email
            });

            res.status(201).json({
                message: 'Користувача успішно зареєстровано',
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    fopGroup: user.fop_group,
                    taxSystem: user.tax_system // завжди буде 'single_tax'
                },
                fopLimit: {
                    group: limitInfo.group,
                    annualLimit: limitInfo.annualLimitUAH,
                    description: limitInfo.description,
                    taxRate: limitInfo.taxRate,
                    ecvRate: limitInfo.ecvRate
                },
                token
            });

        } catch (error) {
            console.error('Помилка реєстрації:', error);
            res.status(500).json({
                message: 'Внутрішня помилка сервера'
            });
        }
    }

    static async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Помилка валідації',
                    errors: errors.array()
                });
            }

            const { email, password } = req.body;

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    message: 'Невірний email або пароль'
                });
            }

            const isValidPassword = await User.validatePassword(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    message: 'Невірний email або пароль'
                });
            }

            const token = generateToken({
                id: user.id,
                email: user.email
            });

            let fopLimit = null;
            if (user.fop_group) {
                const limitInfo = getLimitByGroup(user.fop_group);
                fopLimit = {
                    group: limitInfo.group,
                    annualLimit: limitInfo.annualLimitUAH,
                    description: limitInfo.description,
                    taxRate: limitInfo.taxRate
                };
            }

            res.json({
                message: 'Успішний вхід',
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    fopGroup: user.fop_group,
                    taxSystem: user.tax_system
                },
                fopLimit,
                token
            });

        } catch (error) {
            console.error('Помилка входу:', error);
            res.status(500).json({
                message: 'Внутрішня помилка сервера'
            });
        }
    }
}

module.exports = AuthController;