import argparse
import csv
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime


BUILDS = {"Backend": "Build backend", "Frontend": "Build frontend"}
WORKFLOW_PATH = ".github/workflows/ci.yml"
MEASURED_STEPS = {
    "Backend": ("Set up Java", "Set up Gradle", "Build backend", "Test deployment scripts"),
    "Frontend": ("Set up Node.js", "Install frontend dependencies", "Run frontend lint", "Build frontend"),
}


def api(path):
    return json.loads(subprocess.check_output(["gh", "api", path]))


def seconds(start, end):
    if not start or not end:
        return None
    return int((datetime.fromisoformat(end.replace("Z", "+00:00"))
                - datetime.fromisoformat(start.replace("Z", "+00:00"))).total_seconds())


def step_seconds(step):
    return seconds(step.get("started_at"), step.get("completed_at"))


def job_steps(job):
    return {step["name"]: step for step in job.get("steps", [])}


def measured_seconds(steps, job_name):
    if not set(MEASURED_STEPS[job_name]).issubset(steps):
        return None
    started = [steps[name] for name in MEASURED_STEPS[job_name] if steps[name]["conclusion"] != "skipped"]
    durations = [step_seconds(step) for step in started]
    if None in durations:
        return None
    return sum(durations)


def job_fields(job):
    steps = job_steps(job)
    build = steps.get(BUILDS[job["name"]], {})
    routing = next((step for name, step in steps.items() if name.startswith("Select changes (")), {})
    return {
        "name": job["name"], "conclusion": job["conclusion"], "build_result": build.get("conclusion"),
        "started_at": job["started_at"], "completed_at": job["completed_at"], "seconds": step_seconds(job),
        "measure_steps_seconds": measured_seconds(steps, job["name"]), "select_seconds": step_seconds(routing),
        "runner_labels": ";".join(job["labels"]), "url": job["html_url"],
    }


def execution_mode(jobs):
    modes = {name.removeprefix("Select changes (").removesuffix(")")
             for job in jobs for name in job_steps(job) if name.startswith("Select changes (")}
    if len(modes) > 1 or modes.difference({"full", "selective"}):
        raise ValueError(f"Inconsistent CI execution modes: {sorted(modes)}")
    if len(jobs) != 2:
        return "incomplete"
    return next(iter(modes), "before")


def run_fields(run, jobs):
    finish, job_total = completed_timings(run, jobs)
    return {
        "run_id": run["id"], "attempt": run["run_attempt"], "mode": execution_mode(jobs), "event": run["event"],
        "head_ref": run["head_branch"], "head_sha": run["head_sha"], "benchmark_base_sha": benchmark_base(run),
        "run_url": run["html_url"],
        "conclusion": run["conclusion"], "run_created_at": run["created_at"], "run_started_at": run["run_started_at"],
        "last_check_completed_at": finish,
        "checks_wall_seconds": seconds(run["run_started_at"], finish),
        "created_to_checks_done_seconds": initial_attempt_seconds(run, finish), "check_job_seconds": job_total,
    }


def benchmark_base(run):
    if run["event"] != "workflow_dispatch":
        return None
    match = re.fullmatch(r"CI benchmark (?:full|selective) base ([0-9a-f]{40})", run["display_title"])
    if match:
        return match[1]
    return None


def completed_timings(run, jobs):
    if run["conclusion"] != "success" or len(jobs) != 2 or any(job["conclusion"] != "success" for job in jobs):
        return None, None
    durations = [step_seconds(job) for job in jobs]
    if None in durations:
        return None, None
    return max(job["completed_at"] for job in jobs), sum(durations)


def initial_attempt_seconds(run, finish):
    if run["run_attempt"] == 1:
        return seconds(run["created_at"], finish)
    return None


def collect(repo, run_id, attempt):
    route = f"repos/{repo}/actions/runs/{run_id}/attempts/{attempt}"
    run = api(route)
    if run["path"] != WORKFLOW_PATH:
        raise ValueError(f"Run {run_id} is not from {WORKFLOW_PATH}")
    result = api(f"{route}/jobs?per_page=100")
    if run["status"] != "completed" or result["total_count"] != len(result["jobs"]):
        raise ValueError(f"Run {run_id}, attempt {attempt} is incomplete or has truncated job data")
    jobs = select_jobs(run["event"], result["jobs"])
    if len(jobs) != len({job["name"] for job in jobs}) or not jobs:
        raise ValueError(f"Run {run_id}, attempt {attempt} has missing or duplicate CI checks")
    common = run_fields(run, jobs)
    return [{**common, **{f"job_{key}": value for key, value in job_fields(job).items()}}
            for job in sorted(jobs, key=lambda job: job["name"])]


def select_jobs(event, jobs):
    if event == "workflow_dispatch":
        names = {f"Benchmark {name}": name for name in BUILDS}
        return [dict(job, name=names[job["name"]]) for job in jobs if job["name"] in names]
    return [job for job in jobs if job["name"] in BUILDS]


def main():
    parser = argparse.ArgumentParser(description="Export GitHub CI timing by run, attempt and job as CSV")
    parser.add_argument("run_ids", nargs="+", type=int)
    parser.add_argument("--attempt", type=int, default=1)
    parser.add_argument("--repo", default="woowacourse-teams/2026-yesulin")
    args = parser.parse_args()
    with ThreadPoolExecutor(max_workers=4) as workers:
        groups = list(workers.map(lambda run_id: collect(args.repo, run_id, args.attempt), args.run_ids))
    writer = csv.DictWriter(sys.stdout, fieldnames=list(groups[0][0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(row for group in groups for row in group)


if __name__ == "__main__":
    try:
        main()
    except (KeyError, ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(f"CI timing export failed: {error}")
