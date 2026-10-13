import http from 'k6/http';
import exec from 'k6/execution';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const base = 'https://dev-api.yesulin.art';
const fixture = JSON.parse(open(__ENV.FIXTURE_FILE || './fixture.json'));
const rps = Number(__ENV.RPS || 5);
const hold = Number(__ENV.HOLD_SECONDS || 60);
const warm = 30;
const gap = 5;
// Allocate before timing starts; dynamic allocation during a stall can lose arrivals.
const slots = Math.min(500, Math.max(20, rps * 10 + 10));
const runId = __ENV.RUN_ID;
if (!Number.isInteger(rps) || rps < 1 || rps > 100 || hold !== 60
    || !runId || !/^[A-Za-z0-9._-]{1,30}$/.test(runId)) {
  throw new Error('Use RPS=1..100, HOLD_SECONDS=60 and a 1..30 character safe RUN_ID');
}
const wall = new Trend('list_end_to_end_ms', true);
const duration = new Trend('list_http_ms', true);
const waiting = new Trend('list_waiting_ms', true);
const blocked = new Trend('list_blocked_ms', true);
const tls = new Trend('list_tls_ms', true);
const failures = new Rate('list_errors');
const started = new Counter('list_started');
const requests = new Counter('list_requests');

export const options = {
  scenarios: {
    warmup: {
      executor: 'constant-arrival-rate', rate: 1, timeUnit: '1s', duration: `${warm}s`,
      preAllocatedVUs: 2, maxVUs: 12, gracefulStop: '5s',
    },
    measure: {
      executor: 'constant-arrival-rate', rate: rps, timeUnit: '1s', duration: `${hold}s`,
      startTime: `${warm + gap}s`, preAllocatedVUs: slots,
      maxVUs: slots, gracefulStop: '5s',
    },
  },
  thresholds: {
    'list_end_to_end_ms{phase:measure}': [{threshold: 'p(95)<1000', abortOnFail: true,
      delayAbortEval: `${warm + gap + 30}s`}],
    'list_errors{phase:measure}': [{threshold: 'rate<0.01', abortOnFail: true,
      delayAbortEval: `${warm + gap + 30}s`}],
    'checks{phase:measure}': ['rate>0.99'],
    'dropped_iterations{scenario:measure}': [{threshold: 'count==0', abortOnFail: true,
      delayAbortEval: `${warm + gap + 30}s`}],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(95)', 'p(99)'],
  userAgent: 'yesulin-dev-loadtest-k6',
};

export default function () {
  const n = exec.scenario.iterationInTest;
  const selector = n % 10;
  const variant = selector < 7 ? 'first' : selector < 9 ? 'paged' : 'all';
  const page = variant === 'paged' ? 1 + Math.floor(n / 10) % 4 : 0;
  const query = variant === 'all' ? '&includeClosed=true' : '';
  const phase = exec.scenario.name === 'warmup' ? 'warmup' : 'measure';
  const tags = {phase, variant, name: 'GET public audition list'};
  const requestId = `lt-${runId}-${phase}-${exec.vu.idInTest}-${n}`;
  started.add(1, tags);
  const start = Date.now();
  const response = http.get(`${base}/api/v1/public/audition-posts?page=${page}&size=12${query}`, {
    tags, timeout: '10s', redirects: 0, headers: {'X-Request-Id': requestId},
  });
  wall.add(Date.now() - start, tags);
  duration.add(response.timings.duration, tags);
  waiting.add(response.timings.waiting, tags);
  blocked.add(response.timings.blocked, tags);
  tls.add(response.timings.tls_handshaking, tags);
  requests.add(1, tags);
  const valid = check(response, {
    'HTTP 200': r => r.status === 200,
    'page and counts correct': r => {
      if (r.status !== 200) return false;
      try {
        const d = r.json();
        return d.posts.length === 12 && d.page === page && d.size === 12
          && d.openCount === fixture.open && d.allCount === fixture.all
          && d.totalElements === (variant === 'all' ? fixture.all : fixture.open);
      } catch { return false; }
    },
    'request ID returned': r => r.headers['X-Request-Id'] === requestId,
  }, tags);
  failures.add(!valid, tags);
}
