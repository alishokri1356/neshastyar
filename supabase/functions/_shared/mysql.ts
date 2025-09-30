import { createPool } from 'https://deno.land/x/mysql@v2.12.1/mod.ts';

const pool = createPool({
  hostname: '195.248.240.30',
  username: 'modiryar_app',
  password: 'Terraworld2020',
  db: 'modiryar',
  port: 3306,
  poolSize: 3,
  timeout: 10000,
});

export const query = async (sql: string, params?: any[]) => {
  const conn = await pool.getConnection();
  try {
    const result = await conn.execute(sql, params);
    return result;
  } finally {
    conn.close();
  }
};

export const queryOne = async (sql: string, params?: any[]) => {
  const result = await query(sql, params);
  return result.rows && result.rows.length > 0 ? result.rows[0] : null;
};
