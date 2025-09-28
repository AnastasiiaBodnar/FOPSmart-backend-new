'use strict';

const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const {
    registerValidation,
    loginValidation
} = require('../middleware/validation');

router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);

module.exports = router;