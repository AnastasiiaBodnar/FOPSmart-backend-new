'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ 
            message: 'Access denied. No token provided.' 
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            message: 'Invalid token.' 
        });
    }
};

const generateToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, { 
        expiresIn: config.jwt.expiresIn 
    });
};

module.exports = {
    verifyToken,
    generateToken
};