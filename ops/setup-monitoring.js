#!/usr/bin/env node
const arg = process.argv.find(a=>a.startsWith('--type='));
const type = arg ? arg.split('=')[1] : 'drift';
console.log(`[setup-monitoring] Setting up ${type} monitoring (stub)`);
console.log(' - Creating dashboard definitions');
console.log(' - Registering alert policies');
console.log('[setup-monitoring] Complete');
