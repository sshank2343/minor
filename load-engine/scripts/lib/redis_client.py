import os
import json
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

print(f"🔗 Connecting to Redis: {REDIS_URL}")
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

# Test connection
try:
    redis_client.ping()
    print("✅ Redis connection successful")
except Exception as e:
    print(f"❌ Redis connection failed: {e}")

def publish_metric(metric: dict):
    try:
        result = redis_client.publish("telemetry", json.dumps(metric))
        if result == 0:
            print("⚠️ No subscribers listening to telemetry channel")
    except Exception as e:
        print(f"❌ Failed to publish metric to Redis: {e}")
