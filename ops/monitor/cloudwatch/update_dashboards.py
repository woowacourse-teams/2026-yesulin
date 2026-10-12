#!/usr/bin/env python3
"""Separate owned API panels from the infrastructure dashboard and provision log/metric views."""

import argparse
import datetime
import json
from pathlib import Path

REGION = "ap-northeast-2"
APP_PANELS = [
    ("JVM heap (bytes)", ["JvmHeapUsed", "JvmHeapMax"], "Average"),
    ("JVM live threads (request capacity와 다름)", ["JvmThreadsLive"], "Average"),
    ("Tomcat busy / max threads", ["TomcatThreadsBusy", "TomcatThreadsMax"], "Maximum"),
    ("Hikari active / pending / max", ["DbConnectionsActive", "DbConnectionsPending", "DbConnectionsMax"], "Maximum"),
    ("Hikari acquisition mean (ms)", ["DbConnectionAcquireMeanMs"], "Average"),
    ("Hikari acquisition timeouts (interval count)", ["DbConnectionTimeouts"], "Sum"),
    ("GC pause time (ms / interval)", ["GcPauseTimeMs"], "Sum"),
    ("GC pause / collection interval (%)", ["GcPauseRatio"], "Average"),
]
DB_PANELS = [
    ("InnoDB cached data / capacity (bytes)", ["BufferPoolUsedBytes", "BufferPoolCapacityBytes"], "Average"),
    ("InnoDB cache hit (%) · reads 없는 구간은 미표시", ["BufferPoolCacheHitPct"], "Average"),
    ("MySQL running threads", ["MysqlThreadsRunning"], "Maximum"),
    ("MySQL connections / max", ["MysqlConnections", "MysqlMaxConnections"], "Maximum"),
    ("InnoDB current row lock waits", ["RowLockCurrentWaits"], "Maximum"),
    ("DB host available memory (bytes)", ["HostMemoryAvailable"], "Minimum"),
    ("DB host used swap (bytes)", ["HostSwapUsed"], "Maximum"),
    ("DB data disk I/O active time (ms / interval)", ["DataDiskIoTimeMs"], "Sum"),
    ("MySQL queries / second (collector queries 포함)", ["QueriesPerSecond"], "Average"),
]


def add_widget(body, kind, properties, height=6, width=24):
    y = max((w["y"] + w["height"] for w in body["widgets"]), default=0)
    x = 0
    if width == 12 and body["widgets"]:
        last = body["widgets"][-1]
        if last["width"] == 12 and last["x"] == 0:
            x, y = 12, last["y"]
    body["widgets"].append({"type": kind, "x": x, "y": y, "width": width, "height": height, "properties": properties})


def metric_dashboard():
    body = {"widgets": []}
    add_widget(body, "text", {"markdown": "### Runtime metrics\n"
               "애플리케이션 배포 후 JVM/Tomcat/Hikari/GC가 표시됩니다. DB는 DB 서버에 수집기를 별도 설치해야 합니다.\n"
               "1분 표본이므로 짧은 포화는 놓칠 수 있습니다. 빈 그래프는 0을 의미하지 않습니다.\n"
               "현재 환경별 backend/DB 1대 기준. 추가 수집 지표는 All metrics에서 확인합니다."}, 3)
    for env in ("prod", "dev"):
        add_widget(body, "text", {"markdown": f"### {env.upper()} · 애플리케이션 / DB"}, 2)
        for namespace, panels in (("Yesulin/Application", APP_PANELS), ("Yesulin/Database", DB_PANELS)):
            for title, names, statistic in panels:
                add_widget(body, "metric", {"region": REGION, "title": f"{env.upper()} | {title}",
                           "view": "timeSeries", "period": 60, "stat": statistic,
                           "metrics": [[namespace, name, "Environment", env] for name in names]}, width=12)
        for name in ("mem_available", "swap_used_percent"):
            expression = (f'SEARCH(\'{{CWAgent,Environment,Service}} MetricName="{name}" '
                          f'Environment="{env}" Service="backend"\', \'Average\', 60)')
            add_widget(body, "metric", {"region": REGION, "title": f"{env.upper()} | Backend host {name}",
                       "view": "timeSeries", "period": 60, "metrics": [[{"expression": expression, "id": "host"}]]}, width=12)
    return body


def log_dashboard(queries):
    body = {"widgets": []}
    for env in ("prod", "dev"):
        add_widget(body, "text", {"markdown": f"### API 분석 · {env.upper()}\n"
                   "요청 수는 사람 수가 아닙니다. GET=조회, 공개 예매 POST=예매이며 DB read/write 비율과 다릅니다.\n"
                   "elapsedMs는 백엔드 처리 시간입니다. 오류 상세의 requestId를 저장 쿼리 request-trace에 넣어 추적합니다.\n"
                   "오류 stack trace는 Agent 설정 반영 이후부터 수집됩니다. 조회 기간을 필요한 범위로 좁히세요."}, 3)
        for query_id, spec in queries.items():
            if not spec.get("savedOnly"):
                add_widget(body, "log", {"region": REGION, "title": f"API {env.upper()} | " + spec["title"],
                           "view": spec["view"], "query": f"SOURCE '/yesulin/{env}/backend' | " + spec["query"]},
                           width=24 if query_id in ("resource-summary", "endpoint-summary", "error-details") else 12)
    return body


def is_snapshot(widget):
    markdown = widget.get("properties", {}).get("markdown", "")
    return markdown.lstrip("# ").startswith("PROD 오늘 로컬 파일 스냅샷")


def base_dashboard(original):
    body = json.loads(json.dumps(original))
    body["widgets"] = [w for w in body["widgets"]
                       if not w.get("properties", {}).get("title", "").startswith(("API DEV | ", "API PROD | "))
                       and not w.get("properties", {}).get("markdown", "").startswith("### API 분석 ·")
                       and not is_snapshot(w)]
    return body


def query_definitions(logs, environment):
    definitions = []
    request = {"queryDefinitionNamePrefix": f"yesulin/{environment}/"}
    while True:
        page = logs.describe_query_definitions(**request)
        definitions.extend(page.get("queryDefinitions", []))
        if not page.get("nextToken"):
            return definitions
        request["nextToken"] = page["nextToken"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="DASHBOARD-yesulin")
    parser.add_argument("--output", type=Path, default=Path("/tmp/yesulin-dashboards"))
    parser.add_argument("--plan", action="store_true", help="Write log/metric JSON locally without AWS access")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    queries = json.loads((root / "queries.json").read_text())
    dashboards = {args.base + "-log": log_dashboard(queries), args.base + "-metric": metric_dashboard()}
    args.output.mkdir(parents=True, exist_ok=True)
    for name, body in dashboards.items():
        (args.output / f"{name}.json").write_text(json.dumps(body, ensure_ascii=False, indent=2))
    if args.plan:
        return
    import boto3
    from botocore.exceptions import ClientError

    cw = boto3.client("cloudwatch", region_name=REGION)
    logs = boto3.client("logs", region_name=REGION)
    original = json.loads(cw.get_dashboard(DashboardName=args.base)["DashboardBody"])
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    snapshots = [w for w in original["widgets"] if is_snapshot(w)]
    for name in [args.base, *dashboards]:
        try:
            backup = cw.get_dashboard(DashboardName=name)["DashboardBody"]
        except ClientError as exception:
            if exception.response["Error"]["Code"] not in ("ResourceNotFound", "DashboardNotFoundError"):
                raise
            continue
        (args.output / f"{name}-backup-{stamp}.json").write_text(backup)
        if name == args.base + "-log":
            snapshots.extend(w for w in json.loads(backup)["widgets"] if is_snapshot(w))
    seen = set()
    for widget in snapshots:
        markdown = widget["properties"]["markdown"]
        if markdown not in seen:
            add_widget(dashboards[args.base + "-log"], "text", widget["properties"], widget.get("height", 6))
            seen.add(markdown)
    # Create replacement views successfully before removing owned API panels from the base.
    for name, body in [*dashboards.items(), (args.base, base_dashboard(original))]:
        result = cw.put_dashboard(DashboardName=name, DashboardBody=json.dumps(body, ensure_ascii=False))
        if result.get("DashboardValidationMessages"):
            raise RuntimeError(result["DashboardValidationMessages"])
    for env in ("dev", "prod"):
        definitions = query_definitions(logs, env)
        for query_id, spec in queries.items():
            name = f"yesulin/{env}/{query_id}"
            existing = next((q for q in definitions if q["name"] == name), None)
            args_query = {"name": name, "queryString": spec["query"], "logGroupNames": [f"/yesulin/{env}/backend"]}
            if existing:
                args_query["queryDefinitionId"] = existing["queryDefinitionId"]
            logs.put_query_definition(**args_query)
    print(f"Updated {args.base}, {args.base}-log, {args.base}-metric. Backups: {args.output}")


if __name__ == "__main__":
    main()
