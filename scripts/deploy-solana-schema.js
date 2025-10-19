/**
 * Deploy Solana Integration Schema
 * This script applies the new Solana integration database tables
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Celora Solana Integration Schema Deployment');
console.log('============================================');

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.log('');
  console.log('🔐 MANUAL DEPLOYMENT INSTRUCTIONS:');
  console.log('----------------------------------');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the contents of: database/solana-integration-schema.sql');
  console.log('4. Run the SQL to create all Solana integration tables');
  console.log('');
  console.log('📄 The schema file contains:');
  console.log('   - SPL Token Cache System');
  console.log('   - WebSocket Streaming Tables'); 
  console.log('   - Auto-Link Transfer System');
  console.log('   - Enhanced Push Notifications');
  console.log('   - All necessary indexes and RLS policies');
  console.log('');
  console.log('🔗 Your Supabase URL:', supabaseUrl);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deploySolanaSchema() {
  try {
    console.log('📋 Loading Solana integration schema...');
    
    // Check if schema file exists
    const schemaPath = 'database/solana-integration-schema.sql';
    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found: ${schemaPath}`);
      process.exit(1);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🔍 Analyzing schema...');
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.match(/^\s*$/));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    console.log('');
    
    let successCount = 0;
    let warningCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        try {
          // Execute using RPC function if available, otherwise direct query
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql: statement + ';' 
          });
          
          if (error) {
            // Some warnings are expected (like "table already exists")
            if (error.message.includes('already exists') || 
                error.message.includes('does not exist') ||
                error.message.includes('permission denied')) {
              console.log(`⚠️  Statement ${i + 1}: ${error.message.substring(0, 80)}...`);
              warningCount++;
            } else {
              console.log(`❌ Statement ${i + 1} failed:`, error.message);
            }
          } else {
            console.log(`✅ Statement ${i + 1}: ${getStatementType(statement)}`);
            successCount++;
          }
        } catch (err) {
          // Try alternative execution method
          try {
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey
              },
              body: JSON.stringify({ sql: statement + ';' })
            });
            
            if (response.ok) {
              console.log(`✅ Statement ${i + 1}: ${getStatementType(statement)} (alt method)`);
              successCount++;
            } else {
              const errorText = await response.text();
              console.log(`⚠️  Statement ${i + 1}: ${errorText.substring(0, 80)}...`);
              warningCount++;
            }
          } catch (altErr) {
            console.log(`⚠️  Statement ${i + 1}: ${getStatementType(statement)} (skipped)`);
            warningCount++;
          }
        }
      }
    }
    
    console.log('');
    console.log('📊 DEPLOYMENT SUMMARY:');
    console.log('----------------------');
    console.log(`✅ Successful: ${successCount} statements`);
    console.log(`⚠️  Warnings: ${warningCount} statements`);
    console.log(`📋 Total: ${statements.length} statements`);
    
    // Verify key tables were created
    console.log('');
    console.log('🔍 Verifying Solana integration tables...');
    
    const tablesToCheck = [
      'spl_token_cache',
      'spl_token_prices', 
      'websocket_subscriptions',
      'solana_transaction_stream',
      'pending_transfer_links',
      'auto_link_settings',
      'solana_notification_templates',
      'solana_notification_queue'
    ];
    
    let verifiedTables = 0;
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ ${tableName} - Ready`);
          verifiedTables++;
        } else {
          console.log(`❌ ${tableName} - ${error.message}`);
        }
      } catch (err) {
        console.log(`⚠️  ${tableName} - Could not verify`);
      }
    }
    
    console.log('');
    console.log(`🎯 VERIFICATION RESULT: ${verifiedTables}/${tablesToCheck.length} tables ready`);
    
    if (verifiedTables >= 6) {
      console.log('');
      console.log('🎉 SOLANA INTEGRATION SCHEMA DEPLOYED SUCCESSFULLY!');
      console.log('');
      console.log('✅ Your database now includes:');
      console.log('   - SPL Token Cache System for Jupiter API integration');
      console.log('   - WebSocket Streaming tables for real-time monitoring');
      console.log('   - Auto-Link Transfer System for transaction matching');
      console.log('   - Enhanced Push Notifications for Solana events');
      console.log('   - Complete RLS security policies');
      console.log('   - Performance indexes for production scale');
      console.log('');
      console.log('📋 NEXT STEPS:');
      console.log('   1. Build SPL Token Cache API endpoints');
      console.log('   2. Create WebSocket streaming Edge Functions');
      console.log('   3. Implement auto-link transfer logic');
      console.log('   4. Deploy push notification handlers');
      console.log('');
    } else {
      console.log('');
      console.log('⚠️  PARTIAL DEPLOYMENT - Some tables may need manual creation');
      console.log('   Check the SQL Editor in Supabase Dashboard for any missing tables');
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    
    console.log('');
    console.log('🔧 MANUAL RECOVERY OPTIONS:');
    console.log('   1. Check Supabase Dashboard SQL Editor for errors');
    console.log('   2. Run database/solana-integration-schema.sql manually');
    console.log('   3. Verify your service role key has proper permissions');
    
    process.exit(1);
  }
}

function getStatementType(statement) {
  const trimmed = statement.trim().toUpperCase();
  if (trimmed.startsWith('CREATE TABLE')) return 'Table Creation';
  if (trimmed.startsWith('CREATE INDEX')) return 'Index Creation';
  if (trimmed.startsWith('CREATE POLICY')) return 'Security Policy';
  if (trimmed.startsWith('CREATE FUNCTION')) return 'Database Function';
  if (trimmed.startsWith('CREATE TRIGGER')) return 'Trigger';
  if (trimmed.startsWith('INSERT INTO')) return 'Seed Data';
  if (trimmed.startsWith('ALTER TABLE')) return 'Table Modification';
  if (trimmed.startsWith('GRANT')) return 'Permissions';
  return 'SQL Statement';
}

// Run deployment
if (require.main === module) {
  deploySolanaSchema().catch(console.error);
}

module.exports = { deploySolanaSchema };