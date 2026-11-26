import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import select_changes as ci


class PathRulesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rules = ci.load_rules(ci.ROOT / ".github/ci-paths.json")

    def test_repository_inputs(self):
        cases = {
            ".nvmrc": {"frontend"},
            ".gitignore": {"frontend"},
            "package-lock.json": {"frontend"},
            "package.json": {"frontend"},
            "frontend/src/app/새 페이지.tsx": {"frontend"},
            "frontend/docs/example.ts": {"frontend"},
            "frontend/docs/design-system.md": {"frontend"},
            "backend/src/main/java/art/yesulin/audit/docs/Example.java": {"backend"},
            "backend/src/main/resources/db/migration/V01__new.sql": {"backend"},
            "backend/docs/operations/deployment.md": set(),
            "scripts/config/verify-build-source.sh": {"backend"},
            "scripts/config/tests/deploy_env_test.sh": {"backend"},
            "ops/monitor/cloudwatch/database_metrics.py": {"backend"},
            "ops/monitor/cloudwatch/update_dashboards.py": {"backend"},
            "ops/monitor/cloudwatch/queries.json": {"backend"},
            "ops/monitor/cloudwatch/tests/test_future_metric.py": {"backend"},
            "ops/pdf-extraction-lambda/src/s3_handler.py": set(),
            "ops/poster-thumbnails/README.md": set(),
            "ops/poster-thumbnails/home-2026-11-17.json": set(),
            "config-version.txt": set(),
            "buildspec.yml": set(),
            "docs/domain.md": set(),
            ".gitattributes": ci.CHECKS,
            ".github/workflows/ci.yml": ci.CHECKS,
            ".github/ci-paths.json": ci.CHECKS,
            "scripts/ci/select_changes.py": ci.CHECKS,
        }
        for path, expected in cases.items():
            with self.subTest(path=path):
                self.assertEqual(expected, ci.classify([path], self.rules))

    def test_multiple_changes_and_empty_diff(self):
        self.assertEqual(ci.CHECKS, ci.classify(["frontend/public/icon.svg", "backend/gradlew"], self.rules))
        self.assertEqual(set(), ci.classify([], self.rules))

    def test_unknown_paths_fail_even_with_known_changes(self):
        paths = ["frontend/package.json", "new-service/main.py", ".github/workflows/new-ci.yml"]
        with self.assertRaisesRegex(ValueError, "new-service/main.py.*new-ci.yml"):
            ci.classify(paths, self.rules)

    def test_all_tracked_paths_have_a_rule(self):
        ci.classify(ci.decode_paths(ci.git("ls-files", "-z")), self.rules)

    def test_new_poster_operations_path_requires_a_rule(self):
        with self.assertRaisesRegex(ValueError, "ops/poster-thumbnails/backfill.py"):
            ci.classify(["ops/poster-thumbnails/backfill.py"], self.rules)


class GitComparisonTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.git("init", "-b", "main")
        for key, value in (("user.email", "test@example.com"), ("user.name", "CI test"), ("commit.gpgsign", "false")):
            self.git("config", key, value)
        self.base = self.commit("frontend/공고\n목록.tsx")

    def git(self, *args):
        with patch.object(ci, "ROOT", self.root):
            return ci.git("-c", "core.hooksPath=/dev/null", *args).decode().strip()

    def commit(self, path):
        file = self.root / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text("content", encoding="utf-8")
        return self.commit_all()

    def commit_all(self):
        self.git("add", "--all")
        self.git("commit", "-m", "Fixture")
        return self.git("rev-parse", "HEAD")

    def test_rename_includes_both_paths_and_deletion_includes_old_path(self):
        (self.root / "backend").mkdir()
        self.git("mv", "frontend/공고\n목록.tsx", "backend/moved.tsx")
        head = self.commit_all()
        self.git("rm", "backend/moved.tsx")
        latest = self.commit_all()
        with patch.object(ci, "ROOT", self.root):
            self.assertCountEqual(["frontend/공고\n목록.tsx", "backend/moved.tsx"], ci.changed_paths(self.base, head))
            self.assertEqual(["backend/moved.tsx"], ci.changed_paths(head, latest))

    def test_pr_compares_base_with_the_actual_test_merge(self):
        self.git("checkout", "-b", "feature")
        pr_head = self.commit("frontend/new.tsx")
        self.git("checkout", "main")
        current_base = self.commit("backend/new.java")
        self.git("merge", "--no-ff", "-m", "Test merge", pr_head)
        head = self.git("rev-parse", "HEAD")
        with patch.object(ci, "ROOT", self.root):
            self.assertEqual(["frontend/new.tsx"], ci.changed_paths(current_base, head, pr_head))
            with self.assertRaisesRegex(ValueError, "does not match"):
                ci.changed_paths(self.base, head, pr_head)

    def test_shallow_checkout_fetches_exact_earlier_push_base(self):
        self.commit("backend/a.java")
        self.commit("backend/b.java")
        head = self.commit("frontend/a.tsx")
        with tempfile.TemporaryDirectory() as clone:
            self.git("clone", "--depth=2", self.root.as_uri(), clone)
            with patch.object(ci, "ROOT", Path(clone)):
                self.assertCountEqual(
                    ["backend/a.java", "backend/b.java", "frontend/a.tsx"], ci.changed_paths(self.base, head)
                )

    def test_initial_push_uses_all_paths(self):
        with patch.object(ci, "ROOT", self.root):
            self.assertEqual(["frontend/공고\n목록.tsx"], ci.changed_paths("0" * 40, self.base, allow_initial_push=True))

    def test_selector_writes_no_outputs_when_comparison_fails(self):
        rules = self.root / ".github/ci-paths.json"
        rules.parent.mkdir()
        rules.write_bytes((ci.ROOT / ".github/ci-paths.json").read_bytes())
        head = self.commit("new-root/build.sh")
        with tempfile.TemporaryDirectory() as temporary:
            work = Path(temporary)
            event = work / "push.json"
            event.write_text(json.dumps({"before": self.base, "after": head}), encoding="utf-8")
            env = dict(GITHUB_EVENT_NAME="push", GITHUB_SHA=head, GITHUB_EVENT_PATH=str(event),
                       GITHUB_OUTPUT=str(work / "outputs"), GITHUB_STEP_SUMMARY=str(work / "summary"))
            with patch.object(ci, "ROOT", self.root), patch.dict(os.environ, env):
                with self.assertRaisesRegex(ValueError, "Unclassified"):
                    ci.main()
            self.assertFalse((work / "outputs").exists())

    def test_push_head_must_match_the_event(self):
        with self.assertRaisesRegex(ValueError, "inconsistent"):
            ci.comparison("push", {"before": self.base, "after": self.base}, "1" * 40)

    def test_missing_base_is_an_error(self):
        with patch.object(ci, "ROOT", self.root):
            with self.assertRaises(subprocess.CalledProcessError):
                ci.changed_paths("1" * 40, self.base)


class BenchmarkSelectionTest(unittest.TestCase):
    def test_full_mode_runs_both_but_keeps_original_selection(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "out"
            summary = Path(temporary) / "summary"
            with patch.dict(os.environ, GITHUB_OUTPUT=str(output), GITHUB_STEP_SUMMARY=str(summary)):
                ci.write_result("full", {"frontend"}, ["frontend/a.tsx"], "1" * 40, "2" * 40)
            self.assertEqual("backend=true\nfrontend=true\n", output.read_text(encoding="utf-8"))
            self.assertIn("Selected: frontend\n", summary.read_text(encoding="utf-8"))
