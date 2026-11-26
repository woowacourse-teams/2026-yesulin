import fnmatch
import json
import os
import re
import subprocess
import sys
from pathlib import Path


CHECKS = {"frontend", "backend"}
SCOPES = {"frontend": {"frontend"}, "backend": {"backend"}, "both": CHECKS, "none": set()}
ROOT = Path(__file__).resolve().parents[2]


def load_rules(path):
    rules = json.loads(path.read_text(encoding="utf-8"))["rules"]
    patterns = [pattern for rule in rules for pattern in rule["paths"]]
    if not rules or set(rule["run"] for rule in rules) != SCOPES.keys():
        raise ValueError("Rules must declare frontend, backend, both and none")
    if any(not pattern or pattern.startswith(("/", "*")) for pattern in patterns):
        raise ValueError("Each rule pattern must begin with a repository path")
    if len(patterns) != len(set(patterns)):
        raise ValueError("Duplicate path pattern")
    return rules


def scope_for(path, rules):
    for rule in rules:
        if any(fnmatch.fnmatchcase(path, pattern) for pattern in rule["paths"]):
            return rule["run"]
    return None


def classify(paths, rules):
    scopes = {path: scope_for(path, rules) for path in paths}
    unknown = [path for path, scope in scopes.items() if scope is None]
    if unknown:
        raise ValueError(f"Unclassified paths. Update .github/ci-paths.json: {json.dumps(unknown, ensure_ascii=True)}")
    return set().union(*(SCOPES[scope] for scope in scopes.values()))


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def require_sha(value):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9a-f]{40}", value):
        raise ValueError("Expected a full Git commit SHA")
    return value


def comparison(event_name, payload, head):
    if event_name == "pull_request":
        pr = payload["pull_request"]
        return require_sha(pr["base"]["sha"]), require_sha(pr["head"]["sha"]), "selective"
    if event_name == "push" and payload["after"] == head:
        return require_sha(payload["before"]), None, "selective"
    if event_name == "workflow_dispatch":
        inputs = payload["inputs"]
        if inputs["mode"] in {"full", "selective"}:
            return require_sha(inputs["base_sha"]), None, inputs["mode"]
    raise ValueError("Unrecognized CI event or inconsistent commit metadata")


def ensure_base(base):
    exists = subprocess.run(["git", "cat-file", "-e", f"{base}^{{commit}}"], cwd=ROOT, stderr=subprocess.DEVNULL)
    if exists.returncode:
        git("fetch", "--no-tags", "--depth=1", "origin", base)
    git("cat-file", "-e", f"{base}^{{commit}}")


def changed_paths(base, head, pr_head=None, *, allow_initial_push=False):
    if pr_head and git("show", "-s", "--format=%P", head).decode().split() != [base, pr_head]:
        raise ValueError("PR merge commit does not match event base and head")
    if base == "0" * 40 and allow_initial_push:
        return decode_paths(git("ls-tree", "-rz", "--name-only", head))
    ensure_base(base)
    return decode_paths(git("diff", "--name-only", "-z", "--no-renames", "--ignore-submodules=none", base, head, "--"))


def decode_paths(output):
    return [os.fsdecode(path) for path in output.split(b"\0") if path]


def write_result(mode, selected, paths, base, head):
    active = selected.copy()
    if mode == "full":
        active.update(CHECKS)
    with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf-8") as output:
        for check in sorted(CHECKS):
            print(f"{check}={str(check in active).lower()}", file=output)
    needed = ", ".join(sorted(selected)) or "none"
    executed = ", ".join(sorted(active)) or "none"
    with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a", encoding="utf-8") as summary:
        print(f"### CI paths\n\n- Mode: `{mode}`\n- Range: `{base}` → `{head}`", file=summary)
        print(f"- Changed paths: {len(paths)}\n- Selected: {needed}\n- Run: {executed}", file=summary)


def main():
    event_name = os.environ["GITHUB_EVENT_NAME"]
    head = require_sha(os.environ["GITHUB_SHA"])
    if git("rev-parse", "HEAD").decode().strip() != head:
        raise ValueError("Checkout does not match the GitHub event commit")
    payload = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
    base, pr_head, mode = comparison(event_name, payload, head)
    paths = changed_paths(base, head, pr_head, allow_initial_push=event_name == "push")
    selected = classify(paths, load_rules(ROOT / ".github/ci-paths.json"))
    write_result(mode, selected, paths, base, head)


if __name__ == "__main__":
    try:
        main()
    except (KeyError, TypeError, ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(f"CI path selection failed: {error}")
