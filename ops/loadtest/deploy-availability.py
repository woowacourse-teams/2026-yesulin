"""배포하는 동안 외부에서 요청을 계속 보내 실패한 요청 수와 끊긴 시간을 기록한다.

사용법:
    python ops/loadtest/deploy-availability.py --out results/deploy-20261021.csv
    python ops/loadtest/deploy-availability.py --summarize results/deploy-20261021.csv

Ctrl+C로 멈추거나 --duration이 지나면 요약을 출력한다. 표준 라이브러리만 쓴다.
"""

import argparse
import csv
import signal
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))
DEFAULT_URL = "https://yesulin.art/api/v1/health"


def probe(url, timeout):
    started = time.monotonic()
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "yesulin-deploy-availability"})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            response.read()
            status = response.status
    except urllib.error.HTTPError as error:
        status = error.code
    except (urllib.error.URLError, TimeoutError, OSError):
        status = 0
    return status, round((time.monotonic() - started) * 1000)


def run(url, interval, timeout, out_path, duration):
    stopped = False
    deadline = time.monotonic() + duration if duration else None

    def stop(_signum, _frame):
        nonlocal stopped
        stopped = True

    signal.signal(signal.SIGINT, stop)
    with open(out_path, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["time_kst", "status", "latency_ms"])
        while not stopped and (deadline is None or time.monotonic() < deadline):
            next_at = time.monotonic() + interval
            at = datetime.now(KST)
            status, latency = probe(url, timeout)
            writer.writerow([at.isoformat(timespec="milliseconds"), status, latency])
            file.flush()
            if status != 200:
                print(f"{at:%H:%M:%S.%f}"[:-3] + f" FAIL status={status} latency={latency}ms", flush=True)
            time.sleep(max(0.0, next_at - time.monotonic()))
    summarize(out_path)


def summarize(path):
    with open(path, encoding="utf-8") as file:
        rows = [(datetime.fromisoformat(row["time_kst"]), int(row["status"]), int(row["latency_ms"]))
                for row in csv.DictReader(file)]
    if not rows:
        print("기록이 없습니다.")
        return

    failures = [row for row in rows if row[1] != 200]
    longest, longest_range, current = timedelta(0), None, None
    for at, status, _latency in rows:
        if status != 200:
            current = current or at
            continue
        if current is not None:
            if at - current > longest:
                longest, longest_range = at - current, (current, at)
            current = None
    if current is not None and rows[-1][0] - current > longest:
        longest, longest_range = rows[-1][0] - current, (current, rows[-1][0])

    latencies = sorted(row[2] for row in rows if row[1] == 200)
    p95 = latencies[int(len(latencies) * 0.95) - 1] if latencies else 0
    statuses = {}
    for _at, status, _latency in failures:
        statuses[status] = statuses.get(status, 0) + 1

    print(f"측정 구간: {rows[0][0]:%Y-%m-%d %H:%M:%S} ~ {rows[-1][0]:%H:%M:%S} KST")
    print(f"총 요청: {len(rows)}")
    print(f"실패: {len(failures)} ({len(failures) / len(rows):.2%}) 상태별 {statuses or '-'} (0은 연결 실패·타임아웃)")
    if longest_range:
        print(f"가장 긴 끊김: {longest.total_seconds():.1f}초 "
              f"({longest_range[0]:%H:%M:%S} ~ {longest_range[1]:%H:%M:%S})")
    else:
        print("가장 긴 끊김: 0초")
    if failures:
        print(f"첫 실패: {failures[0][0]:%H:%M:%S}, 마지막 실패: {failures[-1][0]:%H:%M:%S}")
    print(f"성공 응답 p95: {p95}ms")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--interval", type=float, default=0.2, help="요청 간격(초)")
    parser.add_argument("--timeout", type=float, default=2.0, help="요청 타임아웃(초)")
    parser.add_argument("--duration", type=float, help="이 시간(초)이 지나면 멈춘다. 없으면 Ctrl+C까지")
    parser.add_argument("--out", help="CSV 저장 경로")
    parser.add_argument("--summarize", help="저장된 CSV를 요약만 한다")
    args = parser.parse_args()

    if args.summarize:
        summarize(args.summarize)
        return
    if not args.out:
        parser.error("--out 또는 --summarize가 필요합니다.")
    print(f"{args.url}에 {args.interval}초 간격으로 요청합니다. Ctrl+C로 멈추거나 --duration이 지나면 요약을 출력합니다.", flush=True)
    run(args.url, args.interval, args.timeout, args.out, args.duration)


if __name__ == "__main__":
    sys.exit(main())
