"""Merge the owned structured log source without enabling custom metrics."""

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
        owned.update(retention_in_days=14, timestamp_format="%Y-%m-%dT%H:%M:%S.%f", timezone="UTC")
    for entry in entries:
        if entry.get("file_path") == path:
            existing_group = entry.get("log_group_name")
            if existing_group and existing_group != owned["log_group_name"]:
                raise ValueError("Owned log source points at another environment; refusing to replace")
            entry.clear()
            entry.update(owned)
            break
    else:
        entries.append(owned)
    # Remove only the exact host plugins previously installed by this script; keep unrelated metrics.
    metrics = config.get("metrics", {})
    collected = metrics.get("metrics_collected", {})
    if metrics.get("namespace", "CWAgent") == "CWAgent":
        for plugin, measurement in (("mem", "mem_available"), ("swap", "swap_used_percent")):
            expected = {"measurement": [measurement], "metrics_collection_interval": 60,
                        "append_dimensions": {"Environment": environment, "Service": "backend"}}
            if collected.get(plugin) == expected:
                del collected[plugin]
        if not collected:
            config.pop("metrics", None)
    return config


if __name__ == "__main__":
    source, destination, environment, role = sys.argv[1:]
    existing = json.loads(Path(source).read_text()) if Path(source).exists() else {}
    Path(destination).write_text(json.dumps(render(existing, environment, role), indent=2) + "\n")
