#!/usr/bin/env bash
# Check staging worker logs for realtime retry-storm symptoms.
# Usage: RAILWAY_TOKEN=... ./scripts/check-realtime-health.sh [minutes-back]
set -euo pipefail

ENV_ID="bf3e9d3e-1d62-493d-b18a-635a0d0a665f"   # staging
ANCHOR="${1:-30}"                                # minutes back
SINCE=$(date -u -d "-${ANCHOR} minutes" +%Y-%m-%dT%H:%M:%S.000Z)

resp=$(curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer ${RAILWAY_TOKEN:?set RAILWAY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"query(\$environmentId:String!){ environmentLogs(environmentId:\$environmentId,anchorDate:\\\"${SINCE}\\\",afterLimit:2000){ message timestamp } }\",\"variables\":{\"environmentId\":\"${ENV_ID}\"}}")

echo "$resp" | python3 -c '
import json, sys
from collections import Counter
d = json.load(sys.stdin)
logs = d.get("data", {}).get("environmentLogs")
if logs is None:
    print("GraphQL error:", d); raise SystemExit(1)
c = Counter()
rate_limit = 0
for l in logs:
    m = l["message"]
    if "subscription CLOSED" in m or "CHANNEL_ERROR" in m:
        c["realtime failures"] += 1
    elif "subscription active" in m:
        c["successful subscribes"] += 1
    elif "Health check" in m:
        c["health-check resubscribes"] += 1
    elif "rate limit" in m.lower():
        rate_limit += 1
print(f"log lines scanned: {len(logs)}")
for k, v in sorted(c.items()):
    print(f"{k}: {v}")
print(f"railway rate-limit warnings: {rate_limit}")
fail = c.get("realtime failures", 0)
if rate_limit or fail > 50:
    print("STATUS: UNHEALTHY — storm pattern present")
elif fail > 10:
    print("STATUS: DEGRADED — persistent reconnects (check Supabase realtime)")
else:
    print("STATUS: HEALTHY")
'
