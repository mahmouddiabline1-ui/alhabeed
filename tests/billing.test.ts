import test from "node:test";
import assert from "node:assert/strict";
import { EntitlementService, InMemoryBillingLedger } from "../src/billing/ledger.js";
import type { VerifiedPurchaseEvent } from "../src/billing/types.js";
import { GameError } from "../src/core/errors.js";

const product={sku:"vip_monthly",resourceType:"vip" as const,resourceId:"vip"};
const purchase=(overrides:Partial<VerifiedPurchaseEvent>={}):VerifiedPurchaseEvent=>({provider:"apple",eventId:"event-1",transactionId:"tx-1",originalTransactionId:"original-1",userId:"user-1",sku:"vip_monthly",state:"purchased",occurredAt:1000,validUntil:5000,...overrides});

test("verified purchase grants VIP once and duplicate webhook is harmless",async()=>{
  const service=new EntitlementService(new InMemoryBillingLedger(),[product]);
  assert.equal((await service.recordVerified(purchase())).duplicate,false);
  assert.equal((await service.recordVerified(purchase())).duplicate,true);
  assert.equal(await service.canUse("user-1","vip","vip",2000),true);
});

test("refund revokes an entitlement",async()=>{
  const service=new EntitlementService(new InMemoryBillingLedger(),[product]);
  await service.recordVerified(purchase());
  await service.recordVerified(purchase({eventId:"event-2",state:"refunded",occurredAt:2000}));
  assert.equal(await service.canUse("user-1","vip","vip",2500),false);
});

test("a transaction cannot be replayed onto another account",async()=>{
  const service=new EntitlementService(new InMemoryBillingLedger(),[product]);
  await service.recordVerified(purchase());
  await assert.rejects(()=>service.recordVerified(purchase({eventId:"event-2",userId:"attacker"})),(error:unknown)=>error instanceof GameError&&error.code==="PURCHASE_REPLAY");
});

test("expired subscriptions are not effective",async()=>{
  const service=new EntitlementService(new InMemoryBillingLedger(),[product]);
  await service.recordVerified(purchase({validUntil:1500}));
  assert.equal(await service.canUse("user-1","vip","vip",1500),false);
});
