import { getDatabase } from '@netlify/database';
import { getStore, getDeployStore } from '@netlify/blobs';

type QueryResult = { rows: Record<string, any>[]; rowCount: number | null };
type QueryClient = { query(sql: string, args?: any[]): Promise<QueryResult> };

// This adapter preserves the app's parameterized query contract while moving
// persistence to PostgreSQL. No buyer-controlled SQL is interpolated.
export function postgresQuery(sql: string) {
  let index = 0;
  const ignoreConflict = /^INSERT OR IGNORE /i.test(sql);
  let query = sql.replace(/^INSERT OR IGNORE /i, 'INSERT ').replace(/\?/g, () => `$${++index}`);
  if (ignoreConflict) query += ' ON CONFLICT DO NOTHING';
  return query;
}

function normalize(rows: Record<string, any>[]) {
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, ['c', 'count', 'sales', 'expires', 'hold_until'].includes(key) && typeof value === 'string' ? Number(value) : value]
  )));
}

class Statement {
  constructor(public sql: string, public args: any[] = []) {}
  bind(...args: any[]) { return new Statement(this.sql, args); }
  async execute(client: QueryClient = getDatabase().pool) {
    const result = await client.query(postgresQuery(this.sql), this.args);
    return { results: normalize(result.rows), meta: { changes: result.rowCount || 0 } };
  }
  async first<T>() { return (await this.execute()).results[0] as T || null; }
  async all<T>() { const result = await this.execute(); return { ...result, results: result.results as T[] }; }
  async run() { return this.execute(); }
}

export function db() {
  return {
    prepare: (sql: string) => new Statement(sql),
    async batch(statements: Statement[]) {
      const client = await getDatabase().pool.connect() as QueryClient & { release(): void };
      try {
        await client.query('BEGIN');
        const results = [];
        for (const statement of statements) results.push(await statement.execute(client));
        await client.query('COMMIT');
        return results;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
  };
}

function fileStore() {
  // Previews must never write into the production file store.
  const name = 'folio-creator-files';
  return process.env.CONTEXT === 'production' || process.env.FOLIO_FILE_SCOPE === 'persistent'
    ? getStore({ name, consistency: 'strong' })
    : getDeployStore({ name, consistency: 'strong' });
}

export function bindings() {
  return {
    DB: db(),
    FILES: {
      async put(key: string, data: ArrayBuffer, _options?: unknown) { await fileStore().set(key, data); },
      async get(key: string) {
        const data = await fileStore().get(key, { type: 'arrayBuffer' });
        return data === null ? null : { body: data as ArrayBuffer };
      },
      async delete(key: string) { await fileStore().delete(key); },
    },
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    SITE_URL: process.env.SITE_URL || process.env.URL,
  };
}
