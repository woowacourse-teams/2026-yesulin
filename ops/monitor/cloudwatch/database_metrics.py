#!/usr/bin/env python3
"""Read MySQL global status and Linux counters; write one bounded structured log event per invocation."""

import argparse
import datetime
import json
import math
import os
from pathlib import Path
import subprocess
import time

STATUS = (
    "Uptime", "Threads_connected", "Threads_running", "Questions", "Slow_queries",
    "Innodb_buffer_pool_pages_data", "Innodb_buffer_pool_pages_dirty", "Innodb_buffer_pool_pages_total",
    "Innodb_buffer_pool_read_requests", "Innodb_buffer_pool_reads",
    "Innodb_row_lock_current_waits", "Innodb_row_lock_waits", "Innodb_row_lock_time",
)
SQL = "SHOW GLOBAL STATUS WHERE Variable_name IN (" + ",".join(f"'{name}'" for name in STATUS) + ");"
SQL += "SHOW GLOBAL VARIABLES WHERE Variable_name IN ('innodb_buffer_pool_size','innodb_page_size','max_connections');"


def mysql_status(container="yesulin-mysql"):
    # Use the existing application credentials inside the container. Never return mysql stderr or credentials.
    result = subprocess.run([
        "docker", "exec", container, "sh", "-c",
        'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --user="$MYSQL_USER" --database="$MYSQL_DATABASE" '
        '--connect-timeout=5 --batch --skip-column-names --execute="$1"', "sh", SQL,
    ], capture_output=True, text=True, timeout=10)
    if result.returncode:
        raise RuntimeError("MySQL status query failed; check container health and application account permissions")
    return {key.lower(): int(value) for key, value in (line.split("\t") for line in result.stdout.splitlines())}


def host_status():
    mem = {line.split(":")[0]: int(line.split()[1]) * 1024 for line in Path("/proc/meminfo").read_text().splitlines()}
    vm = dict(line.split() for line in Path("/proc/vmstat").read_text().splitlines())
    result = {
        "HostMemoryAvailable": mem["MemAvailable"],
        "HostSwapUsed": mem["SwapTotal"] - mem["SwapFree"],
        "swap_in": int(vm["pswpin"]) * os.sysconf("SC_PAGE_SIZE"),
        "swap_out": int(vm["pswpout"]) * os.sysconf("SC_PAGE_SIZE"),
    }
    # Resolve only the DB mount's block device; do not sum parent devices and partitions twice.
    mount = subprocess.run(["findmnt", "-rn", "-M", "/data/mysql", "-o", "MAJ:MIN"],
                           capture_output=True, text=True, timeout=5)
    if mount.returncode == 0:
        device = mount.stdout.strip()
        for line in Path("/proc/diskstats").read_text().splitlines():
            fields = line.split()
            if f"{fields[0]}:{fields[1]}" == device:
                result.update(disk_read=int(fields[5]) * 512, disk_write=int(fields[9]) * 512,
                              disk_io_ms=int(fields[12]))
                break
    return result


def collect(environment, status, host, previous, now, boot_id):
    event = {"event": "DATABASE_METRICS", "Environment": environment,
             "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds")}

    def add(name, value):
        if value is not None and math.isfinite(value) and value >= 0:
            event[name] = value

    def value(key):
        return status.get(key.lower())

    for source, name in (("Threads_connected", "MysqlConnections"), ("max_connections", "MysqlMaxConnections"),
                         ("Threads_running", "MysqlThreadsRunning"), ("Innodb_row_lock_current_waits", "RowLockCurrentWaits")):
        add(name, value(source))
    pages = value("Innodb_buffer_pool_pages_data")
    page_size = value("innodb_page_size")
    add("BufferPoolUsedBytes", pages * page_size if pages is not None and page_size else None)
    add("BufferPoolCapacityBytes", value("innodb_buffer_pool_size"))
    total = value("Innodb_buffer_pool_pages_total")
    dirty = value("Innodb_buffer_pool_pages_dirty")
    add("BufferPoolDirtyPct", dirty / total * 100 if total and dirty is not None else None)
    for name in ("HostMemoryAvailable", "HostSwapUsed"):
        add(name, host.get(name))

    same_boot = previous and previous.get("boot_id") == boot_id
    seconds = now - previous.get("time", now) if same_boot else 0
    old_status = previous.get("status", {})
    same_mysql = same_boot and value("Uptime") is not None and value("Uptime") >= old_status.get("uptime", math.inf)

    def delta(current, old, key):
        if key not in current or key not in old or current[key] < old[key]:
            return None
        return current[key] - old[key]

    if seconds > 0 and same_mysql:
        reads = delta(status, old_status, "innodb_buffer_pool_reads")
        requests = delta(status, old_status, "innodb_buffer_pool_read_requests")
        # No reads means no ratio; counter resets and inconsistent samples are omitted, not shown as 100% hits.
        if requests and reads is not None and reads <= requests:
            add("BufferPoolCacheHitPct", (1 - reads / requests) * 100)
        questions = delta(status, old_status, "questions")
        add("QueriesPerSecond", questions / seconds if questions is not None else None)
        for source, name in (("slow_queries", "SlowQueries"),
                             ("innodb_row_lock_waits", "RowLockWaits"),
                             ("innodb_row_lock_time", "RowLockTimeMs")):
            add(name, delta(status, old_status, source))
    if seconds > 0 and same_boot:
        for source, name in (("swap_in", "HostSwapInBytes"), ("swap_out", "HostSwapOutBytes"),
                             ("disk_read", "DataDiskReadBytes"), ("disk_write", "DataDiskWriteBytes"),
                             ("disk_io_ms", "DataDiskIoTimeMs")):
            add(name, delta(host, previous.get("host", {}), source))
    return event, {"status": status, "host": host, "time": now, "boot_id": boot_id}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("environment", choices=["dev", "prod"])
    parser.add_argument("--container", default="yesulin-mysql")
    parser.add_argument("--once", action="store_true", help="Print a sample without writing log or updating baseline")
    args = parser.parse_args()
    state_file = Path("/var/lib/yesulin-monitoring/database-state.json")
    previous = json.loads(state_file.read_text()) if state_file.exists() else {}
    event, state = collect(args.environment, mysql_status(args.container), host_status(), previous, time.monotonic(),
                           Path("/proc/sys/kernel/random/boot_id").read_text().strip())
    line = json.dumps(event, allow_nan=False, separators=(",", ":")) + "\n"
    if args.once:
        print(line, end="")
        return
    log = Path("/var/log/yesulin-monitoring/database.jsonl")
    if log.exists() and log.stat().st_size >= 5 * 1024 * 1024:
        log.replace(log.with_suffix(".jsonl.1"))
    with log.open("a") as output:
        output.write(line)
    temporary = state_file.with_suffix(".tmp")
    temporary.write_text(json.dumps(state))
    temporary.replace(state_file)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, subprocess.TimeoutExpired, OSError, ValueError, KeyError):
        # No query output, docker stderr, passwords or raw exception details in central logs.
        raise SystemExit("Database metrics collection failed; inspect DB health and the collector installation")
