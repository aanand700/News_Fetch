import { Pool } from 'pg';

function getConnectionString(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = getConnectionString();
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL (or POSTGRES_URL) is required. In Vercel: connect Neon to this project or add DATABASE_URL under Environment Variables.'
      );
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export function convertPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const converted = convertPlaceholders(sql);
  const result = await getPool().query(converted, params);
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
  const result = await getPool().query(converted, params);
  return { changes: result.rowCount ?? 0 };
}

// db-like interface for easier migration (async versions)
export const db = {
  prepare(sql: string) {
    const converted = convertPlaceholders(sql);
    return {
      get: async (...params: unknown[]) => {
        const result = await getPool().query(converted, params);
        return result.rows[0];
      },
      all: async (...params: unknown[]) => {
        const result = await getPool().query(converted, params);
        return result.rows;
      },
      run: async (...params: unknown[]) => {
        const result = await getPool().query(converted, params);
        return { changes: result.rowCount ?? 0 };
      },
    };
  },
  async exec(sql: string) {
    await getPool().query(sql);
  },
};
