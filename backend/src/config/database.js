const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = null;
    this.init();
  }

  async init() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'modiryar_app',
        password: process.env.DB_PASSWORD || 'Terraworld2020',
        database: process.env.DB_NAME || 'modiryar',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        idleTimeout: 60000
      });

      // Test connection
      const connection = await this.pool.getConnection();
      console.log('✅ Database connected successfully');
      connection.release();
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      // Use query() instead of execute() to avoid prepared statement issues
      const [rows] = await this.pool.query(sql, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getConnection() {
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
