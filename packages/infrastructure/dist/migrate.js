"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const pg_1 = require("pg");
const env_1 = require("./env");
const logger_1 = require("./logger");
function checksum(content) {
    return crypto_1.default.createHash('sha256').update(content, 'utf8').digest('hex');
}
async function ensureRegistry(client) {
    const registrySql = fs_1.default.readFileSync(path_1.default.join(__dirname, 'migrations', '000_registry.sql'), 'utf8');
    await client.query(registrySql);
}
async function getApplied(client) {
    const res = await client.query('SELECT filename, checksum FROM _celora_migrations');
    return res.rows.reduce((acc, r) => {
        acc[r.filename] = r.checksum;
        return acc;
    }, {});
}
async function applyMigration(client, file, sql, digest) {
    logger_1.logger.info({ migration: file.name }, 'Applying');
    await client.query('BEGIN');
    try {
        await client.query(sql);
        await client.query('INSERT INTO _celora_migrations (filename, checksum) VALUES ($1,$2)', [file.name, digest]);
        await client.query('COMMIT');
        logger_1.logger.info({ migration: file.name }, 'Applied');
    }
    catch (e) {
        await client.query('ROLLBACK');
        logger_1.logger.error({ migration: file.name, error: e.message }, 'Failed');
        throw e;
    }
}
async function main() {
    const env = (0, env_1.loadEnv)();
    const { DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } = env;
    const connectionString = DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL is required for migrations.');
        process.exit(1);
    }
    const client = new pg_1.Client({ connectionString });
    await client.connect();
    logger_1.logger.info('Connected to database');
    await ensureRegistry(client);
    const applied = await getApplied(client);
    const migrationsDir = path_1.default.join(__dirname, 'migrations');
    const files = fs_1.default.readdirSync(migrationsDir)
        .filter(f => /\d+_.*\.sql$/.test(f) && f !== '000_registry.sql')
        .map(f => ({ name: f, fullPath: path_1.default.join(migrationsDir, f), order: parseInt(f.split('_')[0], 10) }))
        .sort((a, b) => a.order - b.order);
    for (const file of files) {
        const sql = fs_1.default.readFileSync(file.fullPath, 'utf8');
        const digest = checksum(sql);
        if (applied[file.name]) {
            if (applied[file.name] !== digest) {
                logger_1.logger.error({ migration: file.name }, 'Checksum mismatch! Migration file changed after apply.');
                process.exit(1);
            }
            logger_1.logger.info({ migration: file.name }, 'Already applied – skipping');
            continue;
        }
        await applyMigration(client, file, sql, digest);
    }
    logger_1.logger.info('All pending migrations applied');
    await client.end();
}
main().catch(err => {
    logger_1.logger.error({ error: err.stack }, 'Migration process failed');
    process.exit(1);
});
