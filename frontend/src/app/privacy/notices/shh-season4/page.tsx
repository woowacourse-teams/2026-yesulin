import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout, PolicyNotice, PolicySection, PolicyTable } from "@/components/policies/policy-layout";

const AUDITION_NAME = "〈연극 식당〉 시즌 4 〈쉿!〉";
const CONTROLLER = "컴퍼니 연결·남극장";
const CONTACT_EMAIL = "sumi0808@naver.com";

export const metadata: Metadata = {
  title: `${AUDITION_NAME} 지원서 개인정보 처리 안내`,
  description: `${CONTROLLER}의 ${AUDITION_NAME} 오디션 지원서 처리 목적·항목·보유기간과 예술in 처리 위탁 내용을 안내합니다.`,
  robots: { index: false },
};

const navigation = [
  { href: "#controller", label: "1. 개인정보처리자" },
  { href: "#processing", label: "2. 처리 목적·항목·기간" },
  { href: "#processor", label: "3. 처리업무 위탁" },
  { href: "#rights", label: "4. 지원자의 권리" },
] as const;

export default function ShhSeason4PrivacyNoticePage() {
  return (
    <PolicyLayout
      title={`${AUDITION_NAME} 오디션 지원서 개인정보 처리 안내`}
      description={`${CONTROLLER}이 이메일로 받은 ${AUDITION_NAME} 오디션 지원서를 예술in에 맡겨 심사할 때 개인정보를 어떻게 처리하는지 안내합니다.`}
      version="1.0"
      effectiveDate="2026-10-20"
      navigation={navigation}
    >
      <PolicyNotice>
        이 안내는 {AUDITION_NAME} 배우 모집에 지원서를 보낸 분에게 적용됩니다. 지원서의 개인정보처리자는 {CONTROLLER}이며, 예술in 프로젝트팀은 {CONTROLLER}의 위탁을 받아 지원서를 보관하고 심사 관리 화면을 제공합니다.
      </PolicyNotice>

      <PolicySection id="controller" title="1. 개인정보처리자">
        <PolicyTable headers={["구분", "내용"]} rows={[
          ["개인정보처리자", `${CONTROLLER}(공동 제작)`],
          ["대상 공고", <a key="posting" href="https://otr.co.kr/audition/?vid=22513" target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">{AUDITION_NAME} 배우 모집(OTR)</a>],
          ["개인정보 문의", <a key="email" href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand hover:underline">{CONTACT_EMAIL}</a>],
        ]} />
      </PolicySection>

      <PolicySection id="processing" title="2. 처리 목적·항목·보유기간">
        <PolicyTable headers={["구분", "내용"]} rows={[
          ["처리 목적", "오디션 지원 접수, 1차 서류 심사, 합격자 발표와 2차 대면 오디션 일정 안내"],
          ["처리 항목", "지원 메일 주소, 프로필 파일과 그 안에 적힌 이름·성별·생년월일·연락처·사진·이력 등. 프로필에 적지 않은 정보는 처리하지 않습니다."],
          ["보유기간", `전형 종료 후 30일. 기간이 지나면 예술in에 보관된 지원서 파일과 심사 기록을 파기하며, ${CONTROLLER}도 이메일로 받은 지원서를 같은 기간 안에 파기합니다. 최종 합격자 정보는 출연 계약에 필요한 범위에서만 따로 관리합니다.`],
        ]} />
      </PolicySection>

      <PolicySection id="processor" title="3. 처리업무 위탁">
        <PolicyTable headers={["수탁자", "위탁 업무"]} rows={[
          ["예술in 프로젝트팀(대표자 강민준)", "지원서 파일 등록·보관, 심사 관리 화면 제공, 보유기간 종료 후 파기"],
        ]} />
        <p>예술in은 {CONTROLLER}의 동의를 받아 아래 업무를 다시 위탁합니다.</p>
        <PolicyTable headers={["재수탁자", "위탁 업무"]} rows={[
          ["Amazon Web Services, Inc.", "대한민국 리전의 서버·데이터베이스·파일 저장소 운영"],
        ]} />
        <ul className="list-disc space-y-2 pl-5 marker:text-brand">
          <li>예술in은 {CONTROLLER}의 심사 목적 외로 지원서를 이용하지 않습니다.</li>
          <li>다른 기획사/제작사에 제공하거나 예술in 회원 정보와 연결하지 않으며, 서비스 개선·통계·AI 학습에도 쓰지 않습니다.</li>
          <li>지원서는 {CONTROLLER}의 권한 있는 담당자만 열람할 수 있습니다.</li>
        </ul>
        <p>웹 화면 호스팅·오류 모니터링 등 서비스 운영에 쓰는 외부 서비스와 안전성 확보조치는 <Link href="/privacy" className="font-semibold text-brand hover:underline">예술in 개인정보 처리방침</Link>을 따릅니다.</p>
      </PolicySection>

      <PolicySection id="rights" title="4. 지원자의 권리">
        <p>지원자는 자신의 지원서 정보에 대해 열람, 정정·삭제, 처리정지를 요구할 수 있습니다. <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand hover:underline">{CONTACT_EMAIL}</a> 또는 <a href="mailto:contact@yesulin.art" className="font-semibold text-brand hover:underline">contact@yesulin.art</a>로 요청하면 되고, 예술in으로 온 요청은 {CONTROLLER}에 전달한 뒤 처리 결과를 회신합니다.</p>
        <p>외부 상담·신고가 필요하면 개인정보침해신고센터(국번 없이 118), 개인정보분쟁조정위원회 등 관계기관의 절차를 이용할 수 있습니다. 이 안내가 바뀌면 같은 주소에 변경 내용과 날짜를 게시합니다.</p>
      </PolicySection>
    </PolicyLayout>
  );
}
