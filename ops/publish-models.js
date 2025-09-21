#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function main(){
  const dir = path.join('data','neural-models');
  if(!fs.existsSync(dir)) { console.error('No model artifacts present'); process.exit(1); }
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.json'));
  console.log('[publish-models] Publishing to registry (simulated)');
  files.forEach(f=> console.log(' - pushed', f));
  console.log('[publish-models] Done');
}
main();
