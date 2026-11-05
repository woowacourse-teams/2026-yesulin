export const PRODUCER_KAKAO_CHAT_URL = "https://pf.kakao.com/_pbTBX/chat";

export type SampleApplicant = {
  name: string;
  color: string;
  photo?: string;
};

export const sampleApplicants = {
  kim: { name: "김하린", color: "#2272eb", photo: "/images/applicants/kim-harin-profile.png" },
  park: { name: "박도윤", color: "#6a5bc4" },
  lee: { name: "이서연", color: "#19b48a" },
  jung: { name: "정우진", color: "#ff8f4a" },
} satisfies Record<string, SampleApplicant>;

export const kimHarinShots = [
  "/images/applicants/kim-harin-profile.png",
  "/images/applicants/kim-harin-extra-1.jpg",
  "/images/applicants/kim-harin-extra-2.jpg",
];

/** 2026-11-05 운영 데이터 기준. 숫자를 바꿀 때 기준일도 함께 바꾼다. */
export const producerStats = [
  { value: "3,900+", label: "배우들의 공고 조회" },
  { value: "240+", label: "공고 알림 오픈채팅 배우" },
  { value: "40+", label: "함께하는 공연사" },
  { value: "160+", label: "올라온 오디션 공고" },
];

export const producerPerks = [
  { mark: "@", title: "지원서 자동 정리", description: "PDF 지원서에서 프로필과 경력을 뽑아 한곳에 모아요.", soon: "메일에서 바로 가져오기" },
  { mark: "↗", title: "공고 알림 240+명", description: "공고를 올리면 배우 오픈채팅에 알림이 가요." },
  { mark: "✓", title: "한 명씩 빠른 심사", description: "사진·영상을 보며 합격·보류·불합격을 바로 남겨요." },
];

export const betaIncludes = [
  "오디션 공고 게시 무제한",
  "PDF 지원서 자동 정리",
  "전형별 심사·결과 기록",
  "오픈채팅 240+명 공고 알림",
];

export const producerFaqs = [
  { question: "정말 무료인가요?", answer: "지금은 베타 기간이라 모든 기능이 무료예요. 요금제가 생기면 미리 알려 드려요." },
  { question: "가입하면 바로 공고를 올릴 수 있나요?", answer: "네. 가입 후 이메일로 받은 인증번호를 입력하면 바로 공고를 올릴 수 있어요." },
  { question: "메일로 받은 지원서도 정리되나요?", answer: "PDF 지원서를 올리면 프로필과 경력을 정리해 드려요. 메일에서 바로 가져오는 기능은 곧 열려요." },
  { question: "지원자 개인정보는 안전한가요?", answer: "지원서는 그 공고를 올린 공연사만 볼 수 있어요." },
];
