'use strict';

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
	host: config.database.host,
	port: config.database.port,
	database: config.database.database,
	user: config.database.user,
	password: config.database.password,
	ssl: config.database.ssl,
	max: config.database.max,
	idleTimeoutMillis: config.database.idleTimeoutMillis,
	connectionTimeoutMillis: config.database.connectionTimeoutMillis
});

pool.on('connect', () => {
	if (config.env !== 'test') {
		console.log('[db] new client connected');
	}
});

pool.on('error', (err) => {
	console.error('[db] unexpected error on idle client', err);
});

async function healthcheck() {
	const result = await pool.query('select 1 as ok');
	return result.rows[0].ok === 1;
}

module.exports = {
	pool,
	query: (text, params) => pool.query(text, params),
	getClient: () => pool.connect(),
	healthcheck
};

