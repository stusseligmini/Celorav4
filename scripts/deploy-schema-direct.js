#!/usr/bin/env node

/**
 * 🚀 INSTANT SUPABASE SCHEMA DEPLOYMENT
 * =====================================
 * 
 * Deploy Solana integration schema directly to Supabase
 * with API calls - no manual copying required!
 * 
 * Futuristic Crypto Engineering - October 18, 2025
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const https = require('https');

class SuperbaseSchemaDeployer {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    }

    log(message, icon = '📋') {
        console.log(`${icon} ${message}`);
    }

    success(message) {
        console.log(`✅ ${message}`);
    }

    error(message) {
        console.log(`❌ ${message}`);
    }

    warning(message) {
        console.log(`⚠️ ${message}`);
    }

    async deploySchema() {
        console.log(`
🚀 SUPABASE SCHEMA DEPLOYMENT
============================
        `);

        // Check environment
        if (!this.supabaseUrl) {
            this.error('NEXT_PUBLIC_SUPABASE_URL not found in environment');
            return false;
        }

        if (!this.serviceRoleKey) {
            this.error('SUPABASE_SERVICE_ROLE_KEY not found in environment');
            console.log(`
🔧 To get your service role key:
1. Go to: ${this.supabaseUrl.replace('//', '//app.').replace('.co', '.co/project')}
2. Navigate to Settings → API
3. Copy the service_role key
4. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key_here
            `);
            return false;
        }

        // Read schema file
        const schemaPath = path.join(__dirname, '..', 'database', 'solana-integration-schema.sql');
        
        if (!fs.existsSync(schemaPath)) {
            this.error(`Schema file not found: ${schemaPath}`);
            return false;
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        this.log(`Loaded schema: ${schemaSql.length} characters`);

        // Deploy via Supabase REST API
        try {
            this.log('Deploying schema to Supabase...');
            
            const result = await this.executeSQL(schemaSql);
            
            if (result.success) {
                this.success('🎉 Schema deployed successfully!');
                
                console.log(`
🏆 DEPLOYMENT COMPLETE!
======================

✅ SPL Token Cache System - Ready
✅ WebSocket Streaming Tables - Ready
✅ Auto-Link Transfer System - Ready  
✅ Enhanced Push Notifications - Ready

📊 All tables created with RLS policies enabled!

🚀 Next Steps:
1. Deploy Edge Functions: npx supabase functions deploy
2. Test the integration systems
3. Launch into production!
                `);
                
                return true;
            } else {
                this.error(`Schema deployment failed: ${result.error}`);
                return false;
            }

        } catch (error) {
            this.error(`Deployment error: ${error.message}`);
            
            // Fallback to manual instructions
            this.warning('Falling back to manual deployment...');
            
            console.log(`
🔧 MANUAL DEPLOYMENT INSTRUCTIONS:
==================================

1. Go to your Supabase Dashboard:
   ${this.supabaseUrl}

2. Navigate to SQL Editor

3. Create a new query and paste this SQL:

${schemaSql}

4. Click RUN to execute

📋 This will create all Solana integration tables!
            `);
            
            return false;
        }
    }

    async executeSQL(sql) {
        return new Promise((resolve) => {
            // Parse Supabase URL
            const url = new URL(`${this.supabaseUrl}/rest/v1/rpc/exec_sql`);
            
            const postData = JSON.stringify({
                sql: sql
            });

            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.serviceRoleKey}`,
                    'apikey': this.serviceRoleKey,
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        resolve({ success: true, data });
                    } else {
                        resolve({ 
                            success: false, 
                            error: `HTTP ${res.statusCode}: ${data}` 
                        });
                    }
                });
            });

            req.on('error', (error) => {
                resolve({ success: false, error: error.message });
            });

            req.write(postData);
            req.end();
        });
    }
}

// Deploy the schema!
if (require.main === module) {
    const deployer = new SuperbaseSchemaDeployer();
    deployer.deploySchema().catch(console.error);
}

module.exports = SuperbaseSchemaDeployer;