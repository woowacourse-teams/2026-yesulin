import type { Random } from "./random";

export const NAMES = [
  "김서윤", "박도현", "이하늘", "최민재", "정유진", "한겨울", "오세훈", "윤소라", "장태민", "배주희",
  "신다은", "권지호", "임채린", "고은별", "류승우", "문가영", "안재현", "서예린", "조민석", "황보라",
  "남기훈", "전소민", "백승아", "구자현", "심유나", "노태경", "추민영", "표진우", "하윤슬", "설도영",
  "유한별", "명재원", "석지우", "탁예나", "반시우", "현소윤", "좌민준", "피서현", "국다인", "목하람",
  "선우진", "차유빈", "봉지훈", "옥세라",
] as const;

export const SCHOOLS = [
  "한국예술종합학교 연극원",
  "중앙대 연극학과",
  "서울예대 연기과",
  "동국대 연극학부",
  "단국대 공연영화학부",
  "계원예대 공연학과",
] as const;

export const WORKS = [
  "뮤지컬 <빨래>",
  "연극 <고도를 기다리며>",
  "뮤지컬 <미드나잇>",
  "연극 <옥탑방 고양이>",
  "뮤지컬 <총각네 야채가게>",
  "연극 <십이야>",
  "뮤지컬 <데스노트>",
  "연극 <에쿠우스>",
] as const;

export const PARTS = ["앙상블", "조연", "주연", "스윙", "커버"] as const;

export const PHOTO_LABELS = ["프로필 사진", "전신 사진", "추가 사진 1", "추가 사진 2"] as const;

/**
 * 자기소개서·지원 동기는 문장 조각을 조합해 만든다. 실제 지원서와 똑같지는 않아도
 * 화면에 빈칸 대신 그럴듯한 분량의 글이 채워져 있어야 목록·상세 레이아웃이 어떻게
 * 보이는지 판단할 수 있다.
 */
const SELF_OPEN = [
  "어릴 때부터 무대 위에서 다른 사람이 되어보는 순간이 가장 즐거웠습니다.",
  "연기를 시작한 지 {yr}년이 되었지만, 아직도 첫 무대에 섰을 때의 떨림을 잊지 못합니다.",
  "{school} 재학 시절부터 지금까지, 저를 설명하는 가장 정확한 단어는 언제나 배우였습니다.",
  "무대 위에서 인물의 감정을 온전히 전달하는 것이 제가 연기를 놓지 못하는 이유입니다.",
] as const;

const SELF_MID = [
  "{part} 역할을 맡으며 인물의 디테일을 관찰하고 표현하는 훈련을 꾸준히 해왔습니다.",
  "발성과 움직임 모두 기본기를 중요하게 생각하며, 매 작품마다 새로운 톤을 시도하려 노력합니다.",
  "앙상블로 참여했던 경험을 통해 무대 전체의 호흡을 읽는 감각을 익혔습니다.",
  "대본을 분석할 때 인물의 배경과 관계를 먼저 파악한 뒤 대사를 붙이는 방식으로 작업합니다.",
  "함께 작업한 동료들과의 합을 맞추는 과정에서 배우로서 많이 성장했다고 생각합니다.",
] as const;

const SELF_CLOSE = [
  "이번 작품에서도 인물에 온전히 스며드는 배우가 되겠습니다.",
  "주어진 역할의 크기와 상관없이 최선을 다하는 태도로 임하겠습니다.",
  "늘 배우는 자세로 현장에 임하며, 함께하는 분들께 신뢰를 드리고 싶습니다.",
  "오랜 시간 준비해온 만큼 이번 기회에 제 모든 것을 보여드리고 싶습니다.",
] as const;

const MOTIVE_OPEN = [
  "이번 작품의 시놉시스를 처음 읽었을 때부터 꼭 참여하고 싶다는 확신이 들었습니다.",
  "평소 좋아하던 작품의 오디션 소식을 듣고 망설임 없이 지원서를 작성했습니다.",
  "{title}에서 다루는 정서가 제가 오랫동안 연기해보고 싶었던 결과 맞닿아 있어 지원하게 되었습니다.",
  "작품이 전하려는 메시지에 깊이 공감하며, 그 안에서 제 역할을 찾고 싶었습니다.",
] as const;

const MOTIVE_MID = [
  "특히 {roleName} 역할이 가진 서사에 끌렸고, 이 인물이라면 잘 표현할 수 있겠다는 생각이 들었습니다.",
  "제가 가진 경험과 색깔이 이 작품의 방향과 잘 맞을 것이라 생각해 지원을 결심했습니다.",
  "이전 작품에서 비슷한 결의 인물을 연기해본 경험이 이번 지원에 큰 확신을 주었습니다.",
  "연출님의 이전 작업들을 보며 언젠가 함께하고 싶다는 마음을 오래 품어왔습니다.",
] as const;

const MOTIVE_CLOSE = [
  "기회가 주어진다면 팀에 누가 되지 않도록 성실히 준비하겠습니다.",
  "좋은 작품에 참여할 수 있다면 그 자체로 큰 의미가 있다고 생각합니다.",
  "함께 만들어가는 과정에서 최선을 다해 제 몫을 해내고 싶습니다.",
  "이 작품과 함께 성장하는 배우가 되고 싶어 지원합니다.",
] as const;

export type ParagraphVars = {
  readonly yr: number;
  readonly school: string;
  readonly part: string;
  readonly roleName: string;
  readonly title: string;
};

const PLACEHOLDER = /\{(\w+)\}/g;

function fill(sentence: string, vars: ParagraphVars) {
  return sentence.replace(PLACEHOLDER, (_, key: string) => String(vars[key as keyof ParagraphVars] ?? ""));
}

function buildParagraph(
  random: Random,
  open: readonly string[],
  mid: readonly string[],
  close: readonly string[],
  vars: ParagraphVars,
) {
  const first = random.pick(mid, mid[0] ?? "");
  let second = random.pick(mid, mid[0] ?? "");
  while (mid.length > 1 && second === first) second = random.pick(mid, mid[0] ?? "");

  return [random.pick(open, open[0] ?? ""), first, second, random.pick(close, close[0] ?? "")]
    .map((sentence) => fill(sentence, vars))
    .join(" ");
}

export const buildCoverLetter = (random: Random, vars: ParagraphVars) =>
  buildParagraph(random, SELF_OPEN, SELF_MID, SELF_CLOSE, vars);

export const buildMotivation = (random: Random, vars: ParagraphVars) =>
  buildParagraph(random, MOTIVE_OPEN, MOTIVE_MID, MOTIVE_CLOSE, vars);
