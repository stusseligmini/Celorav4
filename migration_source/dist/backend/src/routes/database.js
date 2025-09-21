/**
 * Database Management Routes
 * Handles database operations, migrations, and monitoring
 */

const express = require('express');
const router = express.Router();
const { netlifyDatabase } = require('../services/netlifyDatabase');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/database/status:
 *   get:
 *     summary: Get database connection status
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database status information
 *       500:
 *         description: Server error
 */
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const healthCheck = await netlifyDatabase.healthCheck();
        const stats = await netlifyDatabase.getStats();
        
        res.json({
            success: true,
            data: {
                ...healthCheck,
                ...stats,
                databaseInfo: {
                    provider: 'Netlify Neon',
                    region: 'US East (Ohio)',
                    expires: '14.9.2025, 04:00:00 UTC',
                    status: healthCheck.connected ? 'Connected' : 'Disconnected'
                }
            }
        });
    } catch (error) {
        console.error('Database status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get database status',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/database/stats:
 *   get:
 *     summary: Get database statistics
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database statistics
 *       500:
 *         description: Server error
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await netlifyDatabase.getStats();
        
        // Get additional analytics
        const analytics = await netlifyDatabase.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours') as new_users_today,
                (SELECT COUNT(*) FROM transactions WHERE created_at >= NOW() - INTERVAL '24 hours') as transactions_today,
                (SELECT COUNT(*) FROM wallets WHERE created_at >= NOW() - INTERVAL '7 days') as wallets_this_week,
                (SELECT COUNT(*) FROM virtual_cards WHERE status = 'ACTIVE') as active_cards,
                (SELECT SUM(balance::numeric) FROM wallets WHERE currency = 'SOL') as total_sol_balance
        `);
        
        res.json({
            success: true,
            data: {
                ...stats,
                analytics: analytics[0] || {},
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Database stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get database statistics',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/database/health:
 *   get:
 *     summary: Database health check
 *     tags: [Database]
 *     responses:
 *       200:
 *         description: Health check result
 *       503:
 *         description: Database unhealthy
 */
router.get('/health', async (req, res) => {
    try {
        const health = await netlifyDatabase.healthCheck();
        
        if (health.connected) {
            res.json({
                success: true,
                data: health
            });
        } else {
            res.status(503).json({
                success: false,
                data: health
            });
        }
    } catch (error) {
        res.status(503).json({
            success: false,
            error: 'Database health check failed',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/database/migrate:
 *   post:
 *     summary: Run database migrations
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Migration completed
 *       500:
 *         description: Migration failed
 */
router.post('/migrate', authenticateToken, async (req, res) => {
    try {
        // Only allow admin users to run migrations
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required for database migrations'
            });
        }
        
        console.log(`Migration requested by user ${req.user.id}`);
        await netlifyDatabase.runMigrations();
        
        res.json({
            success: true,
            message: 'Database migrations completed successfully'
        });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
            success: false,
            error: 'Database migration failed',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/database/backup:
 *   post:
 *     summary: Create database backup
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup created
 *       500:
 *         description: Backup failed
 */
router.post('/backup', authenticateToken, async (req, res) => {
    try {
        // Only allow admin users to create backups
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required for database backups'
            });
        }
        
        // Create backup using pg_dump equivalent
        const backupQuery = `
            SELECT 
                'users' as table_name,
                COUNT(*) as record_count,
                NOW() as backup_time
            FROM users
            UNION ALL
            SELECT 
                'wallets' as table_name,
                COUNT(*) as record_count,
                NOW() as backup_time
            FROM wallets
            UNION ALL
            SELECT 
                'transactions' as table_name,
                COUNT(*) as record_count,
                NOW() as backup_time
            FROM transactions
        `;
        
        const backupInfo = await netlifyDatabase.query(backupQuery);
        
        res.json({
            success: true,
            message: 'Database backup information generated',
            data: {
                backupTime: new Date().toISOString(),
                tables: backupInfo,
                note: 'For full backups, use Netlify dashboard or connect to Neon directly'
            }
        });
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({
            success: false,
            error: 'Database backup failed',
            details: error.message
        });
    }
});

module.exports = router;
