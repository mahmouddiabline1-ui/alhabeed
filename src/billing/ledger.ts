import { GameError } from "../core/errors.js";
import type { Entitlement, ProductDefinition, VerifiedPurchaseEvent } from "./types.js";

export interface ApplyPurchaseResult { duplicate:boolean; entitlement?:Entitlement }

export interface BillingLedger {
  apply(event:VerifiedPurchaseEvent,product:ProductDefinition):Promise<ApplyPurchaseResult>;
  effectiveEntitlements(userId:string,now?:number):Promise<Entitlement[]>;
}

/** Development ledger mirroring the atomic constraints used by the PostgreSQL adapter. */
export class InMemoryBillingLedger implements BillingLedger {
  private readonly eventIds=new Set<string>();
  private readonly transactions=new Map<string,VerifiedPurchaseEvent>();
  private readonly entitlements=new Map<string,Entitlement>();

  async apply(event:VerifiedPurchaseEvent,product:ProductDefinition):Promise<ApplyPurchaseResult> {
    const eventKey=`${event.provider}:${event.eventId}`;
    if (this.eventIds.has(eventKey)) return {duplicate:true};
    if (event.sku!==product.sku) throw new GameError("SKU_MISMATCH","Verified purchase SKU does not match the product");
    const transactionKey=`${event.provider}:${event.transactionId}`;
    const existing=this.transactions.get(transactionKey);
    if (existing && (existing.userId!==event.userId || existing.sku!==event.sku)) {
      throw new GameError("PURCHASE_REPLAY","Provider transaction is already bound to another purchase");
    }
    this.eventIds.add(eventKey);
    this.transactions.set(transactionKey,structuredClone(event));
    const entitlementKey=`${event.userId}:${product.resourceType}:${product.resourceId}:${event.provider}:${event.originalTransactionId}`;
    const active=["purchased","renewed","grace"].includes(event.state);
    const current=this.entitlements.get(entitlementKey);
    const entitlement:Entitlement={
      userId:event.userId,
      resourceType:product.resourceType,
      resourceId:product.resourceId,
      sourceProvider:event.provider,
      sourceTransactionId:event.originalTransactionId,
      validUntil:event.validUntil,
      ...(active ? {} : {revokedAt:event.occurredAt}),
    };
    if (active && current?.revokedAt && event.occurredAt < current.revokedAt) return {duplicate:false,entitlement:structuredClone(current)};
    this.entitlements.set(entitlementKey,entitlement);
    return {duplicate:false,entitlement:structuredClone(entitlement)};
  }

  async effectiveEntitlements(userId:string,now=Date.now()):Promise<Entitlement[]> {
    return [...this.entitlements.values()].filter(item=>item.userId===userId&&!item.revokedAt&&(item.validUntil===undefined||item.validUntil>now)).map(item=>structuredClone(item));
  }
}

export class EntitlementService {
  private readonly products=new Map<string,ProductDefinition>();
  constructor(private readonly ledger:BillingLedger,products:ProductDefinition[]) {
    for (const product of products) {
      if (this.products.has(product.sku)) throw new Error(`Duplicate SKU ${product.sku}`);
      this.products.set(product.sku,product);
    }
  }
  async recordVerified(event:VerifiedPurchaseEvent):Promise<ApplyPurchaseResult> {
    const product=this.products.get(event.sku);
    if (!product) throw new GameError("UNKNOWN_SKU","Purchase references an unknown SKU");
    return this.ledger.apply(event,product);
  }
  async canUse(userId:string,type:ProductDefinition["resourceType"],id:string,now=Date.now()):Promise<boolean> {
    return (await this.ledger.effectiveEntitlements(userId,now)).some(item=>item.resourceType===type&&item.resourceId===id);
  }
}
