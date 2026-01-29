#!/bin/sh

echo "Starting Locust Load Engine..."

: "${TARGET_URL:?TARGET_URL not set}"
: "${USERS:?USERS not set}"
: "${SPAWN_RATE:?SPAWN_RATE not set}"
: "${DURATION:?DURATION not set}"

locust \
  -f scripts/locustfile.py \
  --headless \
  -u "$USERS" \
  -r "$SPAWN_RATE" \
  -t "${DURATION}s" \
  --host="$TARGET_URL"
