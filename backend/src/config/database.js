const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = null;
    this.readyPromise = this.init();
  }

  getBaseConfig() {
    return {
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'modiryar_app',
      password: process.env.DB_PASSWORD || 'Terraworld2020',
      database: process.env.DB_NAME || 'modiryar',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      idleTimeout: 60000
    };
  }

  getConnectionConfigs() {
    const baseConfig = this.getBaseConfig();
    const socketPath = process.env.DB_SOCKET_PATH;
    const configuredHost = process.env.DB_HOST || '127.0.0.1';

    if (socketPath) {
      return [{ ...baseConfig, socketPath, host: configuredHost }];
    }

    const hostsToTry = [configuredHost];
    if (configuredHost === '127.0.0.1') hostsToTry.push('localhost');
    if (configuredHost === 'localhost') hostsToTry.push('127.0.0.1');

    return hostsToTry.map((host) => ({ ...baseConfig, host }));
  }

  async init() {
    const connectionConfigs = this.getConnectionConfigs();
    let lastError = null;

    for (const config of connectionConfigs) {
      try {
        const candidatePool = mysql.createPool(config);
        const connection = await candidatePool.getConnection();
        connection.release();

        this.pool = candidatePool;
        console.log(`✅ Database connected successfully (host: ${config.host || 'socket'})`);
        return;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Database connection attempt failed (host: ${config.host || 'socket'}): ${error.message}`);
      }
    }

    if (lastError) {
      console.error('❌ Database connection failed after retries:', {
        code: lastError.code,
        message: lastError.message,
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'modiryar_app',
        database: process.env.DB_NAME || 'modiryar'
      });
      throw lastError;
    }
  }

  async ensureReady() {
    await this.readyPromise;
  }

  async query(sql, params = []) {
    try {
      await this.ensureReady();
      // Use query() instead of execute() to avoid prepared statement issues
      const [rows] = await this.pool.query(sql, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getConnection() {
    await this.ensureReady();
    return await this.pool.getConnection();
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection closed');
    }
  }
}

module.exports = new Database();
