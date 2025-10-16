'use strict';

const https = require('https');

const MONOBANK_API_URL = 'https://api.monobank.ua';

/**
 * Makes a request to Monobank API
 * @param {string} endpoint - API endpoint (e.g., '/personal/client-info')
 * @param {string} token - Monobank token
 * @returns {Promise<Object>} API response
 */
function makeMonobankRequest(endpoint, token) {
    console.log('token ', token)
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.monobank.ua',
            path: '/personal/client-info',
            method: 'GET',
            headers: {
                'X-Token': token,
                'User-Agent': 'FOPSmart/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            console.log('res ', res.data)

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);

                    if (res.statusCode === 200) {
                        resolve(parsed);
                    } else {
                        reject({
                            statusCode: res.statusCode,
                            message: parsed.errorDescription || 'Monobank API error',
                            details: parsed
                        });
                    }
                } catch (error) {
                    reject({
                        statusCode: res.statusCode,
                        message: 'Failed to parse Monobank response',
                        error: error.message
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.log('error ', error)
            reject({
                message: 'Network error when connecting to Monobank',
                error: error.message
            });
        });

        req.end();
    });
}

/**
 * Gets client information from Monobank
 * @param {string} token - Monobank token
 * @returns {Promise<Object>} Client info with accounts
 */
async function getClientInfo(token) {
    try {
        const clientInfo = await makeMonobankRequest('/personal/client-info', token);
        console.log('client ', clientInfo)
        return {
            clientId: clientInfo.clientId,
            name: clientInfo.name,
            webHookUrl: clientInfo.webHookUrl || null,
            permissions: clientInfo.permissions || 'psp',
            accounts: clientInfo.accounts || []
        };
    } catch (error) {
        if (error.statusCode === 403) {
            throw new Error('Invalid Monobank token');
        } else if (error.statusCode === 429) {
            throw new Error('Too many requests to Monobank API. Please try again in 60 seconds');
        } else {
            throw new Error(error.message || 'Failed to connect to Monobank');
        }
    }
}

/**
 * Gets transactions for a specific account
 * @param {string} token - Monobank token
 * @param {string} accountId - Account ID (from client info)
 * @param {number} from - Unix timestamp (from date)
 * @param {number} to - Unix timestamp (to date, optional)
 * @returns {Promise<Array>} List of transactions
 */
async function getStatements(token, accountId, from, to = null) {
    try {
        let endpoint = `/personal/statement/${accountId}/${from}`;
        if (to) {
            endpoint += `/${to}`;
        }

        const transactions = await makeMonobankRequest(endpoint, token);
        return transactions;
    } catch (error) {
        if (error.statusCode === 429) {
            throw new Error('Too many requests to Monobank API. Please try again in 60 seconds');
        } else {
            throw new Error(error.message || 'Failed to fetch transactions');
        }
    }
}

/**
 * Validates token by trying to get client info
 * @param {string} token - Monobank token to validate
 * @returns {Promise<boolean>} True if token is valid
 */
async function validateToken(token) {
    try {
        await getClientInfo(token);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    getClientInfo,
    getStatements,
    validateToken
};