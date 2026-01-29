#!/bin/sh

echo "Starting Locust Load Engine..."

: "${TARGET_URL:?TARGET_URL not set}"
: "${USERS:?USERS not set}"
: "${SPAWN_RATE:?SPAWN_RATE not set}"
: "${DURATION:?DURATION not set}"

# Check if auto-ramp mode is enabled
if [ "$AUTO_RAMP_MODE" = "true" ]; then
  echo "🤖 Auto-Ramp Mode: Starting capacity discovery..."
  echo "   Initial Users: ${INITIAL_USERS:-1}"
  echo "   User Increment: ${USER_INCREMENT:-5}"
  echo "   Step Duration: ${STEP_DURATION:-30}s"
  echo "   Max Users (Safety): ${MAX_USERS:-1000}"
  
  # Use custom load shape for auto-ramping
  locust \
    -f scripts/locustfile.py \
    --headless \
    --host="$TARGET_URL" \
    --autostart
else
  # Standard or progressive mode
  locust \
    -f scripts/locustfile.py \
    --headless \
    -u "$USERS" \
    -r "$SPAWN_RATE" \
    -t "${DURATION}s" \
    --host="$TARGET_URL"
fi
