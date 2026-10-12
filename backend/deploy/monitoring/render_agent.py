"""Merge the owned log source and minimal host metrics without losing unrelated sources."""

import json
import sys
from pathlib import Path


def render(existing, environment, role):
    if environment not in ("dev", "prod") or role not in ("backend", "database"):
        raise ValueError("Expected dev|prod and backend|database")
    config = json.loads(json.dumps(existing))
    config.setdefault("agent", {}).update(region="ap-northeast-2", run_as_user="root")
    logs = config.setdefault("logs", {})
    logs.setdefault("force_flush_interval", 5)
    entries = logs.setdefault("logs_collected", {}).setdefault("files", {}).setdefault("collect_list", [])
    path = "/var/log/yesulin/yesulin.log" if role == "backend" else "/var/log/yesulin-monitoring/database.jsonl"
    owned = {
        "file_path": path,
        "log_group_name": f"/yesulin/{environment}/{role}",
        "log_stream_name": "{instance_id}",
    }
    if role == "backend":
        owned.update(timestamp_format="%Y-%m-%dT%H:%M:%S.%f", timezone="Local", filters=[{
            "type": "include",
            "expression": r'"event"\s*:\s*"(HTTP_REQUEST|RUNTIME_METRICS|RUNTIME_METRICS_FAILURE|UNEXPECTED_ERROR|UNEXPECTED_SERVICE_ERROR|SLOW_SERVICE)"',
        }])
    else:
        owned["retention_in_days"] = 14
    for entry in entries:
        if entry.get("file_path") == path:
            if entry.get("log_group_name") != owned["log_group_name"]:
                raise ValueError("Owned log source points at another environment; refusing to replace")
            entry.clear()
            entry.update(owned)
            break
    else:
        entries.append(owned)
    # Database host memory/swap/I/O is emitted by the SQL collector, avoiding duplicate custom metrics.
    if role == "backend":
        metrics = config.setdefault("metrics", {})
        metrics.setdefault("namespace", "CWAgent")
        metrics.setdefault("append_dimensions", {}).setdefault("InstanceId", "${aws:InstanceId}")
        collected = metrics.setdefault("metrics_collected", {})
        collected.setdefault("mem", {"measurement": ["mem_available"], "metrics_collection_interval": 60})
        collected.setdefault("swap", {"measurement": ["swap_used_percent"], "metrics_collection_interval": 60})
        for plugin in ("mem", "swap"):
            collected[plugin].setdefault("append_dimensions", {}).update(Environment=environment, Service="backend")
    return config


if __name__ == "__main__":
    source, destination, environment, role = sys.argv[1:]
    existing = json.loads(Path(source).read_text()) if Path(source).exists() else {}
    Path(destination).write_text(json.dumps(render(existing, environment, role), indent=2) + "\n")
