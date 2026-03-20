import { Pool } from 'pg';

// Neon/Vercel may use POSTGRES_URL; we also accept DATABASE_URL
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL or POSTGRES_URL is required. Set it to your Postgres connection string (e.g. from Neon).'
  );
}

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('localhost') ? false : { rejectUnauthorized: false },
});

export function convertPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const converted = convertPlaceholders(sql);
  const result = await pool.query(converted, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

export async function run(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
  const converted = convertPlaceholders(sql);
  const result = await pool.query(converted, params);
  return { changes: result.rowCount ?? 0 };
}

// db-like interface for easier migration (async versions)
export const db = {
  prepare(sql: string) {
    const converted = convertPlaceholders(sql);
    return {
      get: async (...params: unknown[]) => {
        const result = await pool.query(converted, params);
        return result.rows[0];
      },
      all: async (...params: unknown[]) => {
        const result = await pool.query(converted, params);
        return result.rows;
      },
      run: async (...params: unknown[]) => {
        const result = await pool.query(converted, params);
        return { changes: result.rowCount ?? 0 };
      },
    };
  },
  async exec(sql: string) {
    await pool.query(sql);
  },
};
