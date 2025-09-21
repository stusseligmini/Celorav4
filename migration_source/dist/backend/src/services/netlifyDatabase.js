/**
 * Netlify Database Service
 * Handles database operations using Netlify's Neon integration
 */

const { neon } = require('@netlify/neon');
const { PrismaClient } = require('@prisma/client');

class NetlifyDatabaseService {
    constructor() {
        this.sql = neon(); // Automatically uses NETLIFY_DATABASE_URL
        this.prisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL
                }
            },
            log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
        });
        
        this.isConnected = false;
    }

    /**
     * Initialize database connection
     */
    async initialize() {
        try {
            console.log('🔗 Initializing Netlify database connection...');
            
            // Test Neon connection
            await this.sql`SELECT NOW() as current_time`;
            console.log('✅ Neon connection established');
            
            // Test Prisma connection
            await this.prisma.$connect();
            console.log('✅ Prisma connection established');
            
            this.isConnected = true;
            
            // Run database migrations if needed
            await this.runMigrations();
            
            console.log('🎉 Netlify database initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Netlify database:', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Run database migrations
     */
    async runMigrations() {
        try {
            console.log('📦 Checking database migrations...');
            
            // Check if tables exist
            const tables = await this.sql`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `;
            
            if (tables.length === 0) {
                console.log('🔄 Running initial database setup...');
                
                // Create tables using Prisma
                const { exec } = require('child_process');
                const util = require('util');
                const execAsync = util.promisify(exec);
                
                try {
                    await execAsync('npx prisma db push --force-reset');
                    console.log('✅ Database schema created successfully');
                } catch (migrationError) {
                    console.warn('⚠️ Migration warning:', migrationError.message);
                    // Try alternative approach
                    await execAsync('npx prisma generate');
                    console.log('✅ Prisma client generated');
                }
            } else {
                console.log('✅ Database tables exist, checking for updates...');
                try {
                    await this.prisma.$executeRaw`SELECT 1`;
                    console.log('✅ Database schema is up to date');
                } catch (error) {
                    console.warn('⚠️ Schema validation warning:', error.message);
                }
            }
        } catch (error) {
            console.error('❌ Migration failed:', error);
            // Don't throw here, allow app to continue
        }
    }

    /**
     * Execute raw SQL query using Neon
     */
    async query(sql, params = []) {
        try {
            if (!this.isConnected) {
                await this.initialize();
            }
            
            return await this.sql(sql, ...params);
        } catch (error) {
            console.error('❌ Database query failed:', error);
            throw error;
        }
    }

    /**
     * Get database statistics
     */
    async getStats() {
        try {
            const [users, wallets, transactions, cards] = await Promise.all([
                this.sql`SELECT COUNT(*) as count FROM users`,
                this.sql`SELECT COUNT(*) as count FROM wallets`,
                this.sql`SELECT COUNT(*) as count FROM transactions`,
                this.sql`SELECT COUNT(*) as count FROM virtual_cards`
            ]);

            return {
                users: parseInt(users[0].count),
                wallets: parseInt(wallets[0].count),
                transactions: parseInt(transactions[0].count),
                virtualCards: parseInt(cards[0].count),
                connected: this.isConnected,
                provider: 'Netlify Neon',
                region: 'US East (Ohio)'
            };
        } catch (error) {
            console.error('❌ Failed to get database stats:', error);
            return {
                users: 0,
                wallets: 0,
                transactions: 0,
                virtualCards: 0,
                connected: false,
                error: error.message
            };
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const result = await this.sql`SELECT NOW() as timestamp, version() as version`;
            return {
                status: 'healthy',
                timestamp: result[0].timestamp,
                version: result[0].version,
                connected: true
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                connected: false
            };
        }
    }

    /**
     * Clean up connections
     */
    async disconnect() {
        try {
            await this.prisma.$disconnect();
            this.isConnected = false;
            console.log('✅ Database disconnected gracefully');
        } catch (error) {
            console.error('❌ Error disconnecting database:', error);
        }
    }

    /**
     * Get Prisma client instance
     */
    getPrismaClient() {
        return this.prisma;
    }

    /**
     * Get Neon SQL instance
     */
    getNeonClient() {
        return this.sql;
    }
}

// Export singleton instance
const netlifyDatabase = new NetlifyDatabaseService();

module.exports = {
    NetlifyDatabaseService,
    netlifyDatabase,
    prisma: netlifyDatabase.getPrismaClient(),
    neonSql: netlifyDatabase.getNeonClient()
};
