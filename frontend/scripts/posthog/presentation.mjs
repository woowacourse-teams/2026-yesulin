export function introduction(definition) {
  if (definition.name.startsWith("01 ")) return "## 먼저 이 숫자부터 보세요\n**주간 공고 조회자(WAU)**가 핵심 지표입니다. 같은 사람은 한 주에 한 명으로 셉니다.\n운영 기록만 포함 · 팀원/테스트 제외 · 한국 시간 월~일\n\n빈 차트는 측정 전 또는 기록 없음입니다. W4는 4주 뒤 해당 주까지 관측한 후 확인합니다.";
  if (definition.name.startsWith("02 ")) return "## 예매와 공연사의 실제 업무\n위에서부터 예매 단계 → 실패 → 좌석·취소 현황 → 게시·재사용을 확인하세요.\n\n좌석과 취소는 **관리 화면을 마지막으로 확인한 시점**의 값입니다. 실시간 전체 DB 합계가 아닙니다. 운영 기록만 포함하며 팀원·테스트를 제외합니다.";
  if (definition.name.startsWith("03 ")) return "## PDF를 쓰고, 실제로 심사했나요?\nPDF 업로드 → 결과 활용 → 심사 저장 → 소요 시간 순으로 확인하세요. 미출시 기능의 빈 차트는 성과 0을 뜻하지 않습니다.\n\n**200명 환산은 추정치**입니다. 다른 탭·2분 이상 무조작을 제외한 작업 시간이며, 여러 심사위원의 시간을 합산합니다.";
  return "## 성과 보고에 사용하지 않는 점검 화면\n" + definition.description + "\n\n테스트 후 행동 이름과 내부 사용자 표시를 확인하세요. 팀원은 각 사이트의 /analytics/internal에서 내부 표시를 켜 주세요.";
}

// 첫 차트에 시선을 모으고 나머지는 읽는 순서대로 두 열에 배치한다.
export function insightLayout(index, count) {
  if (index === 0) return { x: 0, y: 3, w: 12, h: 6 };
  const lastAlone = index === count - 1 && index % 2 === 1;
  return { x: index % 2 === 1 ? 0 : 6, y: 9 + Math.floor((index - 1) / 2) * 7, w: lastAlone ? 12 : 6, h: 7 };
}
