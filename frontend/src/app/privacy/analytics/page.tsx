import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsSettingsButton } from "@/components/analytics/analytics-settings-button";
import { PolicyLayout, PolicyNotice, PolicySection } from "@/components/policies/policy-layout";

export const metadata: Metadata = {
  title: "PostHog 방문 분석 안내",
  description: "예술in의 PostHog 수집 항목, 미국 리전 전송과 분석을 끄는 방법입니다.",
};

export default function AnalyticsPrivacyPage() {
  return <PolicyLayout title="PostHog 방문 분석 안내" description="공고와 서비스 기능이 어떻게 이용되는지 확인하고 개선하기 위해 PostHog를 사용합니다."
    version="분석 안내 1.1" effectiveDate="2026-10-30" navigation={[
      { href: "#collection", label: "1. 수집하는 정보" },
      { href: "#transfer", label: "2. 전송과 보관" },
      { href: "#choice", label: "3. 분석 끄기와 문의" },
    ]}>
    <div className="pt-8"><PolicyNotice>방문 분석은 기본으로 켜져 있습니다. 분석을 꺼도 모든 서비스를 이용할 수 있습니다. 이전에 꺼 둔 선택은 그대로 유지합니다. 이 안내는 <Link href="/privacy" className="text-brand underline">개인정보 처리방침</Link>의 방문 분석 안내를 보충합니다.</PolicyNotice></div>
    <PolicySection id="collection" title="1. 수집하는 정보">
      <ul className="list-disc space-y-2 pl-5">
        <li>브라우저에 저장하는 방문 식별자, 로그인 시 원래 회원 번호를 변환한 가명 계정 식별자, 방문 세션 식별자와 이용자 역할</li>
        <li>공고 조회·첨부 클릭·오픈채팅 알림 유입, 공연 조회·예매 단계와 성공·실패, 공연사의 게시·관리 기능 이용</li>
        <li>오픈채팅·네이버·구글·인스타그램 등 유입 경로의 분류명. 링크 표시와 이전 사이트 주소를 브라우저에서 분류하며, 원문 주소·검색어·임의 캠페인 값은 보내지 않습니다.</li>
        <li>PDF 업로드·추출·적용·저장 단계의 성공·실패, 처리 결과를 확인하기까지의 시간, 지원자 검토 화면 이용 시간과 저장 여부</li>
        <li>행동 시각, 연결에 필요한 공고·공연·PDF 작업·심사 대상 식별자, 수량·제한된 오류 코드, 운영·개발 및 내부 테스트 구분</li>
      </ul>
      <p>가명 식별자를 사용하므로 이름을 직접 보내지 않아도 동일 계정의 이용 행동을 연결할 수 있습니다. 완전히 익명인 통계만 수집하는 방식은 아닙니다.</p>
      <p>PostHog에 이름·이메일·전화번호·PDF 원문·사진·파일명·파일 주소·지원서 답변·심사 메모·판정 내용·현재 페이지 주소와 제목을 보내지 않습니다. 화면 녹화와 자동 클릭 수집, 광고 추적은 사용하지 않습니다.</p>
    </PolicySection>
    <PolicySection id="transfer" title="2. 전송과 보관">
      <p>분석을 끄지 않은 상태에서 위 행동이 발생하면 암호화된 통신으로 PostHog, Inc.의 미국 리전에 전송합니다. 위탁 업무는 서비스 이용 흐름·재방문·기능 개선 효과 분석입니다.</p>
      <p>이벤트 데이터는 현재 PostHog 무료 요금제의 1년 보관 기준을 따릅니다. 브라우저의 방문 식별자는 분석을 끄거나 해당 사이트의 브라우저 저장 데이터를 지울 때 초기화됩니다. 네트워크 전송 과정에서 IP가 처리될 수 있지만 분석 이벤트의 IP 저장과 IP 기반 위치 분석은 비활성화합니다.</p>
      <p>PostHog의 연락처와 처리 정보는 <a href="https://posthog.com/privacy" className="text-brand underline" target="_blank" rel="noreferrer">PostHog 개인정보 처리방침</a>에서 확인할 수 있습니다.</p>
    </PolicySection>
    <PolicySection id="choice" title="3. 분석 끄기와 문의">
      <p>화면 하단의 ‘분석 설정’에서 ‘분석 끄기’를 선택하면 현재 브라우저에서 이후 분석 전송을 중단합니다. 다른 기기·브라우저에서는 별도로 선택해야 합니다. 브라우저 저장 데이터를 삭제하면 선택도 초기화될 수 있습니다.</p>
      <AnalyticsSettingsButton />
      <p>분석을 끄는 것만으로 이미 전송한 기록이 삭제되지는 않습니다. 열람·삭제·처리정지 요청은 예술in 개인정보 보호 담당자에게 <a href="mailto:contact@yesulin.art" className="text-brand underline">contact@yesulin.art</a>로 보내 주세요.</p>
    </PolicySection>
  </PolicyLayout>;
}
