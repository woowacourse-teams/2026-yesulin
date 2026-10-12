"""Pure aggregation/configuration checks. Does not access AWS, Docker, Linux counters or secrets."""

import importlib.util
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

    def test_emf_has_no_high_cardinality_dimension_or_nonfinite_metric(self):
        event, _ = db.collect("prod", {}, {"HostMemoryAvailable": float("nan")}, {}, 0, "boot")
        self.assertNotIn("HostMemoryAvailable", event)
        directive = event["_aws"]["CloudWatchMetrics"][0]
        self.assertEqual([["Environment"]], directive["Dimensions"])
        for metric in directive["Metrics"]:
            self.assertIn(metric["Name"], event)


class ConfigurationTest(unittest.TestCase):
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
        with self.assertRaises(ValueError):
            agent.render(original, "prod", "backend")

    def test_keeps_infrastructure_and_unrelated_widgets(self):
        infra = {"type": "metric", "properties": {"title": "EC2 CPU"}}
        other = {"type": "text", "properties": {"markdown": "operational note"}}
        old_api = {"type": "log", "properties": {"title": "API DEV | requests"}}
        original = {"widgets": [infra, old_api, other]}
        self.assertEqual([infra, other], dashboards.base_dashboard(original)["widgets"])
        self.assertEqual(3, len(original["widgets"]))
        # 46 directly referenced custom metrics plus up to 4 host metrics on the current two backend instances.
        body = dashboards.metric_dashboard()
        literal = [m for w in body["widgets"] for m in w.get("properties", {}).get("metrics", []) if isinstance(m[0], str)]
        self.assertEqual(46, len(literal))


if __name__ == "__main__":
    unittest.main()
