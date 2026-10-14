"""Build an offline report. Preserve missing samples and partial-test denominators."""
import argparse
import datetime as dt
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VARIANTS = ('first', 'paged', 'all')


def percentile(values, q):
    values = sorted(values)
    if not values:
        return None
    i = (len(values)-1)*q
    lo = int(i)
    return round(values[lo]+(values[min(lo+1, len(values)-1)]-values[lo])*(i-lo), 2)


def time(value):
    value = re.sub(r'\.(\d+)(?=Z|[+-])', lambda m: '.' + (m[1]+'000000')[:6], value)
    return dt.datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()


def pct(numerator, denominator):
    return round(100*numerator/denominator, 3) if denominator else None


def statistics(points, beginning, seconds):
    def values(metric):
        return [p['data']['value'] for p in points if p['metric'] == metric]
    started, completed = sum(values('list_started')), sum(values('list_requests'))
    errors = values('list_errors')
    statuses, codes = defaultdict(int), defaultdict(int)
    bins = defaultdict(lambda: defaultdict(list))
    for p in points:
        data, metric = p['data'], p['metric']
        second = int(time(data['time'])-beginning)
        bins[second][metric].append(data['value'])
        if metric == 'list_status':
            tags = data.get('tags', {})
            statuses[tags['status']] += data['value']
            codes[tags.get('error_code', '0')] += data['value']
    completed_during = sum(p['data']['value'] for p in points
                           if p['metric'] == 'list_requests' and time(p['data']['time']) < beginning+seconds)
    rows = []
    for second in range(max(1, int(seconds+0.999), max(bins, default=0)+1)):
        b = bins[second]
        latencies = b['list_end_to_end_ms']
        rows.append({'second': second, 'started': sum(b['list_started']),
                     'requests': sum(b['list_requests']), 'errors': sum(b['list_errors']),
                     'errorPercent': pct(sum(b['list_errors']), len(b['list_errors'])),
                     'p95': percentile(latencies, .95), 'p99': percentile(latencies, .99),
                     'max': max(latencies, default=None)})
    # A point is one completed HTTP attempt, plotted at completion time. Older runs lack IDs/outcomes on this metric.
    observations = [p for p in points if p['metric'] == 'list_observation']
    individual = observations or [p for p in points if p['metric'] == 'list_end_to_end_ms']
    samples = [{'second': round(time(p['data']['time'])-beginning, 3), 'ms': p['data']['value'],
                **{k: p['data'].get('tags', {}).get(k) for k in
                   ('request_id', 'page', 'status', 'error_code', 'variant', 'validation_failed')}} for p in individual]
    timeout_count = sum(v for k, v in codes.items() if k == '1050')
    return {'started': started, 'completed': completed, 'completedDuring': completed_during,
            'unfinished': started-completed, 'errorCount': sum(errors),
            'errorPercent': pct(sum(errors), len(errors)), 'timeoutCount': timeout_count,
            'timeoutPercent': pct(timeout_count, completed),
            'httpErrorPercent': pct(sum(values('list_http_errors')), len(values('list_http_errors'))),
            'validationErrorPercent': pct(sum(values('list_validation_errors')), len(values('list_validation_errors'))),
            'statusCounts': dict(statuses), 'errorCodes': dict(codes),
            'offeredRps': round(started/seconds, 2) if seconds else None,
            'actualRps': round(completed_during/seconds, 2) if seconds else None,
            'successRps': round(sum(1 for p in points if p['metric']=='list_errors' and p['data']['value']==0 and time(p['data']['time'])<beginning+seconds)/seconds,2) if seconds else None,
            'p50': percentile(values('list_end_to_end_ms'), .5),
            'p95': percentile(values('list_end_to_end_ms'), .95),
            'p99': percentile(values('list_end_to_end_ms'), .99),
            'max': max(values('list_end_to_end_ms'), default=None),
            'httpP95': percentile(values('list_http_ms'), .95),
            'waitP95': percentile(values('list_waiting_ms'), .95),
            'blockedP95': percentile(values('list_blocked_ms'), .95),
            'tlsP95': percentile(values('list_tls_ms'), .95), 'rows': rows, 'samples': samples}


def host_vmstat(folder):
    path = folder/'db-vmstat.txt'
    if not path.exists():
        return None
    rows = []
    for line in path.read_text().splitlines():
        fields = line.split()
        if len(fields) >= 17 and all(v.isdigit() for v in fields):
            rows.append(list(map(int, fields)))
    # vmstat's first row is the average since boot, not a test sample.
    rows = rows[1:]
    if not rows:
        return None
    return {'cpuMaxPct': max(100-r[14] for r in rows), 'samples': len(rows),
            'iowaitMaxPct': max(r[15] for r in rows), 'source': 'db-vmstat.txt',
            'intervalSeconds': 1, 'hasTimestamps': False}


def resources(folder, beginning, seconds):
    path = folder/'resources.json'
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    series = []
    for stream, records in data.get('series', {}).items():
        for r in records:
            stamp = r.get('time') or r.get('sampleTimestamp') or r.get('timestamp') or r.get('cwTimestamp')
            if stamp is None:
                continue
            epoch = stamp/1000 if isinstance(stamp, (int, float)) else time(stamp)
            series.append({'stream': stream, 'second': round(epoch-beginning, 3), 'values': r})
    return {'series': sorted(series, key=lambda r: r['second']), 'sources': data.get('sources', {}),
            'hostTotals': data.get('hostTotals', {}), 'windowStart': data.get('windowStart'),
            'windowEnd': data.get('windowEnd'), 'http': data.get('http'), 'appCpuWindow': data.get('appCpuWindow')}


def summarize(folder):
    meta = json.loads((folder/'metadata.json').read_text())
    if 'exitCode' not in meta:
        return None
    points = []
    with (folder/'raw.ndjson').open() as handle:
        for line in handle:
            p = json.loads(line)
            if p.get('type') == 'Point':
                points.append(p)
    measured = [p for p in points if p['data'].get('tags', {}).get('phase') == 'measure']
    starts = [p for p in measured if p['metric'] == 'list_started']
    if not starts:
        return None
    beginning = min(time(p['data']['time']) for p in starts)
    dropped = sum(p['data']['value'] for p in points if p['metric'] == 'dropped_iterations'
                  and p['data'].get('tags', {}).get('scenario') == 'measure')
    scheduled = sum(p['data']['value'] for p in starts) + dropped
    full_hold = scheduled >= meta['rps']*meta['holdSeconds']-1
    seconds = min(meta['holdSeconds'], scheduled/meta['rps'])
    stats = statistics(measured, beginning, seconds)
    final_rate = full_hold and stats['unfinished'] == 0 and dropped == 0
    passed = meta['exitCode'] == 0 and final_rate
    report = meta | stats | {
        'status': ('완료 · 오류 없음' if passed else '완료 · 오류 있음') if final_rate else '중단 · 오류율 미확정',
        'seconds': round(seconds, 2), 'measurementStartUTC': dt.datetime.fromtimestamp(beginning, dt.timezone.utc).isoformat(),
        'fullHold': full_hold, 'rateFinal': final_rate, 'passed': passed, 'dropped': dropped,
        'finalErrorPercent': stats['errorPercent'] if final_rate else None,
        'unfinishedPercent': pct(stats['unfinished'], stats['started']),
        'coveragePercent': pct(stats['completed'], stats['started']),
        'latencySloExceeded': (stats['p95'] or 0) >= 1000,
        'variants': {variant: statistics([p for p in measured if p['data'].get('tags', {}).get('variant') == variant],
                                          beginning, seconds) for variant in VARIANTS},
        'resources': resources(folder, beginning, seconds), 'dbVmstat': host_vmstat(folder)}
    if (folder/'recovery.json').exists():
        report['recovery'] = json.loads((folder/'recovery.json').read_text())
    if (folder/'server.json').exists():
        report['server'] = json.loads((folder/'server.json').read_text())
    (folder/'analysis.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='report-next.html', choices=['report.html', 'report-next.html'])
    args = parser.parse_args()
    reports = []
    for folder in sorted((ROOT/'results').iterdir()):
        if folder.is_dir() and (folder/'metadata.json').exists() and (folder/'raw.ndjson').exists():
            r = summarize(folder)
            if r:
                reports.append(r)
    display = [{k:v for k,v in r.items() if k != 'samples'} for r in reports]
    safe = json.dumps(display, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    page = (ROOT/'report-template.html').read_text(encoding='utf-8')
    (ROOT/args.output).write_text(page.replace('__DATA__', safe))
    print(json.dumps([{k:r.get(k) for k in ('id', 'rps', 'actualRps', 'p95', 'p99', 'finalErrorPercent', 'coveragePercent', 'status')}
                      for r in reports], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
