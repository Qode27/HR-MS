#!/usr/bin/env bash
# Post-deployment smoke test used by the CD pipeline (Day 7).
# Retries for a while because new pods may still be warming up.
# Usage: ./smoke-test.sh https://peopleflow-dev.example.com [expected_version]
set -euo pipefail

BASE_URL="${1:?usage: smoke-test.sh <base_url> [expected_version]}"
RETRIES="${RETRIES:-20}"
SLEEP="${SLEEP:-6}"

for i in $(seq 1 "$RETRIES"); do
  if curl -fsS --max-time 5 "$BASE_URL/api/health/readiness" >/dev/null; then
    echo "readiness OK on attempt $i"
    break
  fi
  if [[ $i -eq $RETRIES ]]; then
    echo "readiness never became healthy" >&2
    exit 1
  fi
  echo "attempt $i/$RETRIES not ready yet, waiting ${SLEEP}s"
  sleep "$SLEEP"
done

# Liveness payload must be valid JSON with status ok
body=$(curl -fsS --max-time 5 "$BASE_URL/api/health")
echo "$body" | grep -q '"status":"ok"' || { echo "unexpected health body: $body" >&2; exit 1; }

# Login page must render
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/login")
[[ "$code" == "200" ]] || { echo "/login returned $code" >&2; exit 1; }

echo "SMOKE TEST PASSED for $BASE_URL"
