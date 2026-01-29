from locust import HttpUser, task, between
import os
import time
import json
from lib.redis_client import publish_metric

class ScaleSimUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        self.start_time = time.time()

    @task
    def hit_target(self):
        start = time.time()

        with self.client.get("/", catch_response=True) as response:
            latency = int((time.time() - start) * 1000)

            metric = {
                "latency_ms": latency,
                "status_code": response.status_code,
                "timestamp": time.time()
            }

            publish_metric(metric)

            if response.status_code != 200:
                response.failure("Non-200 response")
            else:
                response.success()
