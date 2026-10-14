"""PC -> DEV HTTPS only. Keep metadata, console, summary and raw points per run."""
import argparse
import datetime as dt
import json
import hashlib
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = 'https://dev-api.yesulin.art'


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--rps', type=int, required=True)
    p.add_argument('--app-credit', type=float, required=True)
    p.add_argument('--db-credit', type=float, required=True)
    p.add_argument('--credit-time', required=True, help='Latest CloudWatch datapoint ISO8601, not fetch time')
    args = p.parse_args()
    credit_time = dt.datetime.fromisoformat(args.credit_time.replace('Z', '+00:00'))
    now = dt.datetime.now(dt.timezone.utc)
    if credit_time.tzinfo is None or not dt.timedelta(0) <= now-credit_time <= dt.timedelta(minutes=15):
        p.error('CPU credit datapoint must be timezone-aware and at most 15 minutes old')
    if min(args.app_credit, args.db_credit) < 50 or not 1 <= args.rps <= 500:
        p.error('Require >=50 credits on both Standard DEV instances and RPS=1..500')
    if ROOT.joinpath('results', 'RUNNING').exists():
        p.error('Another run is marked active; inspect before clearing RUNNING')
    run_id = now.strftime('%Y%m%dT%H%M%SZ') + f'-r{args.rps}'
    result = ROOT / 'results' / run_id
    result.mkdir(parents=True)
    with urllib.request.urlopen(BASE+'/api/v1/public/audition-posts?page=0&size=12', timeout=10) as response:
        data = json.load(response)
    fixture = {'open': data['openCount'], 'all': data['allCount']}
    fixture_path = result / 'fixture.json'
    fixture_path.write_text(json.dumps(fixture))
    meta = vars(args) | {'id': run_id, 'base': BASE, 'mode': 'rps', 'warmupSeconds': 30,
                         'warmupRps': 1, 'stopPolicy': 'fixed-window', 'graceSeconds': 12, 'httpTimeoutSeconds': 10, 'latencyAbort': False, 'gapSeconds': 5, 'holdSeconds': 60, 'preAllocatedVUs': min(2500, max(20, args.rps*12+20)),
                         'maxVUs': min(2500, max(20, args.rps*12+20)),
                         'fixture': fixture, 'scriptSha256': hashlib.sha256((ROOT/'list.js').read_bytes()).hexdigest(), 'sourceCommit': subprocess.check_output(
                             ['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
                         'k6Version': subprocess.check_output(['k6', 'version'], text=True).strip(),
                         'startedUTC': dt.datetime.now(dt.timezone.utc).isoformat()}
    meta_path = result / 'metadata.json'
    meta_path.write_text(json.dumps(meta, indent=2)+'\n')
    command = ['k6', 'run', '--no-usage-report', '--quiet', '--no-color',
               '-e', f'RPS={args.rps}', '-e', f'RUN_ID={run_id}',
               '-e', f'FIXTURE_FILE={fixture_path}', '--summary-export', str(result/'summary.json'),
               '--out', f'json={result / "raw.ndjson"}', str(ROOT/'list.js')]
    lock = ROOT/'results'/'RUNNING'
    with lock.open('x') as handle:
        handle.write(run_id)
    try:
        with (result/'console.log').open('w') as log:
            print(f'RUN {run_id}: warmup 1 RPS/30s; measure {args.rps} RPS/60s', flush=True)
            status = subprocess.call(command, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
        meta.update(exitCode=status, endedUTC=dt.datetime.now(dt.timezone.utc).isoformat())
        meta_path.write_text(json.dumps(meta, indent=2)+'\n')
    finally:
        lock.unlink(missing_ok=True)
    subprocess.run(['python3', str(ROOT/'report.py')], check=True)
    print(f'RESULT {result}; k6 exit={status}', flush=True)
    raise SystemExit(status)


if __name__ == '__main__':
    main()
