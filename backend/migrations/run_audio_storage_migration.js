const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '195.248.240.30',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'modiryar_app',
    password: process.env.DB_PASSWORD || 'Terraworld2020',
    database: process.env.DB_NAME || 'modiryar'
  });

  try {
    console.log('🚀 Starting audio storage migration...\n');
    
    // Check if columns already exist
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'modiryar'}' 
      AND TABLE_NAME = 'meetings'
      AND COLUMN_NAME IN ('audio_file_path', 'audio_file_size', 'audio_duration', 'audio_format', 'title', 'storage_type')
    `);
    
    const existingColumns = columns.map(c => c.COLUMN_NAME);
    console.log('📊 Existing columns:', existingColumns);

    // Add audio_file_path
    if (!existingColumns.includes('audio_file_path')) {
      await connection.execute(`
        ALTER TABLE meetings 
        ADD COLUMN audio_file_path VARCHAR(500) NULL COMMENT 'Full path to audio file'
      `);
      console.log('✅ Added audio_file_path column');
    } else {
      console.log('⏭️  audio_file_path already exists');
    }

    // Add audio_file_size
    if (!existingColumns.includes('audio_file_size')) {
      await connection.execute(`
        ALTER TABLE meetings 
        ADD COLUMN audio_file_size BIGINT NULL COMMENT 'File size in bytes'
      `);
      console.log('✅ Added audio_file_size column');
    } else {
      console.log('⏭️  audio_file_size already exists');
    }

    // Add audio_duration
    if (!existingColumns.includes('audio_duration')) {
      await connection.execute(`
        ALTER TABLE meetings 
        ADD COLUMN audio_duration INT DEFAULT 0 COMMENT 'Audio duration in seconds'
      `);
      console.log('✅ Added audio_duration column');
    } else {
      console.log('⏭️  audio_duration already exists');
    }

    // Add audio_format
    if (!existingColumns.includes('audio_format')) {
      await connection.execute(`
        ALTER TABLE meetings 
        ADD COLUMN audio_format VARCHAR(50) NULL COMMENT 'Audio format (mp3, wav, ogg, etc.)'
      `);
      console.log('✅ Added audio_format column');
    } else {
      console.log('⏭️  audio_format already exists');
    }

    // Add title
    if (!existingColumns.includes('title')) {
      await connection.execute(`
        ALTER TABLE meetings 
        ADD COLUMN title VARCHAR(255) NULL COMMENT 'Meeting title'
      `);
      console.log('✅ Added title column');
    } else {
      console.log('⏭️  title already exists');
    }

    // Add storage_type
    if (!existingColumns.includes('storage_type')) {
      await connection.execute(`
        ALTER TABLE meetings 
        ADD COLUMN storage_type ENUM('local', 's3', 'supabase', 'other') DEFAULT 'local' COMMENT 'Storage location'
      `);
      console.log('✅ Added storage_type column');
    } else {
      console.log('⏭️  storage_type already exists');
    }

    // Add indexes
    console.log('\n📇 Adding indexes...');
    
    try {
      await connection.execute(`CREATE INDEX idx_audio_file_path ON meetings (audio_file_path)`);
      console.log('✅ Added idx_audio_file_path index');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('⏭️  idx_audio_file_path already exists');
      } else {
        throw e;
      }
    }

    try {
      await connection.execute(`CREATE INDEX idx_storage_type ON meetings (storage_type)`);
      console.log('✅ Added idx_storage_type index');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('⏭️  idx_storage_type already exists');
      } else {
        throw e;
      }
    }

    try {
      await connection.execute(`CREATE INDEX idx_title ON meetings (title)`);
      console.log('✅ Added idx_title index');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('⏭️  idx_title already exists');
      } else {
        throw e;
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 New columns added:');
    console.log('  - audio_file_path (VARCHAR(500))');
    console.log('  - audio_file_size (BIGINT)');
    console.log('  - audio_duration (INT)');
    console.log('  - audio_format (VARCHAR(50))');
    console.log('  - title (VARCHAR(255))');
    console.log('  - storage_type (ENUM)');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error code:', error.code);
    if (error.code === 'ER_DBACCESS_DENIED_ERROR' || error.code === 'ER_TABLEACCESS_DENIED_ERROR') {
      console.error('\n⚠️  Permission denied. Please ask your database administrator to run this migration.');
      console.error('They need to grant ALTER privileges on the meetings table.');
    }
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
