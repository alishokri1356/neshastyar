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

async function indexExists(connection, tableName, indexName) {
  const [rows] = await connection.query(
    `SELECT 1
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [tableName, indexName]
  );
  return rows.length > 0;
}

async function runShareTokenAndOrgFieldsMigration() {
  let connection;

  try {
    console.log('Starting share token and organization fields migration...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'modiryar',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    console.log('Connected to database');

    const meetingColumns = [
      { name: 'share_token', sql: 'ADD COLUMN `share_token` VARCHAR(64) NULL AFTER `analyzed_by`' },
      { name: 'share_enabled', sql: 'ADD COLUMN `share_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `share_token`' },
    ];

    for (const column of meetingColumns) {
      if (await columnExists(connection, 'meetings', column.name)) {
        console.log(`meetings.${column.name} already exists`);
        continue;
      }
      console.log(`Adding meetings.${column.name}...`);
      await connection.execute(`ALTER TABLE \`meetings\` ${column.sql}`);
    }

    if (await indexExists(connection, 'meetings', 'idx_meetings_share_token')) {
      console.log('idx_meetings_share_token already exists');
    } else {
      console.log('Adding idx_meetings_share_token...');
      await connection.execute(
        'ALTER TABLE `meetings` ADD UNIQUE INDEX `idx_meetings_share_token` (`share_token`)'
      );
    }

    const userColumns = [
      { name: 'org_name', sql: 'ADD COLUMN `org_name` VARCHAR(255) NULL' },
      { name: 'org_logo_path', sql: 'ADD COLUMN `org_logo_path` VARCHAR(255) NULL AFTER `org_name`' },
    ];

    for (const column of userColumns) {
      if (await columnExists(connection, 'users', column.name)) {
        console.log(`users.${column.name} already exists`);
        continue;
      }
      console.log(`Adding users.${column.name}...`);
      await connection.execute(`ALTER TABLE \`users\` ${column.sql}`);
    }

    console.log('Share token and organization fields migration completed');
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

runShareTokenAndOrgFieldsMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
