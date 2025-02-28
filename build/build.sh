#!/bin/bash

[ -z "$REPO" ] && REPO="ops-prod-us-phoenix-1-registry.jitsi.net"
# if the tag is not defined grab the current git short hash
[ -z "$TAG" ] && TAG="$(git rev-parse --short HEAD)"
echo "Building $REPO/jaas-test-wh-proxy:$TAG"
docker buildx build --no-cache --platform=linux/arm64,linux/amd64 --push --pull --progress=plain --tag $REPO/jaas-test-wh-proxy:$TAG --tag $REPO/jaas-test-wh-proxy:latest .
