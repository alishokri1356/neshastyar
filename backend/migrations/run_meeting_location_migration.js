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

async function runMeetingLocationMigration() {
  let connection;

  try {
    console.log('Starting meeting location migration...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'modiryar',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    if (await columnExists(connection, 'meetings', 'location')) {
      console.log('meetings.location already exists');
    } else {
      console.log('Adding meetings.location...');
      await connection.execute(
        'ALTER TABLE `meetings` ADD COLUMN `location` VARCHAR(500) NULL AFTER `title`'
      );
    }

    console.log('Meeting location migration completed');
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

runMeetingLocationMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
