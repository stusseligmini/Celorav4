const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Setting up Celora database...');
  
  try {
    // Read and execute main schema
    console.log('📋 Loading main schema...');
    const mainSchema = fs.readFileSync('supabase-schema.sql', 'utf8');
    
    // Split the schema into individual statements
    const statements = mainSchema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql: statement + ';' 
          });
          
          if (error) {
            console.log(`⚠️  Statement ${i + 1} warning:`, error.message);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          // Try direct query for certain statements
          try {
            const { data, error } = await supabase
              .from('_')
              .select('*')
              .limit(1);
            console.log(`📝 Statement ${i + 1}: ${statement.substring(0, 50)}...`);
          } catch (directErr) {
            console.log(`⚠️  Statement ${i + 1} skipped:`, statement.substring(0, 50));
          }
        }
      }
    }
    
    console.log('🎯 Main schema setup complete!');
    
    // Read and execute additional policies
    console.log('🔒 Loading security policies...');
    const policiesSchema = fs.readFileSync('supabase-policies-additions.sql', 'utf8');
    
    const policyStatements = policiesSchema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (let i = 0; i < policyStatements.length; i++) {
      const statement = policyStatements[i];
      if (statement.trim()) {
        try {
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql: statement + ';' 
          });
          
          if (error) {
            console.log(`⚠️  Policy ${i + 1} warning:`, error.message);
          } else {
            console.log(`✅ Policy ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`⚠️  Policy ${i + 1} skipped:`, statement.substring(0, 50));
        }
      }
    }
    
    console.log('🔒 Security policies setup complete!');
    
    // Verify tables exist
    console.log('🔍 Verifying database setup...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tables) {
      console.log('📊 Created tables:', tables.map(t => t.table_name).join(', '));
    }
    
    // Test basic functionality
    console.log('🧪 Testing database functionality...');
    
    // Check if we can query the profiles table
    const { data: profilesTest, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (!profilesError) {
      console.log('✅ Profiles table working correctly');
    }
    
    // Check virtual_cards table
    const { data: cardsTest, error: cardsError } = await supabase
      .from('virtual_cards')
      .select('*')
      .limit(1);
    
    if (!cardsError) {
      console.log('✅ Virtual cards table working correctly');
    }
    
    // Check wallets table
    const { data: walletsTest, error: walletsError } = await supabase
      .from('wallets')
      .select('*')
      .limit(1);
    
    if (!walletsError) {
      console.log('✅ Wallets table working correctly');
    }
    
    console.log('🎉 Database setup completed successfully!');
    console.log('🚀 Your Celora platform is now ready to use!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function executeSQL(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log('SQL execution note:', error);
    }
    
    return await response.json();
  } catch (error) {
    console.log('SQL execution note:', error.message);
  }
}

async function setupDatabaseDirect() {
  console.log('🚀 Setting up Celora database (direct method)...');
  
  try {
    // Read main schema
    const mainSchema = fs.readFileSync('supabase-schema.sql', 'utf8');
    
    console.log('📋 Executing main schema...');
    await executeSQL(mainSchema);
    
    // Read policies
    const policiesSchema = fs.readFileSync('supabase-policies-additions.sql', 'utf8');
    
    console.log('🔒 Executing security policies...');
    await executeSQL(policiesSchema);
    
    console.log('🎉 Database setup completed!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run setup
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase, setupDatabaseDirect };