import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout, PolicyNotice, PolicySection, PolicyTable } from "@/components/policies/policy-layout";
import { ACTOR_PAGE_CONSENT_LABEL, ACTOR_PAGE_CONSENT_NOTICE } from "@/features/actor-pages/settings";

export const metadata: Metadata = {
  title: "개인정보 동의문",
  description: "예술in 지원서 제출과 배우 페이지 공개 때 적용되는 개인정보 동의문을 안내합니다.",
};

const navigation = [
  { href: "#collection", label: "1. 수집·이용 동의" },
  { href: "#third-party", label: "2. 제3자 제공 동의" },
  { href: "#profile", label: "3. 프로필 저장" },
  { href: "#actor-page", label: "4. 배우 페이지 공개 동의" },
] as const;

export default function PrivacyConsentsPage() {
  return (
    <PolicyLayout
      title="개인정보 동의문"
      description="지원서를 제출할 때 적용되는 필수 동의와 선택형 프로필 저장 기능, 배우 페이지를 공개할 때 받는 동의를 안내합니다. 실제 제출 화면에는 선택한 공고의 기획사명과 수집 항목이 구체적으로 표시됩니다."
      version="1.1"
      effectiveDate="2026-10-29"
      navigation={navigation}
    >
      <PolicyNotice>
        개인정보처리자는 예술in 프로젝트팀(대표자 강민준)이며, 개인정보 문의는 <a href="mailto:contact@yesulin.art" className="font-semibold text-brand hover:underline">contact@yesulin.art</a>로 접수합니다. 계정·프로필 처리에 관한 내용은 <Link href="/privacy" className="font-semibold text-brand hover:underline">개인정보 처리방침</Link>에서 확인할 수 있습니다.
      </PolicyNotice>

      <PolicySection id="collection" title="1. 공고 지원서 수집·이용 동의 — 필수">
        <p>제출 화면에는 현재 공고가 실제로 요구하는 항목만 표시합니다.</p>
        <PolicyTable headers={["고지 사항", "내용"]} rows={[
          ["문서 버전", <code key="version">submission-collection-v1.0</code>],
          ["목적", "선택한 기획사/제작사의 공고 지원 접수, 배우 식별, 중복 지원·연령 확인, 심사 관리, 문의 처리와 배우의 지원 내역 제공"],
          ["수집 항목", "해당 공고가 요구한 이름·키·몸무게·생년월일·성별·연락처·이메일·시·군·구 수준 거주지 중 실제 항목, 실제 추가 정보, 사진 최대 3장, 영상 링크 최대 3개, 공고별 질문과 답변, 선택 배역·배역명, 모집 마감일 기준 만 나이, 제출 시각과 동의 이력"],
          ["보유·이용기간", "배우가 지원 내역을 삭제하거나 회원 탈퇴할 때까지. 삭제된 운영 데이터의 백업 사본은 일반 이용이 차단된 상태로 최대 90일 안에 순환 삭제"],
          ["거부권과 불이익", "동의를 거부할 수 있지만 지원 접수·심사에 필요한 정보이므로 해당 공고에 지원할 수 없습니다. 선택 항목은 제공하지 않아도 지원할 수 있습니다."],
        ]} />
        <div className="rounded-control border border-border bg-surface px-4 py-3 font-semibold text-foreground">□ 위 개인정보 수집·이용에 동의합니다. (필수)</div>
      </PolicySection>

      <PolicySection id="third-party" title="2. 기획사/제작사 제3자 제공 동의 — 필수">
        <PolicyTable headers={["고지 사항", "내용"]} rows={[
          ["문서 버전", <code key="version">submission-third-party-v1.0</code>],
          ["제공받는 자", "지원자가 선택한 공고의 정확한 기획사/제작사 운영 주체"],
          ["제공 목적", "해당 공고의 오디션 지원 접수·심사·일정·결과 연락과 동일 공연의 결원·대체 캐스팅 연락"],
          ["제공 항목", "배우가 해당 공고에 실제로 제출하는 항목"],
          ["보유·이용기간", "전형 종료 후 30일. 전형을 종료하지 않으면 모집 마감 후 120일. 법령상 보존 의무가 있으면 해당 정보만 분리 보관"],
          ["거부권과 불이익", "동의를 거부할 수 있지만 지원서를 해당 기획사/제작사에 전달할 수 없어 이 공고에 지원할 수 없습니다."],
        ]} />
        <div className="rounded-control border border-border bg-surface px-4 py-3 font-semibold text-foreground">□ 위 개인정보 제3자 제공에 동의합니다. (필수)</div>
        <p>이 동의는 현재 선택한 기획사/제작사와 공고에만 적용됩니다. 다른 공고에 지원할 때에는 다시 고지하고 동의받습니다. 다운로드·출력본에도 같은 보유기간이 적용됩니다.</p>
      </PolicySection>

      <PolicySection id="profile" title="3. 지원서 정보를 프로필에 저장 — 선택 기능">
        <div className="rounded-control border border-border bg-surface px-4 py-3 font-semibold text-foreground">□ 이번 지원서 정보를 프로필에 저장</div>
        <p>이 선택은 개인정보 동의가 아니라 이용자가 요청하는 프로필 기능입니다. 선택하면 이번 지원서에 입력한 기본·추가 정보를 프로필에 옮겨 다음 지원서에 자동으로 채웁니다.</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-brand">
          <li>사진, 영상 링크, 공고별 추가 질문 답변은 옮기지 않습니다.</li>
          <li>선택하지 않아도 지원할 수 있습니다.</li>
          <li>프로필에 저장된 항목은 프로필 화면에서 수정·삭제할 수 있습니다.</li>
          <li>프로필 저장이 실패해도 지원서 제출 성공에는 영향을 주지 않습니다.</li>
        </ul>
      </PolicySection>

      <PolicySection id="actor-page" title="4. 배우 페이지 공개 동의 — 공개할 때 필수">
        <p>배우 페이지는 기본 비공개입니다. 배우가 공개로 바꿀 때마다(공개 팝업이든 설정 화면이든) 아래 내용을 보여 주고 동의를 받습니다.</p>
        <PolicyTable headers={["고지 사항", "내용"]} rows={[
          ["문서 버전", <code key="version">actor-page-publish-v1.0</code>],
          ["공개 대상", "비로그인 이용자를 포함한 누구나. 배우 목록에 표시되고 검색엔진에 수집·노출될 수 있음"],
          ["공개 항목", "아이디, 이름, 성별, 출생연도·만 나이, 입력한 키·몸무게, 배우가 공개로 설정한 사진·영상과 학력·경력·자기소개·특기·취미·국적·외부 링크"],
          ["공개하지 않는 항목", "연락처, 이메일, 전체 생년월일, 거주지, 병역 정보, 비공개로 둔 항목·사진, ‘공연사만’으로 둔 영상"],
          ["공개 중단", "언제든 비공개로 바꿀 수 있음. 이미 외부에서 저장한 사본이나 검색 결과는 즉시 사라지지 않을 수 있음"],
          ["동의 기록 보관", "동의 문서 버전·동의 시각·회원·페이지를 회원 탈퇴 시까지 보관"],
          ["거부권과 불이익", "동의하지 않아도 프로필 저장·편집과 공고 지원은 그대로 이용할 수 있으며, 배우 페이지만 공개되지 않습니다."],
        ]} />
        <div className="grid gap-2 rounded-control border border-border bg-surface px-4 py-3">
          {ACTOR_PAGE_CONSENT_NOTICE.map((sentence) => <p key={sentence}>{sentence}</p>)}
          <p className="font-semibold text-foreground">□ {ACTOR_PAGE_CONSENT_LABEL} (공개 시 필수)</p>
        </div>
      </PolicySection>
    </PolicyLayout>
  );
}
