import json
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from app.core.config import LOG_FILE_PATH
from app.agents.root_cause import analyze_log_entry


class LogFileHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path != LOG_FILE_PATH:
            return

        try:
            with open(LOG_FILE_PATH, "r") as f:
                for line in f.readlines()[-5:]:
                    try:
                        log_entry = json.loads(line)
                        analyze_log_entry(log_entry)
                    except json.JSONDecodeError:
                        pass
        except FileNotFoundError:
            pass


def start_log_watcher():
    observer = Observer()
    handler = LogFileHandler()
    observer.schedule(handler, path="/shared/logs", recursive=False)
    observer.start()

    print("Log watcher started, monitoring victim logs")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()
