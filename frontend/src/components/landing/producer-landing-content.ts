export const PRODUCER_KAKAO_CHAT_URL = "https://pf.kakao.com/_pbTBX/chat";

export type SampleApplicant = {
  name: string;
  color: string;
  photo?: string;
};

export const sampleApplicants = {
  kim: { name: "김하린", color: "#2272eb", photo: "/images/applicants/kim-harin-profile.png" },
  park: { name: "박도윤", color: "#6a5bc4", photo: "/images/applicants/park-doyun-profile.jpg" },
  lee: { name: "이서연", color: "#19b48a", photo: "/images/applicants/lee-seoyeon-profile.jpg" },
  jung: { name: "정우진", color: "#ff8f4a" },
} satisfies Record<string, SampleApplicant>;

export const kimHarinShots = [
  "/images/applicants/kim-harin-profile.png",
  "/images/applicants/kim-harin-extra-1.jpg",
  "/images/applicants/kim-harin-extra-2.jpg",
];

export const PRODUCER_STATS_AS_OF = "2026.11.05";

export const producerStats = [
  { value: "3,900+", label: "배우들의 공고 조회" },
  { value: "240+", label: "공고를 받아 보는 오픈채팅 배우" },
  { value: "40+", label: "함께하는 공연사" },
  { value: "160+", label: "올라온 오디션 공고" },
];

export const producerPerks = [
  { title: "PDF 지원서 자동 정리", description: "메일로 받은 PDF를 올리면 프로필과 경력을 뽑아 정리해요. 공고 없이도 쓸 수 있어요.", soon: "메일에서 바로 가져오기" },
  { title: "배우 오픈채팅에 공유", description: "올린 공고는 운영팀이 배우 오픈채팅에 공유해요." },
  { title: "한 명씩 빠른 심사", description: "사진과 영상을 보며 합격, 보류, 불합격을 바로 남겨요." },
];

export const betaIncludes = [
  "오디션 공고 게시",
  "PDF 지원서 자동 정리",
  "전형별 심사와 결과 기록",
  "배우 오픈채팅 공유",
];

export const producerFaqs = [
  { question: "정말 무료인가요?", answer: "지금은 베타 기간이라 모든 기능이 무료예요. 요금제가 생기면 미리 알려 드려요." },
  { question: "가입하면 바로 공고를 올릴 수 있나요?", answer: "네. 가입 후 이메일로 받은 인증번호를 입력하면 바로 올릴 수 있어요." },
  { question: "메일로 받은 지원서도 정리되나요?", answer: "메일로 받은 PDF를 심사함에 올리면 정리해 드려요. 메일에서 바로 가져오는 기능은 곧 열려요." },
  { question: "지원자 개인정보는 안전한가요?", answer: "사이트로 받은 지원서는 그 공연을 등록한 공연사만, PDF 지원서는 심사함을 만든 공연사 계정에서만 볼 수 있어요." },
];
