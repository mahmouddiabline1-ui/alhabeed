# Runbook: Payment provider or entitlement incident

## Safety rule

Never grant access from a client receipt or ad callback that has not passed server-side provider verification. Provider timeout means pending, not success or failure.

## Provider outage

1. Keep existing unexpired entitlements effective.
2. Mark new attempts pending and show a retry-safe message; do not repeatedly charge.
3. Pause reconciliation only if it is amplifying provider errors.
4. Queue signed notifications without modifying their raw body.
5. After recovery, replay the inbox by unique provider event ID and run reconciliation.

## Suspicious grant spike

1. Enable the purchase kill switch for the affected provider/SKU.
2. Preserve webhook digests, transaction IDs and audit logs; redact receipts and account secrets.
3. Compare grants with the provider API and isolate replayed account/transaction pairs.
4. Revoke only from verified refund/revoke evidence or the documented incident decision.

## Exit evidence

- Duplicate replays produce no new entitlement.
- Purchase-to-entitlement p95 is below ten seconds.
- Pending, renewed, expired, refunded and revoked samples match provider state.
- Finance/support receive an incident summary and impacted-account export.
