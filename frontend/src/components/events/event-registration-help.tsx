/** 신청서와 명함 편집창에서 입력을 유지한 채 운영 채널로 문의한다. */
export function EventRegistrationHelp() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
      <p className="text-muted-strong">신청이나 명함 작성 중 문제가 생겼나요?</p>
      <a href="https://pf.kakao.com/_pbTBX/chat" target="_blank" rel="noopener noreferrer" aria-label="카카오톡으로 문의하기 (새 창에서 열림)"
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control bg-kakao px-4 font-semibold text-kakao-ink transition-[filter] hover:brightness-95">
        카카오톡으로 문의하기
      </a>
    </div>
  );
}
