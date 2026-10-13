#!/usr/bin/env python3
"""Maintain one dashboard with existing infrastructure graphs and log-based API/runtime/DB views."""

import argparse
import datetime
import json
from pathlib import Path

REGION = "ap-northeast-2"


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


def base_dashboard(original):
    body = json.loads(json.dumps(original))
    body["widgets"] = [w for w in body.get("widgets", [])
                       if not w.get("properties", {}).get("title", "").startswith(
                           ("API DEV | ", "API PROD | ", "LOG DEV | ", "LOG PROD | "))
                       and not w.get("properties", {}).get("markdown", "").startswith(
                           ("### API 분석 ·", "### 로그 기반 모니터링", "### LOG DEV", "### LOG PROD"))
                       and not is_snapshot(w)]
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
        for category, title, source in (("api", "API·오류", "backend"),
                                        ("runtime", "JVM·호스트·스레드·커넥션·GC", "backend"),
                                        ("database", "DB·InnoDB·호스트 I/O", "database")):
            group = f"/yesulin/{env}/{source}"
            add_widget(body, "text", {"markdown": f"### LOG {env.upper()} · {title}\n"
                       + ("GET=조회, 공개 예매 POST=예매이며 사람 수·DB read/write 비율과 다릅니다.\n"
                          "elapsedMs는 backend 처리 시간입니다. 원문 예외는 Agent 설정 반영 이후부터 수집됩니다."
                          if category == "api" else "1분 표본이므로 짧은 포화는 놓칠 수 있습니다. 첫 표본에는 counter 차분이 없습니다.")}, 3)
            if group not in groups:
                add_widget(body, "text", {"markdown": f"### LOG {env.upper()} · {source} 수집 대기\n로그 그룹 `{group}`가 아직 없습니다. "
                           "해당 서버 수집기를 설치한 뒤 이 스크립트를 다시 실행하면 그래프가 추가됩니다."}, 2)
                continue
            for query_id, spec in queries.items():
                if spec.get("category", "api") == category and not spec.get("savedOnly"):
                    add_widget(body, "log", {"region": REGION, "title": f"LOG {env.upper()} | " + spec["title"],
                               "view": spec["view"], "query": f"SOURCE '{group}' | " + spec["query"]},
                               width=24 if query_id in ("resource-summary", "endpoint-summary", "error-details") else 12)
    seen = set()
    for widget in original.get("widgets", []):
        if is_snapshot(widget) and widget["properties"]["markdown"] not in seen:
            add_widget(body, "text", widget["properties"], widget.get("height", 6))
            seen.add(widget["properties"]["markdown"])
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
    parser.add_argument("--plan", action="store_true", help="Write a sample unified JSON without AWS access")
    args = parser.parse_args()
    queries = json.loads((Path(__file__).resolve().parent / "queries.json").read_text())
    args.output.mkdir(parents=True, exist_ok=True)
    if args.plan:
        groups = {f"/yesulin/{env}/{source}" for env in ("dev", "prod") for source in ("backend", "database")}
        body = unified_dashboard({"widgets": []}, queries, groups)
    else:
        import boto3

        cw = boto3.client("cloudwatch", region_name=REGION)
        logs = boto3.client("logs", region_name=REGION)
        original_text = cw.get_dashboard(DashboardName=args.base)["DashboardBody"]
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        (args.output / f"{args.base}-backup-{stamp}.json").write_text(original_text)
        groups = set()
        for env in ("dev", "prod"):
            for source in ("backend", "database"):
                group = f"/yesulin/{env}/{source}"
                response = logs.describe_log_groups(logGroupNamePrefix=group)
                if any(g["logGroupName"] == group for g in response.get("logGroups", [])):
                    groups.add(group)
        body = unified_dashboard(json.loads(original_text), queries, groups)
        for env in ("dev", "prod"):
            definitions = query_definitions(logs, env)
            for query_id, spec in queries.items():
                group = f"/yesulin/{env}/{spec.get('source', 'backend')}"
                if group not in groups:
                    continue
                name = f"yesulin/{env}/{query_id}"
                existing = next((q for q in definitions if q["name"] == name), None)
                request = {"name": name, "queryString": spec["query"], "logGroupNames": [group]}
                if existing:
                    request["queryDefinitionId"] = existing["queryDefinitionId"]
                logs.put_query_definition(**request)
        result = cw.put_dashboard(DashboardName=args.base, DashboardBody=json.dumps(body, ensure_ascii=False))
        if result.get("DashboardValidationMessages"):
            raise RuntimeError(result["DashboardValidationMessages"])
    (args.output / f"{args.base}.json").write_text(json.dumps(body, ensure_ascii=False, indent=2))
    print(f"{'Planned' if args.plan else 'Updated'} one dashboard: {args.base}. Artifacts: {args.output}")


if __name__ == "__main__":
    main()
