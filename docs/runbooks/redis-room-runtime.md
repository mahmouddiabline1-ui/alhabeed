# Runbook: Redis or room-runtime incident

## Trigger

Use this runbook when readiness fails, command latency rises, leases cannot be renewed, rooms disappear, or duplicate-command conflicts spike.

## Immediate actions

1. Stop automated scaling and deployment changes.
2. Disable new room creation through edge configuration; keep health and support endpoints available.
3. Check Redis reachability, memory, evictions, connection saturation and replication state.
4. Do not flush Redis and do not restart every API replica together.
5. Preserve logs using request ID, hashed room identifier and command ID; never copy answer text or tokens.

## Recovery

1. Restore Redis service or fail over using the provider procedure.
2. Start one API replica and verify `/ready` plus a disposable three-player match.
3. Confirm version monotonicity, one phase transition and one accepted vote per player.
4. Scale replicas gradually, then re-enable room creation.
5. Compact completed results to PostgreSQL and expire abandoned room snapshots after the incident window.

## Exit evidence

- No duplicate score changes in sampled rooms.
- Reconnect p95 returns below three seconds.
- Command p95 returns below 250 ms.
- Incident timeline, affected room count and follow-up owner are recorded.
