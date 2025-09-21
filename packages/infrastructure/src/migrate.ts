import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Client } from 'pg';
import { loadEnv } from './env';
import { logger } from './logger';

interface MigrationFile { name: string; fullPath: string; order: number; }

function checksum(content: string) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function ensureRegistry(client: Client) {
  const registrySql = fs.readFileSync(path.join(__dirname, 'migrations', '000_registry.sql'), 'utf8');
  await client.query(registrySql);
}

async function getApplied(client: Client): Promise<Record<string, string>> {
  const res = await client.query<{ filename: string; checksum: string }>('SELECT filename, checksum FROM _celora_migrations');
  return res.rows.reduce<Record<string,string>>((acc: Record<string,string>, r: { filename: string; checksum: string }) => {
    acc[r.filename] = r.checksum;
    return acc;
  }, {});
}

async function applyMigration(client: Client, file: MigrationFile, sql: string, digest: string) {
  logger.info({ migration: file.name }, 'Applying');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO _celora_migrations (filename, checksum) VALUES ($1,$2)', [file.name, digest]);
    await client.query('COMMIT');
    logger.info({ migration: file.name }, 'Applied');
  } catch (e) {
    await client.query('ROLLBACK');
    logger.error({ migration: file.name, error: (e as Error).message }, 'Failed');
    throw e;
  }
}

async function main() {
  const env = loadEnv();
  const { DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } = env as any;

  const connectionString = DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required for migrations.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();
  logger.info('Connected to database');

  await ensureRegistry(client);
  const applied = await getApplied(client);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => /\d+_.*\.sql$/.test(f) && f !== '000_registry.sql')
    .map<MigrationFile>(f => ({ name: f, fullPath: path.join(migrationsDir, f), order: parseInt(f.split('_')[0], 10) }))
    .sort((a, b) => a.order - b.order);

  for (const file of files) {
    const sql = fs.readFileSync(file.fullPath, 'utf8');
    const digest = checksum(sql);

    if (applied[file.name]) {
      if (applied[file.name] !== digest) {
        logger.error({ migration: file.name }, 'Checksum mismatch! Migration file changed after apply.');
        process.exit(1);
      }
      logger.info({ migration: file.name }, 'Already applied – skipping');
      continue;
    }
    await applyMigration(client, file, sql, digest);
  }

  logger.info('All pending migrations applied');
  await client.end();
}

main().catch(err => {
  logger.error({ error: (err as Error).stack }, 'Migration process failed');
  process.exit(1);
});
