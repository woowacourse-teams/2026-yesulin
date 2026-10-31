/** 선언형 대시보드. 계정·토큰 없이도 --dry-run으로 구성과 쿼리를 검토할 수 있다. */
export function dashboardDefinitions(environment = "production") {
  if (!["production", "development"].includes(environment)) throw new Error("Invalid environment");
  const properties = [
    { key: "environment", value: environment, operator: "exact", type: "event" },
    { key: "internal", value: false, operator: "exact", type: "event" },
    { key: "test_object", value: false, operator: "exact", type: "event" },
  ];
  const base = `properties.environment = '${environment}' AND properties.internal = false AND properties.test_object = false`;
  const week = "toStartOfWeek(toTimeZone(timestamp, 'Asia/Seoul'), 1)";
  const nowWeek = "toStartOfWeek(toTimeZone(now(), 'Asia/Seoul'), 1)";
  const trend = (name, event, description, extra = [], math = "dau") => ({ name, description, query: {
    kind: "TrendsQuery", series: [{ kind: "EventsNode", event, name, math, properties: extra }],
    properties, interval: "week", dateRange: { date_from: "-12w" }, trendsFilter: { display: "ActionsLineGraph" },
  } });
  const table = (name, sql, description, dateFrom = "-28d") => ({ name, description, query: {
    kind: "DataVisualizationNode", source: { kind: "HogQLQuery", query: sql, filters: { dateRange: { date_from: dateFrom } } }, display: "ActionsTable",
  } });
  const eventFilter = (key, value) => ({ key, value, type: "event", operator: "exact" });
  const descriptions = "운영 성과는 내부 사용자·테스트 자료 제외. 한국 시간·월~일 기준. 비로그인은 브라우저 기준이며 분석 거부·차단 이용자는 빠집니다. 빈 차트는 ‘측정 전 또는 해당 기간 기록 없음’이고, 실제 사용자가 0명이라는 증거는 아닙니다.";
  const dashboards = [
    {
      name: `${environment === "production" ? "01 예술in 한눈에 보기" : "개발 테스트 — 성과 보고용 아님 · 핵심"}`,
      description: descriptions + " 핵심 지표 = 주간 공고 상세 조회 사용자 수. 이번 주 수치는 진행 중이므로 지난 온전한 주와 단순 비교하지 마세요.",
      insights: [
        { name: "이번 주 공고를 본 사람은 몇 명인가요?",
          description: "한국 시간 월~일, 공고 상세를 본 고유 사용자 수. 운영만 포함하며 내부·테스트 기록은 제외합니다. 조회 횟수가 아닌 사람 수입니다. 수집된 첫 주부터 마지막 주까지 표시하며 이번 주는 진행 중입니다. 2026-10-29 수집 시작.",
          // 익명 사용자 상세 창의 누락 인원 중복 합산을 피하고 동일한 WAU를 집계 그래프로 표시한다.
          query: {
            kind: "DataVisualizationNode",
            source: { kind: "HogQLQuery", filters: { dateRange: { date_from: "-12w" } }, query: `SELECT
  ${week} AS \`주 시작일\`,
  uniqExact(person_id) AS \`공고 조회자\`
FROM events
WHERE event = 'audition_post_viewed'
  AND ${base}
  AND {filters}
GROUP BY \`주 시작일\`
ORDER BY \`주 시작일\` WITH FILL STEP INTERVAL 1 WEEK` },
            display: "ActionsLineGraph",
            chartSettings: {
              xAxis: { column: "주 시작일" },
              yAxis: [{ column: "공고 조회자", settings: { formatting: { style: "number", decimalPlaces: 0, suffix: "명" } } }],
              showLegend: false, showValuesOnSeries: true, leftYAxisSettings: { startAtZero: true },
            },
          },
        },
        table("공고를 봤던 사람들이 1주·4주 뒤 다시 오나요?", `WITH activity AS (
          SELECT DISTINCT person_id, ${week} AS week FROM events WHERE event = 'audition_post_viewed' AND ${base}
        ), cohorts AS (
          SELECT a.week, a.person_id,
            max(if(b.week = a.week + INTERVAL 1 WEEK, 1, 0)) AS w1,
            max(if(b.week = a.week + INTERVAL 4 WEEK, 1, 0)) AS w4
          FROM activity a LEFT JOIN activity b ON a.person_id = b.person_id
          GROUP BY a.week, a.person_id
        ) SELECT week AS \`기준 주\`, count() AS \`기준 인원\`,
          if(week + INTERVAL 2 WEEK <= ${nowWeek}, sum(w1), NULL) AS \`1주 뒤 인원\`,
          if(week + INTERVAL 5 WEEK <= ${nowWeek}, sum(w4), NULL) AS \`4주 뒤 인원\`,
          if(week + INTERVAL 5 WEEK <= ${nowWeek}, round(100.0 * sum(w4) / count(), 1), NULL) AS \`W4 비율 퍼센트\`
          FROM cohorts GROUP BY week HAVING {filters(week AS timestamp)} ORDER BY week DESC LIMIT 26`,
          "기준 주의 전체 활성 사용자 중 정확히 1주·4주 뒤 해당 주에도 공고를 조회한 사람. 해당 주가 끝나지 않으면 빈칸=관측 중. 첫 방문자만의 리텐션과 구분합니다.", "-26w"),
        trend("양식을 내려받으려는 사람은 몇 명인가요?", "attachment_download_clicked", "지원 양식으로 확인된 첨부의 다운로드 클릭 사용자 수. 파일 저장 완료나 실제 지원 완료를 뜻하지 않습니다.", [eventFilter("attachment_kind", "application_form")]),
        table("공고를 본 뒤 7일 안에 양식을 누르나요?", `WITH views AS (
          SELECT person_id, properties.post_id AS post_id, min(timestamp) AS viewed
          FROM events WHERE event = 'audition_post_viewed' AND properties.has_application_form = true AND ${base}
          GROUP BY person_id, post_id HAVING {filters(viewed AS timestamp)} AND viewed < now() - INTERVAL 7 DAY
        ), downloads AS (
          SELECT person_id, properties.post_id AS post_id, timestamp FROM events
          WHERE event = 'attachment_download_clicked' AND properties.attachment_kind = 'application_form' AND ${base}
        ), matched AS (
          SELECT v.person_id, v.post_id, max(if(d.timestamp >= v.viewed AND d.timestamp <= v.viewed + INTERVAL 7 DAY, 1, 0)) AS converted
          FROM views v LEFT JOIN downloads d ON v.person_id = d.person_id AND v.post_id = d.post_id
          GROUP BY v.person_id, v.post_id
        ) SELECT uniq(person_id) AS \`공고 조회자\`, uniqIf(person_id, converted = 1) AS \`양식 클릭자\`,
          round(100.0 * uniqIf(person_id, converted = 1) / nullIf(uniq(person_id), 0), 1) AS \`전환율 퍼센트\` FROM matched`,
          "지원 양식이 확인된 공고만 포함. 같은 사용자·같은 공고를 연결합니다. 최초 관측 조회 후 7일이 지난 대상만 비교하며, 최근 7일 방문자는 아직 관측 중입니다. 분모가 없으면 빈칸입니다.", "-35d"),
        table("공고를 본 사람들은 어디서 들어오나요?", `WITH first_views AS (
          SELECT person_id,
            argMin(if(properties.attribution_version = 1, toString(properties.acquisition_channel), 'unmeasured'), timestamp) AS channel
          FROM events WHERE event = 'audition_post_viewed' AND ${base} AND {filters}
          GROUP BY person_id
        ), counts AS (
          SELECT multiIf(channel = 'openchat', '오픈채팅', channel = 'naver', '네이버',
            channel = 'google', '구글', channel = 'instagram', '인스타그램',
            channel = 'other_external', '기타 외부 사이트', channel = 'other_tagged', '기타 표시 링크',
            channel = 'direct_unknown', '직접 방문·출처 불명', '측정 시작 전') AS channel_name,
            count() AS people FROM first_views GROUP BY channel_name
        ) SELECT channel_name AS \`유입 경로\`, people AS \`공고 조회자\`,
          round(100.0 * people / sum(people) OVER (), 1) AS \`비중 퍼센트\`
          FROM counts ORDER BY people DESC, channel_name`,
          "선택 기간에 각 사람이 처음 본 공고의 방문 출처로 한 번만 분류합니다. 합계는 해당 기간 공고 조회자(주별 수의 합 아님). 새 측정은 2026-10-30 배포 후부터이며 이전 기록은 ‘측정 시작 전’. 표시 링크 우선, 없으면 이전 사이트로 분류합니다. 네이버·구글은 검색뿐 아니라 해당 서비스 유입도 포함. 직접 방문·출처 불명에는 표시 없는 카톡 링크도 포함됩니다. 기존 오픈채팅 차트는 기간 중 한 번이라도 알림 링크로 온 사람이라 수치가 다를 수 있습니다.", "-12w"),
        trend("오픈채팅 알림으로 얼마나 들어오나요?", "openchat_landed", "src=kakao_openchat 또는 utm_source=kakao_openchat으로 표시된 링크 유입. 방 인원 대비 비율은 메시지 열람자 기준 클릭률이 아닙니다."),
        table("어떤 공고 알림을 많이 열어 보나요?", `SELECT properties.post_id AS \`공고 번호\`, uniq(person_id) AS \`유입 사용자\` FROM events WHERE event = 'openchat_landed' AND ${base} AND {filters} GROUP BY properties.post_id ORDER BY \`유입 사용자\` DESC`, "선택 기간, 공고별 중복 제거. 공고 번호는 사이트 상세 주소 /posts/번호와 대응합니다. 공고 제목·본문은 분석에 보내지 않습니다."),
        table("알림을 보고 다른 공고도 살펴보나요?", `WITH visits AS (
          SELECT person_id, properties.$session_id AS session_id,
            max(if(event = 'openchat_landed', 1, 0)) AS landed,
            max(if(event = 'another_post_viewed', 1, 0)) AS explored
          FROM events WHERE event IN ('openchat_landed', 'another_post_viewed') AND ${base} AND {filters}
          GROUP BY person_id, session_id
        ) SELECT uniqIf(person_id, landed = 1) AS \`알림 유입자\`, uniqIf(person_id, landed = 1 AND explored = 1) AS \`다른 공고 탐색자\`,
          round(100.0 * uniqIf(person_id, landed = 1 AND explored = 1) / nullIf(uniqIf(person_id, landed = 1), 0), 1) AS \`탐색률 퍼센트\` FROM visits`,
          "선택 기간 알림 유입 중 동일 방문에서 다른 공고를 연 사람의 비율. 새로고침은 다른 공고 탐색으로 세지 않습니다."),
      ],
    },
    {
      name: "02 예매와 공연사 업무", description: descriptions + " 예매 행동 통계와 DB 확정 좌석은 다릅니다. 현재 행동 기록만으로 전체 확정 좌석·취소율을 계산하지 않습니다.",
      insights: [
        { name: "예매는 어느 단계에서 멈추나요?", description: "예매 가능한 내부 예매 공연만 포함. 같은 사용자·공연 조합의 1일 이내 상세 조회→예매 시작→저장 성공. 한 사람이 여러 공연을 예매하면 여러 조합으로 셉니다. 외부 예매 이동은 별도입니다.", query: {
          kind: "FunnelsQuery", properties, dateRange: { date_from: "-28d" },
          series: [
            { kind: "EventsNode", event: "show_viewed", properties: [eventFilter("eligible", true)] },
            { kind: "EventsNode", event: "booking_started" }, { kind: "EventsNode", event: "booking_succeeded" },
          ], funnelsFilter: { funnelWindowInterval: 1, funnelWindowIntervalUnit: "day", funnelOrderType: "ordered", funnelVizType: "steps", funnelStepReference: "total", funnelAggregateByHogQL: "concat(toString(person_id), ':', properties.show_id)" },
          aggregation_group_type_index: null,
          filterTestAccounts: false,
          // property별 연결이 가능한 SQL 검증 표를 함께 제공한다.
        } },
        table("같은 공연에서 예매를 완료했나요?", `WITH starts AS (SELECT person_id, properties.show_id AS show_id, min(timestamp) AS started FROM events WHERE event='booking_started' AND ${base} AND {filters} GROUP BY person_id, show_id), done AS (SELECT person_id, properties.show_id AS show_id, timestamp FROM events WHERE event='booking_succeeded' AND ${base}) SELECT uniq(s.person_id) AS \`예매 시작자\`, uniqIf(s.person_id, d.timestamp >= s.started AND d.timestamp <= s.started + INTERVAL 1 DAY) AS \`동일 공연 예매 완료자\` FROM starts s LEFT JOIN done d ON s.person_id=d.person_id AND s.show_id=d.show_id`, "서로 다른 공연을 본 행동이 한 전환으로 연결되지 않도록 공연별로 확인합니다. 최근 1일 시작자는 아직 전환 가능 시간이 남아 있습니다."),
        trend("예매 실패가 늘었나요?", "booking_failed", "예매 요청 실패 횟수. 입력 검증에서 막혀 요청하지 않은 경우는 제외합니다.", [], "total"),
        table("최근 확인한 공연별 확정 좌석은 몇 석인가요?", `SELECT properties.show_id AS \`공연 번호\`, argMax(toFloat(properties.capacity),timestamp) AS \`전체 좌석\`, argMax(toFloat(properties.reserved_tickets),timestamp) AS \`확정 좌석\`, max(timestamp) AS \`마지막 확인\` FROM events WHERE event='show_inventory_observed' AND ${base} AND {filters} GROUP BY properties.show_id`, "공연사가 관리 화면에서 조회한 서버 현황의 마지막 관측값입니다. 모든 공연을 자동 동기화한 실시간 전체 수치는 아닙니다. 분석 거부·내부 계정의 조회는 포함되지 않습니다."),
        table("최근 확인한 회차별 예매 취소율은 얼마인가요?", `SELECT properties.show_id AS \`공연 번호\`, properties.session_id AS \`회차 번호\`, argMax(toFloat(properties.reservation_count),timestamp) AS \`전체 예매 건\`, argMax(toFloat(properties.cancelled_count),timestamp) AS \`취소 건\`, round(100.0 * argMax(toFloat(properties.cancelled_count),timestamp)/nullIf(argMax(toFloat(properties.reservation_count),timestamp),0),1) AS \`취소율 퍼센트\`, max(timestamp) AS \`마지막 확인\` FROM events WHERE event='booking_inventory_observed' AND ${base} AND {filters} GROUP BY properties.show_id, properties.session_id`, "회차 예매자 목록을 조회한 시점의 서버 현황. 좌석 수가 아닌 예매 건수 기준이며, 마지막 확인 이후 변경은 다음 조회 때 반영됩니다."),
        trend("공고를 실제로 게시한 공연사는 몇 곳인가요?", "producer_post_published", "게시 API 성공 기준. 로그인 계정별 고유 수이며 한 회사가 여러 계정을 쓰면 여러 곳으로 보일 수 있습니다."),
        trend("공연을 공개한 공연사는 몇 곳인가요?", "producer_show_published", "공연 공개 API 성공 기준. 가입·로그인만 한 계정은 제외합니다."),
        table("다음 프로젝트에서도 다시 사용하나요?", `WITH per_account AS (
          SELECT person_id, uniqIf(properties.post_id, event='producer_post_published') AS posts,
            uniqIf(properties.show_id, event='producer_show_published') AS shows,
            uniqIf(properties.review_id, event='review_saved') AS reviews
          FROM events WHERE event IN ('producer_post_published','producer_show_published','review_saved') AND ${base} AND {filters} GROUP BY person_id
        ) SELECT '공고 게시' AS \`업무\`, countIf(posts > 0) AS \`이용 계정\`, countIf(posts >= 2) AS \`두 번째 이상 이용 계정\`, round(100.0*countIf(posts>=2)/nullIf(countIf(posts>0),0),1) AS \`재사용 비율 퍼센트\` FROM per_account
        UNION ALL SELECT '공연 공개', countIf(shows>0), countIf(shows>=2), round(100.0*countIf(shows>=2)/nullIf(countIf(shows>0),0),1) FROM per_account
        UNION ALL SELECT '심사 저장', countIf(reviews>0), countIf(reviews>=2), round(100.0*countIf(reviews>=2)/nullIf(countIf(reviews>0),0),1) FROM per_account`,
          "선택 기간에 서로 다른 공고·공연·심사에서 두 번 이상 업무를 수행한 계정의 비율입니다. 같은 프로젝트의 반복 저장은 재사용으로 늘리지 않습니다. 업무별 분모가 다르며 회사 수와 계정 수는 다를 수 있습니다."),
      ],
    },
    {
      name: "03 PDF · 실제 활용과 조작 편의", description: descriptions + " ① 기능 막힘 ② 실제 심사 활용 ③ 기본 조작 부담 순서로 봅니다. 시간은 참고용입니다. 새 지표는 배포 후 수집하며 브라우저 관측 결과입니다. PDF 원문·이름·연락처·심사 메모는 수집하지 않습니다.",
      insights: [
        table("① PDF 기능은 어느 단계에서 막히나요?", `SELECT if(properties.workflow='actor_pdf', '배우 PDF', '공연사 PDF') AS \`기능\`, multiIf(properties.step='upload','업로드',properties.step='extract','추출',properties.step='apply','결과 적용','프로필 저장') AS \`단계\`, multiIf(properties.outcome='failure','실패',properties.step='extract' AND properties.extraction_status='PARTIAL','일부 추출','성공') AS \`결과\`, uniq(person_id) AS \`사용자 수\`, uniq(properties.operation_id) AS \`관측된 PDF 작업 수\` FROM events WHERE event IN ('pdf_step_completed','pdf_step_failed') AND (properties.workflow='actor_pdf' OR properties.step='upload') AND ${base} AND {filters} GROUP BY \`기능\`, \`단계\`, \`결과\``, "현재 이용 공연사부터 기능의 막힘을 확인합니다. 배우는 업로드→추출→적용→저장, 공연사는 업로드 결과입니다. 단계별 건수이며 순차 전환율은 아닙니다. 공연사 추출·AI 정리는 별도 단계 표에서 확인하세요. 브라우저에서 관측한 작업만 포함하며 전체 서버 처리 성공률은 아닙니다. 실패 전 작업 ID가 없으면 작업 수에 빠질 수 있습니다."),
        table("② 공연사가 실제로 열어보고 판정을 저장하나요?", `SELECT properties.review_id AS \`심사 번호\`, uniqIf(properties.operation_id, event='pdf_step_completed' AND properties.step='upload') AS \`업로드 PDF 수\`, uniqIf(properties.item_id, event='review_item_viewed') AS \`열람 지원자 수\`, uniqIf(properties.item_id, event='review_saved' AND properties.eligible=true) AS \`결과 저장 지원자 수\` FROM events WHERE properties.workflow='producer_pdf' AND event IN ('pdf_step_completed','review_item_viewed','review_saved') AND ${base} AND {filters} GROUP BY properties.review_id`, "현재 이용 공연사의 실제 업무 활용을 확인합니다. 선택 기간 내 심사별 업로드·개별 열람·저장 인원이며 순차 전환율이 아닙니다. 보류 포함, 재저장은 한 명으로 셉니다. 기간 전 업로드는 빠질 수 있습니다. 현재 판정은 현황 표를 보세요."),
        table("③ 기본 심사 작업에 버튼을 몇 번 누르나요?", `SELECT properties.review_id AS \`심사 번호\`, multiIf(properties.review_view='single','한 명씩',properties.review_view='card','카드에서 진입','표에서 진입') AS \`작업 방식\`, uniq(properties.item_id) AS \`조작 대상 지원자 수\`, countIf(properties.input_method='button') AS \`버튼 조작 수\`, countIf(properties.input_method='shortcut') AS \`단축키 수\`, round(1.0*countIf(properties.input_method='button')/nullIf(uniq(properties.item_id),0),1) AS \`지원자 1명당 평균\` FROM events WHERE event='review_basic_action' AND properties.metric_version=1 AND ${base} AND {filters} GROUP BY properties.review_id, properties.review_view`, "클릭·터치·버튼 키보드 활성화를 셉니다. 상세 열기·판정 저장·이전/다음 이동만 포함. 단축키 별도. 자동 표시·이동·사진·영상·PDF·메모는 제외. 분모는 조작 대상 고유 지원자(미완료 포함), 완료자 기준이 아닙니다. 재시도·재검토·취소한 이동 시도도 포함. 같은 작업 방식끼리 저장 실패와 함께 비교하세요."),
        table("버튼 조작은 어떤 작업에 쓰이나요?", `SELECT multiIf(properties.review_action='open','상세 열기',properties.review_action='decision_save','판정 선택·저장',properties.review_action='next','다음 지원자','이전 지원자') AS \`작업\`, countIf(properties.input_method='button') AS \`버튼 조작 수\`, countIf(properties.input_method='shortcut') AS \`단축키 수\` FROM events WHERE event='review_basic_action' AND properties.metric_version=1 AND ${base} AND {filters} GROUP BY properties.review_action`, "판정 선택과 저장은 하나의 버튼이므로 1회로 셉니다. 저장 실패도 조작 시도에는 포함되며 성공 여부는 저장 요청 표에서 확인합니다. 조작 수가 적다는 이유만으로 심사 품질이 높거나 시간이 단축됐다고 해석하지 마세요."),
        table("참고 · 개별 지원자 화면에 머문 시간", `SELECT properties.workflow AS \`심사 종류\`, properties.review_id AS \`심사 번호\`, uniq(properties.item_id) AS \`관측 지원자 수\`, round(sum(toFloat(properties.active_ms))/60000,1) AS \`합산 작업 시간(분)\`, round(sum(toFloat(properties.active_ms))/1000/nullIf(uniq(properties.item_id),0),1) AS \`지원자당 평균(초)\` FROM events WHERE event='review_active_time' AND ${base} AND {filters} GROUP BY properties.workflow, properties.review_id`, "개별 지원자 화면만 측정합니다. 카드·표 비교 시간은 제외하고 화면 내 로딩 대기는 포함될 수 있습니다. 전체 업무 시간·단축 성과가 아닙니다. 다른 탭·포커스 이탈·2분 이상 무조작 제외. 재열람 시간은 누적합니다. 여러 심사위원의 시간은 인시 합계이며 경과 시간이 아닙니다. 판정을 고민한 시간도 섞이므로 길다고 불편하거나 짧다고 개선된 것은 아닙니다."),
        table("검토·보류·최종 판정은 각각 몇 명인가요?", `SELECT properties.review_id AS \`심사 번호\`, argMax(toFloat(properties.total_count),timestamp) AS \`전체 지원자\`, argMax(toFloat(properties.completed_count),timestamp) AS \`판정 저장(보류 포함)\`, argMax(toFloat(properties.held_count),timestamp) AS \`보류\`, argMax(toFloat(properties.final_count),timestamp) AS \`최종 판정(합격·불합격)\`, argMax(toFloat(properties.pending_count),timestamp) AS \`미검토\`, max(timestamp) AS \`마지막 갱신\` FROM events WHERE event='review_progress_v2' AND properties.metric_version=2 AND ${base} AND {filters} GROUP BY properties.review_id`, "v2 이후 상세 조회·판정/메모 저장 성공 시 관측한 최신 상태입니다. 판정 저장=보류+최종 판정이며 서로 더하지 마세요. 사용자 성과는 팀원·테스트 제외."),
        table("추출과 AI 정보 정리는 각각 끝났나요?", `SELECT if(properties.processing_stage='extract','내용 추출','AI 정보 정리') AS \`단계\`, multiIf(properties.extraction_status='COMPLETED','완료',properties.extraction_status='PARTIAL','일부 추출',properties.extraction_status='FAILED','실패',properties.extraction_status='SKIPPED','미실행','업로드 만료') AS \`상태\`, uniq(properties.operation_id) AS \`관측 PDF 수\` FROM events WHERE event='pdf_processing_observed' AND properties.metric_version=2 AND ${base} AND {filters} GROUP BY properties.processing_stage, properties.extraction_status`, "브라우저에서 관측한 결과. COMPLETED=완료, PARTIAL=일부 추출, FAILED=실패, SKIPPED=미실행, UPLOAD_EXPIRED=업로드 만료. AI 완료가 정보 정확도를 뜻하지 않습니다. 창을 닫고 결과를 다시 열지 않은 작업은 빠질 수 있습니다."),
        table("판정·메모 저장 요청은 정상 처리되나요?", `SELECT if(properties.save_kind='memo','메모','판정') AS \`저장 종류\`, uniqIf(properties.operation_id,event='review_save_attempted') AS \`시도\`, uniqIf(properties.operation_id,event='review_save_result' AND properties.outcome='success') AS \`성공\`, uniqIf(properties.operation_id,event='review_save_result' AND properties.outcome='failure') AS \`실패\`, round(100.0*uniqIf(properties.operation_id,event='review_save_result' AND properties.outcome='failure')/nullIf(uniqIf(properties.operation_id,event='review_save_result'),0),1) AS \`결과 확인 요청 중 실패율 퍼센트\`, round(quantile(0.95)(if(event='review_save_result',toFloat(properties.duration_ms),NULL)),0) AS \`응답 p95 밀리초\` FROM events WHERE event IN ('review_save_attempted','review_save_result') AND properties.metric_version=2 AND ${base} AND {filters} GROUP BY properties.save_kind`, "시도마다 고유 번호로 연결합니다. 실패율 분모는 결과가 확인된 요청이며 미수신·기간 경계로 시도와 결과 수가 다를 수 있습니다. 개인정보·메모·합불 내용은 보내지 않습니다."),
        table("저장 실패는 어떤 종류인가요?", `SELECT properties.error_code AS \`오류 분류\`, uniq(properties.operation_id) AS \`실패 요청\` FROM events WHERE event='review_save_result' AND properties.outcome='failure' AND ${base} AND {filters} GROUP BY properties.error_code`, "network=네트워크, server=서버, unauthorized=로그인 만료, forbidden=권한, not_found=대상 없음, invalid_input=요청 검증, unknown=미분류. 기술 원인은 Sentry·서버 로그로 확인합니다."),

      ],
    },
    {
      name: "04 측정 점검 — 성과 보고용 아님", description: "팀원·테스트 기록과 미분류 첨부를 확인하는 개발·운영 점검 화면입니다. 이 화면의 수치는 성과 보고에 사용하지 마세요.",
      insights: [
        table("팀원·테스트 표시가 들어오나요?", `SELECT event AS \`행동\`, properties.internal AS \`내부 사용자\`, properties.test_object AS \`테스트 자료\`, count() AS \`기록 수\` FROM events WHERE properties.environment='${environment}' AND {filters} GROUP BY event, properties.internal, properties.test_object ORDER BY \`기록 수\` DESC`, "테스트 후 internal=true인지 확인하세요. 새 기기와 시크릿 모드는 내부 브라우저 표시가 필요합니다."),
        table("어떤 첨부를 지원 양식으로 분류해야 하나요?", `SELECT properties.post_id AS \`공고 번호\`, properties.attachment_index AS \`첨부 순번(0부터)\`, count() AS \`클릭 횟수\` FROM events WHERE event='attachment_download_clicked' AND properties.attachment_kind='unknown' AND properties.environment='${environment}' AND {filters} GROUP BY properties.post_id, properties.attachment_index`, "지원 양식과 대본·참고 자료를 파일 확장자로 추측하지 않습니다. POSTHOG_FORM_ATTACHMENTS에 검증된 공고·첨부 순번을 등록해야 양식 전환율에 포함됩니다. 과거 조회의 분류는 자동 수정되지 않습니다."),
      ],
    },
  ];
  dashboards[0].insights.splice(2, 0, {
    name: "시간이 지나도 공고를 다시 보러 오나요?",
    description: "기준 주에 공고를 본 사람의 0~4주 뒤 재방문 비율입니다. 선마다 기준 주가 다르며, 관측이 끝난 주만 표시합니다. 매주 비율은 오르내릴 수 있습니다.",
    query: {
      kind: "DataVisualizationNode", display: "ActionsLineGraph",
      source: { kind: "HogQLQuery", filters: { dateRange: { date_from: "-26w" } }, query: `WITH activity AS (
        SELECT DISTINCT person_id, ${week} AS week FROM events WHERE event='audition_post_viewed' AND ${base}
      ), cohorts AS (
        SELECT a.week AS week, ages.age AS age, a.person_id AS person_id,
          max(if(b.week = a.week + toIntervalWeek(ages.age), 1, 0)) AS returned
        FROM activity a CROSS JOIN (SELECT arrayJoin([0,1,2,3,4]) AS age) ages
        LEFT JOIN activity b ON a.person_id=b.person_id GROUP BY a.week, ages.age, a.person_id
      ) SELECT age AS \`지난 주 수\`, toString(week) AS \`기준 주\`, sum(returned)/count() AS \`재방문 비율\`
      FROM cohorts WHERE week + toIntervalWeek(age + 1) <= ${nowWeek} AND {filters(week AS timestamp)}
      GROUP BY week, age ORDER BY week, age` },
      chartSettings: { xAxis: { column: "지난 주 수" }, yAxis: [{ column: "재방문 비율", settings: { formatting: { style: "percent", decimalPlaces: 1 } } }], seriesBreakdownColumn: "기준 주", showLegend: true, showNullsAsZero: false },
    },
  });
  if (environment === "development") {
    return [{ ...dashboards[3], name: "개발 전용 · 측정 점검", description: "개발 사이트와 로컬 테스트 기록만 확인합니다. 운영 성과에 합산하지 않습니다.",
      insights: dashboards[3].insights.map(insight => ({ ...insight, name: `개발 · ${insight.name}` })) }];
  }
  return dashboards;
}
