#!/usr/bin/env node
import { ResilientRPCManager, FundingBridge } from '@celora/infrastructure';

async function main(){
  const rpc = new ResilientRPCManager();
  await rpc.init();
  const bridge = new FundingBridge(rpc);
  const res = await bridge.fundVirtualCard({
    chain: 'solana',
    sourceAddress: 'SimulatedSourcePubkey',
    targetCardId: 'card-123',
    amount: 0.05
  });
  console.log('[verify-funding] result=', res);
}
main().catch(e=>{console.error(e);process.exit(1);});
