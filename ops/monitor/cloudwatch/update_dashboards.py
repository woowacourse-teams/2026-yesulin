#!/usr/bin/env python3
"""Maintain the unified dashboard, or the separate load-test dashboard, from log-based API/runtime/DB views."""

import argparse
import datetime
import json
from pathlib import Path

REGION = "ap-northeast-2"
UNIFIED_DASHBOARD = "DASHBOARD-yesulin"
LOADTEST_DASHBOARD = "DASHBOARD-yesulin-loadtest"
LOADTEST_ENVIRONMENT = "dev"
UNIFIED_OWNED = (("API DEV | ", "API PROD | ", "LOG DEV | ", "LOG PROD | "),
                 ("### API 분석 ·", "### 로그 기반 모니터링", "### LOG DEV", "### LOG PROD"))
LOADTEST_OWNED = (("LOG LOADTEST | ",), ("### 부하 테스트 로그", "### LOG LOADTEST"))
LOADTEST_EXCLUDED = ("read-reservation-mix", "reservation-outcomes")
SECTIONS = (("api", "API·오류", "backend"),
            ("runtime", "JVM·호스트·스레드·커넥션·GC", "backend"),
            ("database", "DB·InnoDB·호스트 I/O", "database"))
API_NOTE = ("GET=조회, 공개 예매 POST=예매이며 사람 수·DB read/write 비율과 다릅니다.\n"
            "elapsedMs는 backend 처리 시간입니다. 원문 예외는 Agent 설정 반영 이후부터 수집됩니다.")
MINUTE_NOTE = "1분 표본이므로 짧은 포화는 놓칠 수 있습니다. 첫 표본에는 counter 차분이 없습니다."
SECOND_NOTE = ("앱이 YESULIN_MONITORING_PUBLISH_INTERVAL=PT1S일 때만 1초 표본입니다. "
               "기본값이면 1분에 한 점만 보입니다. 첫 표본에는 counter 차분이 없습니다.")


def add_widget(body, kind, properties, height=6, width=24):
    y = max((w.get("y", 0) + w.get("height", 6) for w in body["widgets"]), default=0)
    x = 0
    if width == 12 and body["widgets"]:
        last = body["widgets"][-1]
        if last.get("width") == 12 and last.get("x") == 0:
            x, y = 12, last["y"]
    body["widgets"].append({"type": kind, "x": x, "y": y, "width": width, "height": height, "properties": properties})


def is_snapshot(widget):
    markdown = widget.get("properties", {}).get("markdown", "")
    return markdown.lstrip("# ").startswith("PROD 오늘 로컬 파일 스냅샷")


def without_owned(original, owned):
    titles, markdowns = owned
    body = json.loads(json.dumps(original))
    body["widgets"] = [w for w in body.get("widgets", [])
                       if not w.get("properties", {}).get("title", "").startswith(titles)
                       and not w.get("properties", {}).get("markdown", "").startswith(markdowns)]
    return body


def base_dashboard(original):
    body = without_owned(original, UNIFIED_OWNED)
    body["widgets"] = [w for w in body["widgets"] if not is_snapshot(w)]
    return body


def add_sections(body, label, environment, queries, groups, notes):
    for category, title, source in SECTIONS:
        group = f"/yesulin/{environment}/{source}"
        add_widget(body, "text", {"markdown": f"### LOG {label.upper()} · {title}\n" + notes[category]}, 3)
        if group not in groups:
            add_widget(body, "text", {"markdown": f"### LOG {label.upper()} · {source} 수집 대기\n로그 그룹 `{group}`가 아직 없습니다. "
                       "해당 서버 수집기를 설치한 뒤 이 스크립트를 다시 실행하면 그래프가 추가됩니다."}, 2)
            continue
        for query_id, spec in queries.items():
            if spec.get("category", "api") == category and not spec.get("savedOnly"):
                add_widget(body, "log", {"region": REGION, "title": f"LOG {label.upper()} | " + spec["title"],
                           "view": spec["view"], "query": f"SOURCE '{group}' | " + spec["query"]},
                           width=24 if query_id in ("resource-summary", "endpoint-summary", "error-details") else 12)


def loadtest_queries(queries):
    adapted = {}
    for query_id, spec in queries.items():
        if query_id in LOADTEST_EXCLUDED:
            continue
        if spec.get("source", "backend") == "backend":
            query_id = query_id.replace("-minute", "-second")
            spec = dict(spec, title=spec["title"].replace("1분", "1초"), query=spec["query"].replace("bin(1m)", "bin(1s)"))
        adapted[query_id] = spec
    return adapted


def per_second_only(queries):
    return {query_id: spec for query_id, spec in queries.items() if "bin(1s)" in spec["query"]}


def loadtest_dashboard(original, queries, groups):
    body = without_owned(original, LOADTEST_OWNED)
    body["start"] = "-PT15M"
    add_widget(body, "text", {"markdown": "### 부하 테스트 로그\n"
               f"{LOADTEST_ENVIRONMENT.upper()} 로그(`/yesulin/{LOADTEST_ENVIRONMENT}/backend`)를 1초 구간으로 보는 화면입니다. "
               "새 로그 그룹이나 custom metric은 생성하지 않습니다.\n"
               "앱 그래프는 1초 구간, DB 그래프는 수집기 주기에 맞춘 1분 구간입니다. 빈 데이터는 0과 다릅니다.\n"
               "1초 구간은 조회 범위가 길수록 검색량이 커집니다. 자동 새로고침을 끄고 테스트 구간만 조회하세요."}, 4)
    add_sections(body, "loadtest", LOADTEST_ENVIRONMENT, queries, groups,
                 {"api": API_NOTE, "runtime": SECOND_NOTE, "database": MINUTE_NOTE})
    return body


def unified_dashboard(original, queries, groups):
    body = base_dashboard(original)
    body["start"] = "-PT3H"
    add_widget(body, "text", {"markdown": "### 로그 기반 모니터링\n"
               "API·JVM·스레드·커넥션·GC·DB를 같은 대시보드에서 확인합니다. 추가 custom metric은 생성하지 않습니다.\n"
               "값은 1분마다 JSON 로그로 수집하며 아래 그래프는 Logs Insights 검색 결과입니다. 빈 데이터는 0과 다릅니다.\n"
               "열기·새로고침 때 쿼리 비용이 발생하므로 자동 새로고침을 끄고 필요한 시간 범위만 조회하세요.\n"
               "저장 쿼리 runtime-latest/database-latest에서 원문을 펼치고, request-trace의 ID를 바꿔 오류를 추적합니다."}, 4)
    for env in ("prod", "dev"):
        add_sections(body, env, env, queries, groups, {"api": API_NOTE, "runtime": MINUTE_NOTE, "database": MINUTE_NOTE})
    seen = set()
    for widget in original.get("widgets", []):
        if is_snapshot(widget) and widget["properties"]["markdown"] not in seen:
            add_widget(body, "text", widget["properties"], widget.get("height", 6))
            seen.add(widget["properties"]["markdown"])
    return body


def query_definitions(logs, environment):
    definitions = []
    request = {"queryDefinitionNamePrefix": f"yesulin/{environment}"}
    while True:
        page = logs.describe_query_definitions(**request)
        definitions.extend(page.get("queryDefinitions", []))
        if not page.get("nextToken"):
            return definitions
        request["nextToken"] = page["nextToken"]


def existing_dashboard(cloudwatch, name, may_be_missing):
    from botocore.exceptions import ClientError

    try:
        return cloudwatch.get_dashboard(DashboardName=name)["DashboardBody"]
    except ClientError as error:
        if not may_be_missing or error.response["Error"]["Code"] != "ResourceNotFound":
            raise
        return None


def existing_groups(logs, wanted):
    groups = set()
    for group in sorted(wanted):
        response = logs.describe_log_groups(logGroupNamePrefix=group)
        if any(g["logGroupName"] == group for g in response.get("logGroups", [])):
            groups.add(group)
    return groups


def save_query_definitions(logs, folder, environment, queries, groups):
    definitions = query_definitions(logs, folder)
    for query_id, spec in queries.items():
        group = f"/yesulin/{environment}/{spec.get('source', 'backend')}"
        if group not in groups:
            continue
        name = f"yesulin/{folder}/{query_id}"
        existing = next((q for q in definitions if q["name"] == name), None)
        request = {"name": name, "queryString": spec["query"], "logGroupNames": [group]}
        if existing:
            request["queryDefinitionId"] = existing["queryDefinitionId"]
        logs.put_query_definition(**request)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", help=f"Dashboard name. Default {UNIFIED_DASHBOARD}, or {LOADTEST_DASHBOARD} with --loadtest")
    parser.add_argument("--output", type=Path, default=Path("/tmp/yesulin-dashboards"))
    parser.add_argument("--plan", action="store_true", help="Write a sample JSON without AWS access")
    parser.add_argument("--loadtest", action="store_true",
                        help="Maintain the separate 1-second load-test dashboard instead of the unified one")
    args = parser.parse_args()
    if args.loadtest and args.base == UNIFIED_DASHBOARD:
        parser.error(f"--loadtest cannot write to {UNIFIED_DASHBOARD}")
    queries = json.loads((Path(__file__).resolve().parent / "queries.json").read_text())
    args.output.mkdir(parents=True, exist_ok=True)
    name = args.base or (LOADTEST_DASHBOARD if args.loadtest else UNIFIED_DASHBOARD)
    environments = (LOADTEST_ENVIRONMENT,) if args.loadtest else ("dev", "prod")
    wanted = {f"/yesulin/{env}/{source}" for env in environments for source in ("backend", "database")}
    if args.loadtest:
        queries = loadtest_queries(queries)

    def build(original, groups):
        if args.loadtest:
            return loadtest_dashboard(original, queries, groups)
        return unified_dashboard(original, queries, groups)

    if args.plan:
        body = build({"widgets": []}, wanted)
    else:
        import boto3

        cw = boto3.client("cloudwatch", region_name=REGION)
        logs = boto3.client("logs", region_name=REGION)
        original_text = existing_dashboard(cw, name, may_be_missing=args.loadtest)
        if original_text:
            stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            (args.output / f"{name}-backup-{stamp}.json").write_text(original_text)
        groups = existing_groups(logs, wanted)
        body = build(json.loads(original_text) if original_text else {"widgets": []}, groups)
        if args.loadtest:
            save_query_definitions(logs, "loadtest", LOADTEST_ENVIRONMENT, per_second_only(queries), groups)
        else:
            for env in environments:
                save_query_definitions(logs, env, env, queries, groups)
        result = cw.put_dashboard(DashboardName=name, DashboardBody=json.dumps(body, ensure_ascii=False))
        if result.get("DashboardValidationMessages"):
            raise RuntimeError(result["DashboardValidationMessages"])
    (args.output / f"{name}.json").write_text(json.dumps(body, ensure_ascii=False, indent=2))
    print(f"{'Planned' if args.plan else 'Updated'} one dashboard: {name}. Artifacts: {args.output}")


if __name__ == "__main__":
    main()
