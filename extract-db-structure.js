import mysql from 'mysql2/promise';
import fs from 'fs';

// Database connection configuration
const dbConfig = {
  host: '127.0.0.1',
  user: 'modiryar_app',
  password: 'Terraworld2020',
  database: 'modiryar',
  port: 3306
};

async function extractDatabaseStructure() {
  let connection;
  
  try {
    console.log('Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!');
    
    // Get all tables
    console.log('Fetching table list...');
    const [tables] = await connection.execute('SHOW TABLES');
    
    let markdown = `# Database Structure - Modiryar

## Database Information
- **Host**: ${dbConfig.host}
- **Database**: ${dbConfig.database}
- **User**: ${dbConfig.user}
- **Port**: ${dbConfig.port}

## Tables Overview
Total Tables: ${tables.length}

`;

    // Process each table
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      console.log(`Processing table: ${tableName}`);
      
      // Get table structure
      const [columns] = await connection.execute(`DESCRIBE \`${tableName}\``);
      
      // Get table creation info
      const [createInfo] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
      const createStatement = createInfo[0]['Create Table'];
      
      // Get table row count
      const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      const rowCount = countResult[0].count;
      
      // Add table section to markdown
      markdown += `## Table: \`${tableName}\`

**Row Count**: ${rowCount}

### Columns

| Column Name | Data Type | Null | Key | Default | Extra |
|-------------|-----------|------|-----|---------|-------|
`;

      // Add column information
      for (const column of columns) {
        markdown += `| ${column.Field} | ${column.Type} | ${column.Null} | ${column.Key} | ${column.Default || 'NULL'} | ${column.Extra || ''} |\n`;
      }
      
      // Add indexes information
      const [indexes] = await connection.execute(`SHOW INDEX FROM \`${tableName}\``);
      if (indexes.length > 0) {
        markdown += `\n### Indexes\n\n`;
        const indexGroups = {};
        
        indexes.forEach(index => {
          if (!indexGroups[index.Key_name]) {
            indexGroups[index.Key_name] = {
              type: index.Non_unique === 0 ? 'UNIQUE' : 'INDEX',
              columns: []
            };
          }
          indexGroups[index.Key_name].columns.push(index.Column_name);
        });
        
        for (const [indexName, indexInfo] of Object.entries(indexGroups)) {
          markdown += `- **${indexName}** (${indexInfo.type}): ${indexInfo.columns.join(', ')}\n`;
        }
      }
      
      // Add foreign keys
      const [foreignKeys] = await connection.execute(`
        SELECT 
          CONSTRAINT_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = '${dbConfig.database}' 
          AND TABLE_NAME = '${tableName}' 
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      
      if (foreignKeys.length > 0) {
        markdown += `\n### Foreign Keys\n\n`;
        for (const fk of foreignKeys) {
          markdown += `- **${fk.CONSTRAINT_NAME}**: \`${fk.COLUMN_NAME}\` → \`${fk.REFERENCED_TABLE_NAME}\`.\`${fk.REFERENCED_COLUMN_NAME}\`\n`;
        }
      }
      
      // Add CREATE TABLE statement
      markdown += `\n### CREATE TABLE Statement\n\n\`\`\`sql\n${createStatement}\n\`\`\`\n\n`;
      
      // Add separator
      markdown += `---\n\n`;
    }
    
    // Write to file
    console.log('Writing to Database Structure.md...');
    fs.writeFileSync('Database Structure.md', markdown, 'utf8');
    console.log('✅ Database structure extracted successfully!');
    console.log('📄 File created: Database Structure.md');
    
  } catch (error) {
    console.error('❌ Error extracting database structure:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the extraction
extractDatabaseStructure();

