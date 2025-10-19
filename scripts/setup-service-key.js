#!/usr/bin/env node

/**
 * 🔧 SUPABASE SERVICE ROLE KEY SETUP HELPER
 * ==========================================
 * 
 * This script helps you add the Supabase Service Role Key
 * to enable automated database deployments.
 * 
 * Futuristic Crypto Engineering - October 18, 2025
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🔐 SUPABASE SERVICE ROLE KEY SETUP
==================================

To enable automated database deployment, we need your Supabase Service Role Key.

📍 How to find it:
1. Go to: https://zpcycakwdvymqhwvakrv.supabase.co
2. Navigate to: Settings → API
3. Copy the "service_role" key (starts with "eyJ...")

⚠️  SECURITY NOTE: This key has full database access. Keep it secure!
`);

rl.question('Paste your Supabase Service Role Key (or press Enter to skip): ', (serviceRoleKey) => {
  if (!serviceRoleKey.trim()) {
    console.log('\n❌ Skipped - You can add it manually to .env.local later');
    console.log('Add this line: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
    rl.close();
    return;
  }

  // Validate key format
  if (!serviceRoleKey.startsWith('eyJ')) {
    console.log('\n❌ Invalid key format - Should start with "eyJ"');
    rl.close();
    return;
  }

  // Update .env.local file
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.log('\n❌ .env.local file not found');
    rl.close();
    return;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace the placeholder line
  const placeholder = '# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here';
  const newLine = `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`;
  
  if (envContent.includes(placeholder)) {
    envContent = envContent.replace(placeholder, newLine);
  } else if (envContent.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
    // Update existing key
    envContent = envContent.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/g, newLine);
  } else {
    // Add new key
    envContent += `\n${newLine}\n`;
  }

  fs.writeFileSync(envPath, envContent);

  console.log(`
✅ SUCCESS! Service Role Key added to .env.local

🚀 Now you can run automated deployment:
   node scripts/deploy-solana-complete.js

🔧 Or deploy the database schema directly:
   node deploy-solana-schema.js
  `);

  rl.close();
});

rl.on('close', () => {
  process.exit(0);
});