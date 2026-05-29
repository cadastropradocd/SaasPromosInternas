import { Env } from './index';

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log('Starting D1 backup to R2');

    try {
      // Get current timestamp for backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `promos-db-backup-${timestamp}.sql`;

      // Generate SQL dump from D1 database
      const sqlDump = await generateSqlDump(env.DB);

      // Upload SQL dump to R2
      await env.BACKUP_BUCKET.put(backupKey, sqlDump, {
        httpMetadata: {
          contentType: 'application/sql',
        },
      });

      console.log(`Backup successful: ${backupKey}`);
    } catch (error) {
      console.error('Backup failed:', error);
      // Optionally, you could set up an alerting mechanism here
    }
  },
};

async function generateSqlDump(db: D1Database): Promise<string> {
  const tables: Array<{ name: string; sql: string }> = [];

  // Get all tables
  const tableResult = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
  ).all();

  if (!tableResult.results) {
    throw new Error('Failed to fetch tables');
  }

  for (const table of tableResult.results as Array<{ name: string }>) {
    const tableName = table.name;

    // Get table schema
    const schemaResult = await db.prepare(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name = ?;`
    )
      .bind(tableName)
      .first();

    if (!schemaResult) {
      throw new Error(`Failed to fetch schema for table ${tableName}`);
    }

    tables.push({
      name: tableName,
      sql: schemaResult.sql as string,
    });
  }

  // Build SQL dump
  let sqlDump = '-- D1 Database Backup\\n';
  sqlDump += `-- Generated at: ${new Date().toISOString()}\\n\\n`;

  // Add schema
  for (const table of tables) {
    sqlDump += `${table.sql};\\n\\n`;
  }

  // Add data for each table
  for (const table of tables) {
    const { name: tableName } = table;
    const dataResult = await db.prepare(`SELECT * FROM ${tableName};`).all();

    if (!dataResult.results) {
      continue;
    }

    const rows = dataResult.results as Array<Record<string, unknown>>;

    if (rows.length === 0) {
      continue;
    }

    sqlDump += `-- Data for table: ${tableName}\\n`;

    // Get column names from first row
    const columns = Object.keys(rows[0]);
    const columnList = columns.map((col) => `"${col}"`).join(', ');

    for (const row of rows) {
      const values = columns.map((col) => {
        const value = row[col];
        if (value === null) {
          return 'NULL';
        } else if (typeof value === 'string') {
          // Escape single quotes and backslashes
          const escaped = value.replace(/'/g, "''").replace(/\\/g, '\\\\');
          return `'${escaped}'`;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        } else {
          // For other types (like objects), JSON stringify and escape
          const jsonValue = JSON.stringify(value);
          const escaped = jsonValue.replace(/'/g, "''").replace(/\\/g, '\\\\');
          return `'${escaped}'`;
        }
      });

      sqlDump += `INSERT INTO "${tableName}" (${columnList}) VALUES (${values.join(
        ', '
      )});\\n`;
    }

    sqlDump += '\\n';
  }

  return sqlDump;
}