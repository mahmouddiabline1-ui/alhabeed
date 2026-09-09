export type BillingProviderId="apple"|"google"|"web";
export type PurchaseState="purchased"|"renewed"|"grace"|"expired"|"refunded"|"revoked"|"chargeback";
export type ResourceType="vip"|"pack"|"character"|"cosmetic";

export interface ProductDefinition {
  sku:string;
  resourceType:ResourceType;
  resourceId:string;
}

export interface VerifiedPurchaseEvent {
  provider:BillingProviderId;
  eventId:string;
  transactionId:string;
  originalTransactionId:string;
  userId:string;
  sku:string;
  state:PurchaseState;
  occurredAt:number;
  validUntil?:number;
}

export interface Entitlement {
  userId:string;
  resourceType:ResourceType;
  resourceId:string;
  sourceProvider:BillingProviderId;
  sourceTransactionId:string;
  validUntil?:number;
  revokedAt?:number;
}

export interface BillingProvider {
  verifyPurchase(input:unknown):Promise<VerifiedPurchaseEvent>;
  parseWebhook(headers:Headers,rawBody:Uint8Array):Promise<VerifiedPurchaseEvent>;
  acknowledge?(purchase:VerifiedPurchaseEvent):Promise<void>;
}
