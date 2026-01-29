import os
import json
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

def publish_metric(metric: dict):
    try:
        redis_client.publish("telemetry", json.dumps(metric))
    except Exception as e:
        print("Failed to publish metric to Redis:", e)
