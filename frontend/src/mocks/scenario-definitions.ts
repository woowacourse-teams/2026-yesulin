export type MockScenarioDefinition = {
  readonly id: string;
  readonly area: "지원 양식" | "심사 흐름" | "무료 공연";
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly checks: readonly string[];
};

/** 개발용 허브와 검증 문서가 공유하는 대표 시나리오 목록. */
export const MOCK_SCENARIOS: readonly MockScenarioDefinition[] = [
  {
    id: "public-default",
    area: "지원 양식",
    title: "기본 복수 배역 지원",
    description: "복수 배역 선택과 전체 지원 흐름을 확인합니다.",
    href: "/apply/seed_posting_1",
    checks: ["배역 선택 단계가 표시된다", "기본·추가·사진·영상·추가 질문 단계가 순서대로 표시된다"],
  },
  {
    id: "public-minimal",
    area: "지원 양식",
    title: "최소 기본정보",
    description: "이름·연락처·이메일만 받는 가장 짧은 지원서입니다.",
    href: "/apply/seed_posting_minimal",
    checks: ["단일 배역 선택 단계가 생략된다", "비어 있는 추가정보와 제출자료 단계가 생성되지 않는다"],
  },
  {
    id: "public-without-height",
    area: "지원 양식",
    title: "키 미수집·몸무게 수집",
    description: "독립된 기본정보 필드 계약과 검토 화면을 확인합니다.",
    href: "/apply/seed_posting_without_height",
    checks: ["키 입력이 표시되지 않는다", "몸무게 입력은 필수로 표시된다", "프로필 사진 단계는 유지된다"],
  },
  {
    id: "public-all-fields",
    area: "지원 양식",
    title: "전체 항목·질문 3개",
    description: "가장 긴 지원서의 정보 밀도와 반응형 레이아웃을 확인합니다.",
    href: "/apply/seed_posting_all_fields",
    checks: ["기본정보 8개가 모두 표시된다", "추가 질문 3개가 순서대로 표시된다", "가로 스크롤 없이 모바일에서 읽힌다"],
  },
  {
    id: "screening-single-role-picker",
    area: "심사 흐름",
    title: "단일 배역 지원 현황",
    description: "배역이 하나인 공고도 심사 보드로 바로 가지 않고 배역별 현황을 먼저 확인합니다.",
    href: "/producers/postings/seed_posting_round_2",
    checks: ["모집 배역 1개가 목록으로 표시된다", "배역을 선택해야 2차 심사 보드로 이동한다"],
  },
  {
    id: "screening-round-1",
    area: "심사 흐름",
    title: "1차 검토 대기",
    description: "1차 지원자 검토를 시작하는 기본 상태입니다.",
    href: "/producers/roles/seed_role_seoyeon?round=1",
    checks: ["1차 지원자가 표시된다", "심사 결과는 합격·불합격·보류로만 표시된다"],
  },
  {
    id: "screening-round-2",
    area: "심사 흐름",
    title: "2차 현장 오디션 진행",
    description: "1차 합격자만 넘어온 일부 검토 완료 상태입니다.",
    href: "/producers/roles/seed_role_round_2?round=2",
    checks: ["2차 대상자는 1차 합격자 3명이다", "1차 결과가 유지된다", "검토 대기와 완료 결과가 함께 집계된다"],
  },
  {
    id: "screening-round-3",
    area: "심사 흐름",
    title: "3차 최종 오디션 진행",
    description: "1·2차 결과를 유지하며 2차 합격자만 최종 차수에 남은 상태입니다.",
    href: "/producers/roles/seed_role_round_3?round=3",
    checks: ["1·2차 결과가 유지된다", "3차 대상자는 2차 합격자 3명이다", "미수집 키가 0cm가 아닌 미수집으로 표시된다"],
  },
  {
    id: "shows-public-list",
    area: "무료 공연",
    title: "공개 공연 목록",
    description: "예매 중인 공연만 다음 회차 일시와 함께 표시합니다.",
    href: "/shows",
    checks: ["예매 중 공연 2개만 표시된다", "마감·초안 공연은 표시되지 않는다"],
  },
  {
    id: "shows-public-detail",
    area: "무료 공연",
    title: "회차 선택과 예매",
    description: "지난 회차, 잔여석이 적은 회차, 여유 있는 회차가 섞인 공연입니다.",
    href: "/shows/seed_show_moonlight",
    checks: ["지난 회차는 선택할 수 없다", "잔여석 2매 회차에 3매 이상 예매하면 잔여석 안내가 나온다", "같은 번호로 같은 회차를 다시 예매하면 중복 안내가 나온다"],
  },
  {
    id: "shows-public-sold-out",
    area: "무료 공연",
    title: "매진 공연",
    description: "하나뿐인 회차가 매진된 공연입니다.",
    href: "/shows/seed_show_summer",
    checks: ["매진이 텍스트로 표시된다", "예매 버튼을 누를 수 없다"],
  },
  {
    id: "shows-public-closed",
    area: "무료 공연",
    title: "예매 종료 공연",
    description: "운영자가 마감한 공연을 링크로 연 상태입니다.",
    href: "/shows/seed_show_nightfall",
    checks: ["예매 종료가 표시된다", "문의 전화번호는 계속 보인다"],
  },
  {
    id: "shows-producer",
    area: "무료 공연",
    title: "기획사 공연 관리",
    description: "초안·예매 중·마감 공연과 회차별 예매자를 관리합니다.",
    href: "/producers/shows",
    checks: ["상태가 배지 텍스트로 구분된다", "예매가 있는 회차는 삭제할 수 없다", "예매 취소 후 잔여석이 늘어난다"],
  },
];
