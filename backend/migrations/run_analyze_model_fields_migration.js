const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
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

async function runAnalyzeModelFieldsMigration() {
  let connection;

  try {
    console.log('🔄 Starting analyze model fields migration...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'modiryar',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    console.log('✅ Connected to database');

    const meetingColumns = [
      { name: 'analyze_model', sql: 'ADD COLUMN `analyze_model` VARCHAR(50) NULL AFTER `CommentText`' },
      { name: 'analyzing_model', sql: 'ADD COLUMN `analyzing_model` VARCHAR(50) NULL AFTER `analyze_model`' },
      { name: 'analyzed_by', sql: 'ADD COLUMN `analyzed_by` VARCHAR(50) NULL AFTER `analyzing_model`' },
    ];

    for (const column of meetingColumns) {
      if (await columnExists(connection, 'meetings', column.name)) {
        console.log(`⏭️  meetings.${column.name} already exists`);
        continue;
      }
      console.log(`🔄 Adding meetings.${column.name}...`);
      await connection.execute(`ALTER TABLE \`meetings\` ${column.sql}`);
    }

    if (await columnExists(connection, 'users', 'default_analyze_model')) {
      console.log('⏭️  users.default_analyze_model already exists');
    } else {
      console.log('🔄 Adding users.default_analyze_model...');
      await connection.execute(
        'ALTER TABLE `users` ADD COLUMN `default_analyze_model` VARCHAR(50) NULL AFTER `baleID`'
      );
    }

    console.log('✅ Analyze model fields migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runAnalyzeModelFieldsMigration()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
