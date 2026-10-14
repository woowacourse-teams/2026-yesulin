"""Bounded, read-only Linux host sampling; no agent, package or AWS metric writes."""
import argparse
import datetime as dt
import json
from pathlib import Path
import time


def cpu():
    # Guest counters are already included in user/nice; don't count them twice.
    return list(map(int, Path('/proc/stat').read_text().splitlines()[0].split()[1:9]))


def sample(previous):
    current = cpu()
    delta = [b-a for a,b in zip(previous,current)]
    total = sum(delta)
    busy = 100*(total-delta[3]-delta[4]-delta[7])/total if total > 0 else None
    mem = {line.split(':')[0]: int(line.split()[1])*1024
           for line in Path('/proc/meminfo').read_text().splitlines() if ':' in line}
    record = {'time': dt.datetime.now(dt.timezone.utc).isoformat(timespec='milliseconds'),
              'cpuBusyPct': round(busy, 2) if busy is not None else None,
              'iowaitPct': round(100*delta[4]/total, 2) if total > 0 else None,
              'stealPct': round(100*delta[7]/total, 2) if total > 0 else None,
              'memoryUsedPct': round(100*(1-mem['MemAvailable']/mem['MemTotal']), 2),
              'memoryTotalBytes': mem['MemTotal'], 'memoryAvailableBytes': mem['MemAvailable'],
              'swapUsedBytes': mem['SwapTotal']-mem['SwapFree']}
    return current, record


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seconds', type=int, default=150)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    if not 1 <= args.seconds <= 180:
        parser.error('Use a bounded 1..180 seconds')
    previous = cpu()
    records = []
    next_tick = time.monotonic()
    for _ in range(args.seconds):
        next_tick += 1
        time.sleep(max(0, next_tick-time.monotonic()))
        previous, r = sample(previous)
        records.append(r)
    Path(args.output).write_text(json.dumps(records))
    print('HOST_PROBE_DONE', args.output, len(records), flush=True)


if __name__ == '__main__':
    main()
