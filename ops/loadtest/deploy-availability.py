"""배포하는 동안 외부에서 요청을 계속 보내 실패한 요청 수와 끊긴 시간, 응답한 서버를 기록한다.

사용법:
    python ops/loadtest/deploy-availability.py --duration 900 --out results/deploy.csv
    python ops/loadtest/deploy-availability.py --summarize results/deploy.csv
    python ops/loadtest/deploy-availability.py --summarize results/deploy.csv --report results/deploy.html

응답한 서버는 `/api/v1/health`의 `X-Served-By` 헤더(서버 사설 IP)로 알아낸다. 헤더가 없으면 `-`로 남긴다.
Ctrl+C로 멈추거나 --duration이 지나면 요약을 출력한다. 표준 라이브러리만 쓴다.
"""

import argparse
import csv
import html
import signal
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))
DEFAULT_URL = "https://yesulin.art/api/v1/health"
SERVED_BY_HEADER = "X-Served-By"
WINDOW_SECONDS = 10


def probe(url, timeout):
    started = time.monotonic()
    served_by = "-"
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "yesulin-deploy-availability"})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            response.read()
            status = response.status
            served_by = response.headers.get(SERVED_BY_HEADER, "-")
    except urllib.error.HTTPError as error:
        status = error.code
        served_by = error.headers.get(SERVED_BY_HEADER, "-") if error.headers else "-"
    except (urllib.error.URLError, TimeoutError, OSError):
        status = 0
    return status, round((time.monotonic() - started) * 1000), served_by


def run(url, interval, timeout, out_path, duration):
    stopped = False
    deadline = time.monotonic() + duration if duration else None

    def stop(_signum, _frame):
        nonlocal stopped
        stopped = True

    signal.signal(signal.SIGINT, stop)
    window_start, window_servers = None, set()
    with open(out_path, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["time_kst", "status", "latency_ms", "served_by"])
        while not stopped and (deadline is None or time.monotonic() < deadline):
            next_at = time.monotonic() + interval
            at = datetime.now(KST)
            status, latency, served_by = probe(url, timeout)
            writer.writerow([at.isoformat(timespec="milliseconds"), status, latency, served_by])
            file.flush()
            if status != 200:
                print(f"{at:%H:%M:%S} 실패 status={status} latency={latency}ms", flush=True)
            if window_start is None:
                window_start = at
            if status == 200:
                window_servers.add(served_by)
            if (at - window_start).total_seconds() >= WINDOW_SECONDS:
                print(f"{window_start:%H:%M:%S}~{at:%H:%M:%S} 응답 서버: {', '.join(sorted(window_servers)) or '없음'}",
                      flush=True)
                window_start, window_servers = None, set()
            time.sleep(max(0.0, next_at - time.monotonic()))
    summarize(out_path)


def read_rows(path):
    with open(path, encoding="utf-8") as file:
        return [(datetime.fromisoformat(row["time_kst"]), int(row["status"]), int(row["latency_ms"]),
                 row.get("served_by") or "-")
                for row in csv.DictReader(file)]


def longest_outage(rows):
    longest, longest_range, current = timedelta(0), None, None
    for at, status, _latency, _server in rows:
        if status != 200:
            current = current or at
            continue
        if current is not None:
            if at - current > longest:
                longest, longest_range = at - current, (current, at)
            current = None
    if current is not None and rows[-1][0] - current > longest:
        longest, longest_range = rows[-1][0] - current, (current, rows[-1][0])
    return longest, longest_range


def server_segments(rows):
    """연속한 성공 응답을 '응답한 서버 집합'이 같은 구간으로 묶는다."""
    segments = []
    window_start, servers = rows[0][0], set()
    for at, status, _latency, server in rows:
        if (at - window_start).total_seconds() >= WINDOW_SECONDS:
            segments.append([window_start, at, frozenset(servers)])
            window_start, servers = at, set()
        if status == 200:
            servers.add(server)
    segments.append([window_start, rows[-1][0], frozenset(servers)])
    merged = [segments[0]]
    for start, end, servers in segments[1:]:
        if servers == merged[-1][2]:
            merged[-1][1] = end
        else:
            merged.append([start, end, servers])
    return merged


def summarize(path, report_path=None):
    rows = read_rows(path)
    if not rows:
        print("기록이 없습니다.")
        return

    failures = [row for row in rows if row[1] != 200]
    longest, longest_range = longest_outage(rows)
    latencies = sorted(row[2] for row in rows if row[1] == 200)
    p95 = latencies[max(0, int(len(latencies) * 0.95) - 1)] if latencies else 0
    statuses, servers = {}, {}
    for _at, status, _latency, server in rows:
        if status != 200:
            statuses[status] = statuses.get(status, 0) + 1
        else:
            servers[server] = servers.get(server, 0) + 1

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
    print("서버별 성공 응답: " + ", ".join(f"{server} {count}건" for server, count in sorted(servers.items())))
    print(f"응답 서버 변화 ({WINDOW_SECONDS}초 단위):")
    for start, end, segment_servers in server_segments(rows):
        print(f"  {start:%H:%M:%S} ~ {end:%H:%M:%S}  {', '.join(sorted(segment_servers)) or '응답 없음'}")
    if report_path:
        write_report(rows, report_path, failures, longest, servers, p95)
        print(f"보고서: {report_path}")


def write_report(rows, report_path, failures, longest, servers, p95):
    """측정 결과를 한 장으로 보는 HTML 타임라인을 만든다. 서버마다 한 줄, 실패는 빨간 줄에 찍는다."""
    start, end = rows[0][0], rows[-1][0]
    span = max((end - start).total_seconds(), 1)
    lanes = sorted(servers) + ["실패"]
    width, lane_height, left = 1000, 34, 120
    height = lane_height * len(lanes) + 50
    marks = []
    for at, status, _latency, server in rows:
        lane = "실패" if status != 200 else server
        x = left + (at - start).total_seconds() / span * (width - left - 10)
        y = 20 + lanes.index(lane) * lane_height
        color = "#c0392b" if status != 200 else ["#1d6a86", "#2f7d4f", "#7a4fa0", "#a2620b"][lanes.index(lane) % 4]
        marks.append(f'<rect x="{x:.1f}" y="{y + 6}" width="2" height="{lane_height - 12}" fill="{color}"/>')
    labels = "".join(
        f'<text x="8" y="{20 + i * lane_height + lane_height / 2 + 4}" font-size="13" fill="#18252d">{html.escape(lane)}</text>'
        for i, lane in enumerate(lanes))
    ticks = []
    for i in range(7):
        seconds = span * i / 6
        x = left + seconds / span * (width - left - 10)
        ticks.append(f'<text x="{x:.1f}" y="{height - 8}" font-size="11" fill="#56656f" text-anchor="middle">'
                     f'{(start + timedelta(seconds=seconds)):%H:%M:%S}</text>')
    svg = (f'<svg viewBox="0 0 {width} {height}" width="100%" xmlns="http://www.w3.org/2000/svg">'
           f'<rect width="{width}" height="{height}" fill="#ffffff"/>{labels}{"".join(marks)}{"".join(ticks)}</svg>')
    server_text = ", ".join(f"{html.escape(server)} {count}건" for server, count in sorted(servers.items()))
    page = f"""<!doctype html><meta charset="utf-8"><title>배포 중 가용성 측정</title>
<body style="font-family:sans-serif;margin:24px;color:#18252d;background:#f4f6f7">
<h2 style="margin:0 0 8px">배포 중 가용성 측정</h2>
<p style="margin:0 0 4px">{start:%Y-%m-%d %H:%M:%S} ~ {end:%H:%M:%S} KST · 총 {len(rows)}건 · 실패 {len(failures)}건 ·
가장 긴 끊김 {longest.total_seconds():.1f}초 · 성공 p95 {p95}ms</p>
<p style="margin:0 0 16px">서버별 성공 응답: {server_text}</p>
<div style="background:#fff;border:1px solid #d9e0e4;border-radius:8px;padding:8px">{svg}</div>
<p style="color:#56656f;font-size:13px">한 줄이 한 서버(사설 IP)다. 세로 막대 하나가 요청 하나이며, 빨간 줄은 실패한 요청이다.</p>
</body>"""
    with open(report_path, "w", encoding="utf-8") as file:
        file.write(page)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--interval", type=float, default=0.2, help="요청 간격(초)")
    parser.add_argument("--timeout", type=float, default=2.0, help="요청 타임아웃(초)")
    parser.add_argument("--duration", type=float, help="이 시간(초)이 지나면 멈춘다. 없으면 Ctrl+C까지")
    parser.add_argument("--out", help="CSV 저장 경로")
    parser.add_argument("--summarize", help="저장된 CSV를 요약만 한다")
    parser.add_argument("--report", help="요약할 때 HTML 타임라인도 만든다")
    args = parser.parse_args()

    if args.summarize:
        summarize(args.summarize, args.report)
        return
    if not args.out:
        parser.error("--out 또는 --summarize가 필요합니다.")
    print(f"{args.url}에 {args.interval}초 간격으로 요청합니다. Ctrl+C로 멈추거나 --duration이 지나면 요약을 출력합니다.",
          flush=True)
    run(args.url, args.interval, args.timeout, args.out, args.duration)


if __name__ == "__main__":
    sys.exit(main())
