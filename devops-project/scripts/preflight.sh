#!/usr/bin/env bash
# Day 2 - checks a learner's machine has every tool the project needs.
set -uo pipefail

need() {
  local tool="$1" hint="$2"
  if command -v "$tool" >/dev/null 2>&1; then
    printf "  [ OK ] %-10s %s\n" "$tool" "$("$tool" --version 2>/dev/null | head -1)"
  else
    printf "  [MISS] %-10s install: %s\n" "$tool" "$hint"
    MISSING=1
  fi
}

MISSING=0
echo "Checking tools..."
need git       "https://git-scm.com"
need node      "Node.js 20 LTS"
need npm       "comes with Node.js"
need docker    "Docker Desktop / Docker Engine"
need kubectl   "https://kubernetes.io/docs/tasks/tools/"
need kind      "https://kind.sigs.k8s.io"
need helm      "https://helm.sh/docs/intro/install/"
need terraform "https://developer.hashicorp.com/terraform/install"
need az        "Azure CLI"

echo
echo "Disk and memory:"
df -h . | tail -1
free -h 2>/dev/null | sed -n 2p || true

[[ $MISSING -eq 0 ]] && echo "All tools present." || echo "Install the missing tools before the next lab."
exit $MISSING
