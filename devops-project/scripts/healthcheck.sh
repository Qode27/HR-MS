#!/usr/bin/env bash
# Day 3 - checks that each tier of PeopleFlow HR is reachable.
# Usage: ./healthcheck.sh [base_url]     (default http://localhost:8080)
# Exit code 0 = healthy, 1 = something is down (usable by cron, CI and alerts).
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
TIMEOUT="${TIMEOUT:-5}"
FAILED=0

check() {
  local name="$1" url="$2" expected="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" || echo "000")
  if [[ "$code" == "$expected" ]]; then
    printf "  [ OK ] %-22s %s (%s)\n" "$name" "$url" "$code"
  else
    printf "  [FAIL] %-22s %s (got %s, want %s)\n" "$name" "$url" "$code" "$expected"
    FAILED=1
  fi
}

echo "PeopleFlow HR health check -> $BASE_URL"
check "edge (web tier)"     "$BASE_URL/nginx-health"
check "app liveness"        "$BASE_URL/api/health"
check "app + db readiness"  "$BASE_URL/api/health/readiness"
check "login page"          "$BASE_URL/login"

if [[ $FAILED -ne 0 ]]; then
  echo "RESULT: UNHEALTHY"
  exit 1
fi
echo "RESULT: HEALTHY"
