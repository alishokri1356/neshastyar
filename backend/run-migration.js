const mysql = require('mysql2/promise');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: '195.248.240.30',
    port: 3306,
    user: 'modiryar_app',
    password: 'Terraworld2020',
    database: 'modiryar'
  });

  try {
    console.log('Running migration: Add title and duration columns to meetings table...');
    
    // Add title column
    await connection.execute(`
      ALTER TABLE meetings 
      ADD COLUMN title VARCHAR(255) NULL AFTER summary
    `);
    console.log('✅ Added title column');

    // Add duration column
    await connection.execute(`
      ALTER TABLE meetings 
      ADD COLUMN duration INT DEFAULT 0 AFTER title
    `);
    console.log('✅ Added duration column');

    // Add index for title
    await connection.execute(`
      CREATE INDEX idx_meeting_title ON meetings (title)
    `);
    console.log('✅ Added title index');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

runMigration();
