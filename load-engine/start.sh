#!/bin/sh

echo "🔍 Starting Breaking Point Finder Load Engine..."

# Validate required environment variables
: "${TARGET_BASE_URL:?TARGET_BASE_URL not set}"
: "${ENDPOINT_PATH:?ENDPOINT_PATH not set}"
: "${METHOD:?METHOD not set}"
: "${START_USERS:?START_USERS not set}"
: "${STEP_USERS:?STEP_USERS not set}"
: "${STEP_DURATION:?STEP_DURATION not set}"
: "${MAX_USERS:?MAX_USERS not set}"
: "${REDIS_URL:?REDIS_URL not set}"

echo "📊 Test Configuration:"
echo "   Endpoint: ${METHOD} ${TARGET_BASE_URL}${ENDPOINT_PATH}"
echo "   Ramp: ${START_USERS} users → ${MAX_USERS} users (step: ${STEP_USERS} every ${STEP_DURATION}s)"
echo "   Stop Conditions: Error ${MAX_ERROR_RATE}%, P95 ${MAX_P95_LATENCY_MS}ms, Timeout ${MAX_TIMEOUT_RATE}%"
echo ""

# Start Locust with custom LoadTestShape
locust \
  -f scripts/locustfile.py \
  --headless \
  --host="$TARGET_BASE_URL" \
  --autostart
