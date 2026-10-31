import { dashboardDefinitions } from "./dashboards.mjs";
import { introduction, insightLayout } from "./presentation.mjs";

const environment = process.env.POSTHOG_ENVIRONMENT ?? "development";
const definitions = dashboardDefinitions(environment);
if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(definitions, null, 2));
  process.exit(0);
}
const host = process.env.POSTHOG_MANAGEMENT_HOST;
const project = process.env.POSTHOG_PROJECT_ID;
const token = process.env.POSTHOG_PERSONAL_API_KEY;
if (!["https://us.posthog.com", "https://eu.posthog.com"].includes(host) || !/^\d+$/.test(project ?? "") || !token) {
  throw new Error("POSTHOG_MANAGEMENT_HOST, POSTHOG_PROJECT_ID, POSTHOG_PERSONAL_API_KEY가 필요합니다. 비밀 토큰은 환경 변수로만 전달하세요.");
}
if (!process.env.POSTHOG_ENVIRONMENT) throw new Error("실제 적용 시 POSTHOG_ENVIRONMENT를 명시하세요.");
const root = `${host}/api/projects/${project}`;
async function request(path, method = "GET", body) {
  const url = new URL(path, `${root}/`);
  if (url.origin !== host || !url.pathname.startsWith(`/api/projects/${project}/`)) throw new Error("Unexpected API URL");
  const response = await fetch(url, {
    method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(120_000), redirect: "error",
  });
  if (!response.ok) throw new Error(`PostHog ${method} ${url.pathname}: ${response.status} (응답에 비밀값이 포함될 수 있어 본문은 출력하지 않습니다)`);
  return response.json();
}
async function list(path) {
  const all = [];
  let next = path;
  while (next) {
    const page = await request(next);
    all.push(...page.results);
    next = page.next;
  }
  return all;
}

const previousNames = {
  "03 PDF · 실제 활용과 조작 편의": "03 PDF와 심사 시간",
  "① PDF 기능은 어느 단계에서 막히나요?": "PDF를 올린 뒤 어디까지 사용했나요?",
  "② 공연사가 실제로 열어보고 판정을 저장하나요?": "공연사 PDF가 실제 심사로 이어지나요?",
  "참고 · 개별 지원자 화면에 머문 시간": "심사에 총 몇 분을 쓰고 있나요?",
  "검토·보류·최종 판정은 각각 몇 명인가요?": "심사를 몇 명까지 끝냈나요?",
};
const matchesName = (actual, name) => actual === name || actual === previousNames[name];
// 이름과 자체 태그로만 갱신한다. 팀원이 만든 다른 대시보드는 수정·삭제하지 않는다.
const tag = "yesulin-analytics-v1";
const projectInfo = await request("");
console.log(`프로젝트 ${project}: ${environment} 대시보드 설정`);
if (projectInfo.timezone !== "Asia/Seoul" || projectInfo.week_start_day !== 1) {
  await request("", "PATCH", { timezone: "Asia/Seoul", week_start_day: 1 });
}
const dashboards = await list("dashboards/?limit=100");
const insights = await list("insights/?limit=100");
for (const definition of definitions) {
  let dashboard = dashboards.find(d => matchesName(d.name, definition.name) && d.tags?.includes(tag) && !d.deleted);
  const creating = !dashboard;
  const primary = environment === "production" && definition === definitions[0];
  const body = { name: definition.name, description: definition.description, tags: [tag, environment], pinned: primary };
  dashboard = dashboard
    ? await request(`dashboards/${dashboard.id}/`, "PATCH", body)
    : await request("dashboards/", "POST", body);
  if (creating) await request(`dashboards/${dashboard.id}/create_text_tile/`, "POST", {
    body: introduction(definition), layouts: { sm: { x: 0, y: 0, w: 12, h: 3 } },
  });
  let order = 0;
  for (const insight of definition.insights) {
    // 실제 PostHog 쿼리 엔진 검증에 실패하면 해당 차트를 게시하지 않는다.
    const query = insight.query.source ?? insight.query;
    const checked = await request("query/", "POST", { query });
    if (checked.error || checked.query_status?.error) throw new Error(`쿼리 검증 실패: ${insight.name}`);
    const existing = insights.find(i => matchesName(i.name, insight.name) && i.tags?.includes(tag) &&
      (i.dashboards?.includes(dashboard.id) || i.dashboard_tiles?.some(t => t.dashboard_id === dashboard.id && !t.deleted)) && !i.deleted);
    const data = { ...insight, dashboards: [dashboard.id], tags: [tag], order: order++, saved: true };
    if (existing) await request(`insights/${existing.id}/`, "PATCH", data);
    else await request("insights/", "POST", data);
  }
  const saved = await request(`dashboards/${dashboard.id}/`);
  const tiles = definition.insights.map((insight, index) => {
    const tile = saved.tiles.find(t => t.insight?.name === insight.name);
    if (!tile) throw new Error(`저장된 차트를 찾을 수 없습니다: ${insight.name}`);
    return { id: tile.id, layouts: { sm: insightLayout(index, definition.insights.length) }, show_description: true };
  });
  await request(`dashboards/${dashboard.id}/`, "PATCH", { tiles });
  console.log(`${definition.name}: ${host}/project/${project}/dashboard/${dashboard.id}`);
  if (primary) await request("", "PATCH", { primary_dashboard: dashboard.id, home_tab_dashboard: dashboard.id });
}
