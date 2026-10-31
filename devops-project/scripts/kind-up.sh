#!/usr/bin/env bash
# Day 10 - creates a local Kubernetes cluster with an NGINX ingress controller,
# builds the images and loads them into the cluster.
# Run from the repository root:  devops-project/scripts/kind-up.sh
set -euo pipefail

CLUSTER="${CLUSTER:-peopleflow}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DP="$ROOT/devops-project"

if ! kind get clusters | grep -qx "$CLUSTER"; then
  kind create cluster --name "$CLUSTER" --config "$DP/k8s/kind-config.yaml"
fi

echo "Installing ingress-nginx for kind..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/kind/deploy.yaml
kubectl -n ingress-nginx wait --for=condition=Ready pod -l app.kubernetes.io/component=controller --timeout=180s

echo "Building images..."
docker build -f "$DP/docker/Dockerfile" --target runner   -t peopleflow-web:local      "$ROOT"
docker build -f "$DP/docker/Dockerfile" --target migrator -t peopleflow-migrator:local "$ROOT"

echo "Loading images into kind..."
kind load docker-image peopleflow-web:local peopleflow-migrator:local --name "$CLUSTER"

echo "Cluster ready. Next: kubectl apply -k devops-project/k8s/overlays/local"
