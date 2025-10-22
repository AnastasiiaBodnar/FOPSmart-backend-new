'use strict';

const crypto = require('crypto');
const config = require('../config');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives a key from the encryption secret
 * @param {string} salt - Salt for key derivation
 * @returns {Buffer} Derived key
 */
function getKey(salt) {
    return crypto.pbkdf2Sync(
        config.encryption.secret,
        salt,
        100000,
        KEY_LENGTH,
        'sha256'
    );
}

/**
 * Encrypts text using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text in format: salt:iv:encrypted:tag (all hex)
 */
function encrypt(text) {
    if (!text) {
        throw new Error('Text to encrypt is required');
    }

    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey(salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return [
        salt.toString('hex'),
        iv.toString('hex'),
        encrypted,
        tag.toString('hex')
    ].join(':');
}

/**
 * Decrypts text encrypted with encrypt()
 * @param {string} encryptedText - Encrypted text in format: salt:iv:encrypted:tag
 * @returns {string} Decrypted text
 */
function decrypt(encryptedText) {
    if (!encryptedText) {
        throw new Error('Encrypted text is required');
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
        throw new Error('Invalid encrypted text format');
    }

    const [saltHex, ivHex, encrypted, tagHex] = parts;

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = getKey(salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

module.exports = {
    encrypt,
    decrypt
};