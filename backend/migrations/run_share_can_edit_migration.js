const mysql = require('mysql2/promise');
require('dotenv').config();

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function runShareCanEditMigration() {
  let connection;

  try {
    console.log('Starting share edit permission migration...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'modiryar',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    if (await columnExists(connection, 'meetings', 'share_can_edit')) {
      console.log('meetings.share_can_edit already exists');
    } else {
      console.log('Adding meetings.share_can_edit...');
      await connection.execute(
        'ALTER TABLE `meetings` ADD COLUMN `share_can_edit` TINYINT(1) NOT NULL DEFAULT 1 AFTER `share_enabled`'
      );
    }

    console.log('Share edit permission migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runShareCanEditMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
