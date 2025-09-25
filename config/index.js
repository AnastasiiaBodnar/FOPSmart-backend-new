'use strict';

// Load environment variables
require('dotenv').config();

function toBoolean(value, defaultValue) {
	if (value === undefined || value === null || value === '') return defaultValue;
	if (typeof value === 'boolean') return value;
	const normalized = String(value).trim().toLowerCase();
	return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

const config = {
	env: process.env.NODE_ENV || 'development',
	port: parseInt(process.env.PORT || '3000', 10),
	database: {
		// host: process.env.PGHOST || 'localhost',
		// port: parseInt(process.env.PGPORT || '5432', 10),
		// database: process.env.PGDATABASE || 'fopsmart',
		// user: process.env.PGUSER || 'postgres',
		// password: process.env.PGPASSWORD || 'postgres',
		ssl: toBoolean(process.env.PGSSL, false) ? { rejectUnauthorized: false } : false,
		max: parseInt(process.env.PGPOOL_MAX || '10', 10),
		idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
		connectionTimeoutMillis: parseInt(process.env.PG_CONN_TIMEOUT_MS || '5000', 10),
		url: process.env.DATABASE_URL
	}
};

module.exports = config;

