import unittest

import collect_timings as timing


class CompareTimingsTest(unittest.TestCase):
    def test_elapsed_time_and_parallel_job_time_are_separate(self):
        run = {
            "id": 123, "run_attempt": 1, "event": "push", "head_branch": "dev", "head_sha": "1" * 40,
            "html_url": "run-url", "conclusion": "success", "created_at": "2026-11-18T00:00:00Z",
            "run_started_at": "2026-11-18T00:00:03Z",
        }
        jobs = [
            {"started_at": "2026-11-18T00:00:05Z", "completed_at": "2026-11-18T00:00:45Z", "conclusion": "success"},
            {"started_at": "2026-11-18T00:00:10Z", "completed_at": "2026-11-18T00:01:10Z", "conclusion": "success"},
        ]
        row = timing.run_fields(run, jobs)
        self.assertEqual(67, row["checks_wall_seconds"])
        self.assertEqual(70, row["created_to_checks_done_seconds"])
        self.assertEqual(100, row["check_job_seconds"])
        self.assertIsNone(timing.run_fields(dict(run, run_attempt=2), jobs)["created_to_checks_done_seconds"])
        self.assertIsNone(timing.run_fields(dict(run, conclusion="cancelled"), jobs)["checks_wall_seconds"])

    def test_skipped_steps_are_zero_but_missing_timestamps_are_unknown(self):
        steps = {name: {"conclusion": "skipped"} for name in timing.MEASURED_STEPS["Frontend"]}
        self.assertEqual(0, timing.measured_seconds(steps, "Frontend"))
        steps["Build frontend"] = {"conclusion": "success"}
        self.assertIsNone(timing.measured_seconds(steps, "Frontend"))

    def test_mode_is_read_from_the_run_and_partial_reruns_are_not_comparable(self):
        old_jobs = [{"steps": []}, {"steps": []}]
        selective_job = {"steps": [{"name": "Select changes (selective)"}]}
        self.assertEqual("before", timing.execution_mode(old_jobs))
        self.assertEqual("selective", timing.execution_mode([selective_job, selective_job]))
        self.assertEqual("incomplete", timing.execution_mode([selective_job]))

    def test_benchmark_checks_have_separate_names_from_branch_checks(self):
        jobs = [{"name": "Backend", "id": 11}, {"name": "Benchmark Backend", "id": 22}]
        self.assertEqual([{"name": "Backend", "id": 11}], timing.select_jobs("pull_request", jobs))
        self.assertEqual([{"name": "Backend", "id": 22}], timing.select_jobs("workflow_dispatch", jobs))

    def test_benchmark_records_the_base_to_match_runs(self):
        sha = "12ab" * 10
        run = {"event": "workflow_dispatch", "display_title": f"CI benchmark full base {sha}"}
        self.assertEqual(sha, timing.benchmark_base(run))
        self.assertIsNone(timing.benchmark_base(dict(run, event="push")))
        self.assertIsNone(timing.benchmark_base(dict(run, display_title="CI benchmark full base main")))
