#!/bin/bash


docker buildx build --no-cache --platform=linux/arm64,linux/amd64 --push --pull --progress=plain --tag aaronkvanmeerten/ops-agent:$TAG --tag aaronkvanmeerten/ops-agent:latest .
