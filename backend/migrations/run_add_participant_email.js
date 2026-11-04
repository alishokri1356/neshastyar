const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [cols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'participants' AND COLUMN_NAME = 'email'`,
      [process.env.DB_NAME]
    );

    if (cols.length) {
      console.log('⏭️  participants.email already exists');
      return;
    }

    await connection.query(`
      ALTER TABLE participants
        ADD COLUMN email VARCHAR(255) NULL COMMENT 'Optional contact email for participant'
        AFTER name
    `);
    console.log('✅ Added participants.email');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
});
