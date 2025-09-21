#!/usr/bin/env node
import { ResilientRPCManager } from '@celora/infrastructure';

async function main(){
  const mgr = new ResilientRPCManager();
  await mgr.init();
  console.log('[verify-rpc] Initialized RPC manager. (Further health snapshot API TBD)');
}
main().catch(e=>{console.error(e);process.exit(1);});
