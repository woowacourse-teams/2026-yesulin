"""Pure aggregation/configuration checks. Does not access AWS, Docker, Linux counters or secrets."""

import importlib.util
import json
import re
import contextlib
import io
import tempfile
from unittest import mock
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[4]


def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


db = load("db", "ops/monitor/cloudwatch/database_metrics.py")
agent = load("agent", "backend/deploy/monitoring/render_agent.py")
dashboards = load("dashboards", "ops/monitor/cloudwatch/update_dashboards.py")


class DatabaseMetricsTest(unittest.TestCase):
    def test_interval_cache_hit_and_resets(self):
        status = {"uptime": 100, "innodb_buffer_pool_read_requests": 1000, "innodb_buffer_pool_reads": 100,
                  "questions": 100, "slow_queries": 2, "innodb_row_lock_waits": 10, "innodb_row_lock_time": 20}
        host = {"HostMemoryAvailable": 1024, "HostSwapUsed": 0, "swap_in": 1000, "swap_out": 500,
                "disk_read": 1000, "disk_write": 500, "disk_io_ms": 20}
        baseline, state = db.collect("dev", status, host, {}, 100, "boot")
        self.assertNotIn("BufferPoolCacheHitPct", baseline)
        new = dict(status, uptime=160, innodb_buffer_pool_read_requests=1100, innodb_buffer_pool_reads=101,
                   questions=220, slow_queries=3, innodb_row_lock_waits=12, innodb_row_lock_time=120)
        event, state2 = db.collect("dev", new, dict(host, swap_in=2000, disk_io_ms=80), state, 160, "boot")
        self.assertEqual(99, event["BufferPoolCacheHitPct"])
        self.assertEqual(2, event["QueriesPerSecond"])
        self.assertEqual(1, event["SlowQueries"])
        self.assertEqual(100, event["RowLockTimeMs"])
        self.assertEqual(1000, event["HostSwapInBytes"])
        self.assertEqual(60, event["DataDiskIoTimeMs"])
        idle, _ = db.collect("dev", new, host, state2, 220, "boot")
        self.assertNotIn("BufferPoolCacheHitPct", idle)
        reboot, _ = db.collect("dev", new, host, state2, 220, "another-boot")
        self.assertNotIn("HostSwapInBytes", reboot)
        reset, _ = db.collect("dev", dict(new, uptime=1), host, state2, 220, "boot")
        self.assertNotIn("QueriesPerSecond", reset)
        self.assertNotIn("RowLockTimeMs", reset)

    def test_snapshot_has_no_emf_or_nonfinite_value(self):
        event, _ = db.collect("prod", {}, {"HostMemoryAvailable": float("nan")}, {}, 0, "boot")
        self.assertNotIn("HostMemoryAvailable", event)
        self.assertNotIn("_aws", event)
        self.assertIn("timestamp", event)
        json.dumps(event, allow_nan=False)

    def test_corrupt_baseline_recovers_without_emitting_false_deltas(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "state.json"
            for text in ("broken json", '["wrong-shape"]', '{"time":"invalid"}'):
                path.write_text(text)
                with contextlib.redirect_stderr(io.StringIO()):
                    state = db.load_state(path)
                self.assertEqual({}, state)
                event, _ = db.collect("dev", {"uptime": 5, "questions": 30}, {}, state, 100, "boot")
                self.assertNotIn("QueriesPerSecond", event)


class ConfigurationTest(unittest.TestCase):
    def test_query_definition_prefix_meets_aws_rules_across_pages(self):
        class Logs:
            def __init__(self):
                self.tokens = []

            def describe_query_definitions(self, **request):
                prefix = request["queryDefinitionNamePrefix"]
                if prefix.startswith("/") or prefix.endswith("/") or "//" in prefix:
                    raise ValueError("Invalid AWS query definition prefix")
                self.tokens.append(request.get("nextToken"))
                if not request.get("nextToken"):
                    return {"queryDefinitions": [{"name": prefix + "/runtime-latest"}], "nextToken": "page2"}
                return {"queryDefinitions": [{"name": prefix + "/error-details"}]}

        for environment in ("dev", "prod"):
            logs = Logs()
            result = dashboards.query_definitions(logs, environment)
            self.assertEqual([None, "page2"], logs.tokens)
            self.assertEqual([f"yesulin/{environment}/runtime-latest", f"yesulin/{environment}/error-details"],
                             [definition["name"] for definition in result])

    def test_migrates_http_only_source_preserving_unrelated_logs_and_is_idempotent(self):
        original = {"logs": {"logs_collected": {"files": {"collect_list": [
            {"file_path": "/var/log/yesulin/yesulin.log", "log_group_name": "/yesulin/dev/backend"},
            {"file_path": "/var/log/another.log", "log_group_name": "/another"},
        ]}}}}
        rendered = agent.render(original, "dev", "backend")
        entries = rendered["logs"]["logs_collected"]["files"]["collect_list"]
        self.assertEqual(2, len(entries))
        self.assertIn("UNEXPECTED_ERROR", entries[0]["filters"][0]["expression"])
        self.assertIn("RUNTIME_METRICS", entries[0]["filters"][0]["expression"])
        self.assertEqual(original["logs"]["logs_collected"]["files"]["collect_list"][1], entries[1])
        self.assertEqual(rendered, agent.render(rendered, "dev", "backend"))
        missing_group = {"logs": {"logs_collected": {"files": {"collect_list": [{"file_path": "/var/log/yesulin/yesulin.log"}]}}}}
        recovered = agent.render(missing_group, "dev", "backend")
        self.assertEqual("/yesulin/dev/backend", recovered["logs"]["logs_collected"]["files"]["collect_list"][0]["log_group_name"])
        with self.assertRaises(ValueError):
            agent.render(original, "prod", "backend")

    def test_pdf_messages_are_collected_only_in_dev(self):
        flow = json.dumps({"message": "PDF_FLOW stage=AI_COMPLETED jobId=synthetic", "level": "DEBUG"})
        failure = json.dumps({"message": "PDF_AI_FAILED jobId=synthetic code=PROVIDER_ERROR retryable=true"})
        for environment in ("dev", "prod"):
            rendered = agent.render({}, environment, "backend")
            expression = rendered["logs"]["logs_collected"]["files"]["collect_list"][0]["filters"][0]["expression"]
            for message in (flow, failure):
                self.assertEqual(environment == "dev", bool(re.search(expression, message)))
            self.assertIsNotNone(re.search(expression, json.dumps({"event": "HTTP_REQUEST"})))
            self.assertIsNotNone(re.search(expression, json.dumps({"event": "PDF_AI_RESILIENCE"})))
            self.assertIsNone(re.search(expression, json.dumps({"event": "PDF_AI_RESILIENCE_PRIVATE"})))
            self.assertIsNone(re.search(expression, json.dumps({"message": "unrelated PDF_FLOW text"})))
            self.assertIsNone(re.search(expression, json.dumps({"message": "PDF_FLOW_PRIVATE payload"})))

    def test_keeps_infrastructure_and_unrelated_widgets(self):
        infra = {"type": "metric", "properties": {"title": "EC2 CPU"}}
        other = {"type": "text", "properties": {"markdown": "operational note"}}
        old_api = {"type": "log", "properties": {"title": "API DEV | requests"}}
        snapshot = {"type": "text", "properties": {"markdown": "### PROD 오늘 로컬 파일 스냅샷 (자동 갱신 아님)"}}
        original = {"widgets": [infra, old_api, other, snapshot]}
        self.assertEqual([infra, other], dashboards.base_dashboard(original)["widgets"])
        self.assertEqual(4, len(original["widgets"]))
        queries = json.loads((ROOT / "ops/monitor/cloudwatch/queries.json").read_text())
        groups = {"/yesulin/dev/backend", "/yesulin/prod/backend"}
        body = dashboards.unified_dashboard(original, queries, groups)
        self.assertEqual(body, dashboards.unified_dashboard(body, queries, groups))
        self.assertEqual(1, sum(w == infra for w in body["widgets"]))
        self.assertEqual(1, sum(dashboards.is_snapshot(w) for w in body["widgets"]))
        self.assertTrue(all(w["type"] != "metric" or w == infra for w in body["widgets"]))
        self.assertFalse(any("/database'" in w.get("properties", {}).get("query", "") for w in body["widgets"]))
        complete = dashboards.unified_dashboard(original, queries, groups | {"/yesulin/dev/database"})
        self.assertTrue(any("/yesulin/dev/database'" in w.get("properties", {}).get("query", "")
                            for w in complete["widgets"]))

    def test_loadtest_dashboard_reads_existing_logs_per_second_and_keeps_manual_widgets(self):
        queries = dashboards.loadtest_queries(json.loads((ROOT / "ops/monitor/cloudwatch/queries.json").read_text()))
        for excluded in ("reservation-outcomes", "read-reservation-mix", "resource-requests-minute"):
            self.assertNotIn(excluded, queries)
        self.assertIn("bin(1s)", queries["resource-requests-second"]["query"])
        self.assertIn("bin(1m)", queries["database-lock-waits"]["query"])
        self.assertFalse(any("bin(1m)" in spec["query"] for spec in queries.values()
                             if spec.get("source", "backend") == "backend"))
        credit = {"type": "metric", "properties": {"title": "DEV CPU credit"}}
        copied = {"type": "log", "properties": {"title": "LOG DEV | copied by hand"}}
        groups = {"/yesulin/dev/backend", "/yesulin/dev/database"}
        body = dashboards.loadtest_dashboard({"widgets": [credit, copied]}, queries, groups)
        self.assertEqual("-PT15M", body["start"])
        self.assertEqual(body, dashboards.loadtest_dashboard(body, queries, groups))
        self.assertEqual([credit, copied], body["widgets"][:2])
        owned = [w for w in body["widgets"] if w["type"] == "log" and w != copied]
        self.assertEqual({"SOURCE '/yesulin/dev/backend'", "SOURCE '/yesulin/dev/database'"},
                         {w["properties"]["query"].split(" | ")[0] for w in owned})
        self.assertTrue(all(w["properties"]["title"].startswith("LOG LOADTEST | ") for w in owned))
        waiting = dashboards.loadtest_dashboard({"widgets": []}, queries, set())
        self.assertFalse(any(w["type"] == "log" for w in waiting["widgets"]))

    def test_unified_dashboard_keeps_loadtest_widgets_and_loadtest_refuses_the_unified_name(self):
        loadtest = {"type": "log", "properties": {"title": "LOG LOADTEST | copied by hand"}}
        self.assertEqual([loadtest], dashboards.base_dashboard({"widgets": [loadtest]})["widgets"])
        with mock.patch("sys.argv", ["update_dashboards.py", "--loadtest", "--plan", "--base", "DASHBOARD-yesulin"]):
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                dashboards.main()

    def test_only_per_second_queries_are_saved_apart_from_the_minute_queries(self):
        class Logs:
            def __init__(self):
                self.saved = []

            def describe_query_definitions(self, **request):
                return {"queryDefinitions": [{"name": "yesulin/loadtest/runtime-cpu", "queryDefinitionId": "kept"}]}

            def put_query_definition(self, **request):
                self.saved.append(request)

        logs = Logs()
        queries = dashboards.per_second_only(dashboards.loadtest_queries(
            json.loads((ROOT / "ops/monitor/cloudwatch/queries.json").read_text())))
        dashboards.save_query_definitions(logs, "loadtest", "dev", queries, {"/yesulin/dev/backend", "/yesulin/dev/database"})
        self.assertTrue(logs.saved)
        self.assertTrue(all(request["name"].startswith("yesulin/loadtest/") for request in logs.saved))
        self.assertTrue(all(request["logGroupNames"] == ["/yesulin/dev/backend"] for request in logs.saved))
        self.assertTrue(all("bin(1s)" in request["queryString"] for request in logs.saved))
        updated = next(request for request in logs.saved if request["name"] == "yesulin/loadtest/runtime-cpu")
        self.assertEqual("kept", updated["queryDefinitionId"])

    def test_removes_only_owned_host_metrics_from_previous_config(self):
        old = {"metrics": {"namespace": "CWAgent", "metrics_collected": {
            "mem": {"measurement": ["mem_available"], "metrics_collection_interval": 60,
                    "append_dimensions": {"Environment": "dev", "Service": "backend"}},
            "swap": {"measurement": ["swap_used_percent"], "metrics_collection_interval": 60,
                     "append_dimensions": {"Environment": "dev", "Service": "backend"}},
            "cpu": {"measurement": ["cpu_usage_idle"]},
        }}}
        result = agent.render(old, "dev", "backend")
        self.assertEqual({"cpu": {"measurement": ["cpu_usage_idle"]}}, result["metrics"]["metrics_collected"])
        self.assertNotIn("metrics", agent.render({}, "dev", "backend"))


if __name__ == "__main__":
    unittest.main()
