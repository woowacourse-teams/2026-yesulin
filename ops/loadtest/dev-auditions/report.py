"""Build a standalone, offline report from measured RPS runs. Raw files stay local."""
import datetime as dt
import html
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent


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


def summarize(folder):
    meta = json.loads((folder/'metadata.json').read_text())
    if 'exitCode' not in meta:
        return None
    points = []
    for line in (folder/'raw.ndjson').read_text().splitlines():
        p = json.loads(line)
        if p.get('type') == 'Point':
            points.append(p)
    measured = [p for p in points if p['data'].get('tags', {}).get('phase') == 'measure']
    values = lambda metric: [p['data']['value'] for p in measured if p['metric'] == metric]
    starts = [p for p in measured if p['metric'] == 'list_started']
    if not starts:
        return meta | {'status': '측정 없음', 'seconds': 0, 'rows': [], 'completed': 0}
    beginning = min(time(p['data']['time']) for p in starts)
    end = max(time(p['data']['time']) for p in points)
    complete = end-beginning >= meta['holdSeconds']-.3
    passed = meta['exitCode'] == 0 and complete
    seconds = meta['holdSeconds'] if complete else min(meta['holdSeconds'], max(0, end-beginning))
    errors = values('list_errors')
    dropped = sum(p['data']['value'] for p in points if p['metric'] == 'dropped_iterations'
                  and p['data'].get('tags', {}).get('scenario') == 'measure')
    bins = defaultdict(list)
    for p in measured:
        if p['metric'] == 'list_end_to_end_ms':
            bins[int(time(p['data']['time'])-beginning)].append(p['data']['value'])
    rows = [{'second': s, 'requests': len(v), 'p95': percentile(v, .95), 'max': max(v)}
            for s, v in sorted(bins.items())]
    report = meta | {'status': '통과' if passed else '중단/실패', 'seconds': round(seconds, 2),
                     'fullHold': complete, 'started': sum(values('list_started')),
                     'completed': sum(values('list_requests')), 'unfinished': sum(values('list_started'))-sum(values('list_requests')), 'dropped': dropped,
                     'actualRps': round(sum(values('list_requests'))/seconds, 2) if seconds else None,
                     'errorPercent': round(sum(errors)*100/len(errors), 2) if errors else None,
                     'p50': percentile(values('list_end_to_end_ms'), .5),
                     'p95': percentile(values('list_end_to_end_ms'), .95),
                     'p99': percentile(values('list_end_to_end_ms'), .99),
                     'max': max(values('list_end_to_end_ms'), default=None),
                     'httpP95': percentile(values('list_http_ms'), .95),
                     'waitP95': percentile(values('list_waiting_ms'), .95),
                     'tlsP95': percentile(values('list_tls_ms'), .95), 'rows': rows}
    if (folder/'server.json').exists():
        report['server'] = json.loads((folder/'server.json').read_text())
    (folder/'analysis.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    return report


PAGE = (ROOT/'report-template.html').read_text(encoding='utf-8')


def main():
    reports = []
    for folder in sorted((ROOT/'results').iterdir()):
        if folder.is_dir() and (folder/'metadata.json').exists() and (folder/'raw.ndjson').exists():
            r = summarize(folder)
            if r:
                reports.append(r)
    safe = json.dumps(reports, ensure_ascii=False).replace('<', '\\u003c')
    (ROOT/'report.html').write_text(PAGE.replace('__DATA__', safe))
    print(json.dumps([{k:r.get(k) for k in ('id','rps','actualRps','p95','p99','errorPercent','dropped','status')}
                      for r in reports], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
