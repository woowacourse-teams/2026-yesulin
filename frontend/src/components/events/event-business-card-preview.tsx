"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import { SecondaryButton } from "@/components/ui/controls";
import type { RegistrationDraft } from "@/features/events/registration-draft";
import { EVENT_ACTIVITY_LABELS } from "@/features/events/types";
import { EventSnsLogo } from "./event-sns-logo";

export type CardPreviewSide = "front" | "back";

/** 명함 입력 모달의 상태를 그대로 그린다. 비어 있는 항목에는 입력할 정보를 안내한다. */
export function EventBusinessCardPreview({ draft, photoUrl, side, onSideChange, qrImageUrl }: {
  readonly draft: RegistrationDraft;
  readonly photoUrl: string | null;
  readonly side: CardPreviewSide;
  readonly onSideChange: (side: CardPreviewSide) => void;
  readonly qrImageUrl?: string;
}) {
  const back = side === "back";
  const paper = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = paper.current;
    if (!element) return;
    const resize = () => element.style.setProperty("--card-scale", String(element.clientWidth / 720));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const fields = draft.activityFields.map((field) => field === "OTHER"
    ? draft.otherActivity.trim() || "기타" : EVENT_ACTIVITY_LABELS[field]);
  const careers = draft.careers.filter((career) => career.year || career.month || career.workTitle.trim() || career.role.trim());
  return (
    <figure className="event-card-example" aria-label="입력한 명함 미리보기">
      <div ref={paper} className="event-card-example-paper" role="group" aria-label={back ? "명함 뒷면" : "명함 앞면"}>
        <div className="event-card-example-canvas">
          {back ? (
            <>
              <AutoFitText className="event-card-example-back">
                {draft.intro.trim() ? <p className="mb-4">{draft.intro.trim()}</p> : null}
                <p className="event-card-example-name">활동 분야 · 경력</p>
                {fields.length ? <ul className="event-card-example-fields">{fields.map((field, index) => <li key={index}>{field}</li>)}</ul> : <p>활동 분야</p>}
                <div className="event-card-example-rule" />
                {draft.noCareer ? <p>신입</p> : careers.length ? (
                  <ul className="event-card-example-careers">
                    {careers.map((career) => <li key={career.key}>
                      {[ [career.year, career.month].filter(Boolean).join("."), career.workTitle.trim(), career.role.trim() ].filter(Boolean).join(" · ")}
                    </li>)}
                  </ul>
                ) : <p>입력한 경력이 여기에 들어갑니다.</p>}
              </AutoFitText>
              <Image src="/images/yesulin-logo-transparent.png" alt="예술in" width={1024} height={610} className="event-card-example-logo" />
              {/* eslint-disable-next-line @next/next/no-img-element -- 발급된 QR 또는 로컬 예시 QR SVG다. */}
              <img src={qrImageUrl ?? "/images/events/profile-card-qr-example.svg"} alt={qrImageUrl ? "프로필로 연결되는 명함 QR" : "명함 QR 배치 예시"} className="event-card-example-qr" />
            </>
          ) : (
            <>
              <div className="event-card-example-photo">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 업로드한 사진의 브라우저 Blob 주소다.
                  <img src={photoUrl} alt="명함에 들어갈 프로필 사진" />
                ) : <span>프로필 사진</span>}
              </div>
              <AutoFitText className="event-card-example-info">
                <p className="event-card-example-name">{draft.name.trim() || "이름"}</p>
                <div className="event-card-example-rule" />
                <p>Actor</p><p>{draft.birthDate.replaceAll("-", ".") || "생년월일"}</p>
                <p>{draft.email.trim() || "이메일"}</p>
                {draft.snsPlatform ? (
                  <p className="event-card-example-sns"><EventSnsLogo platform={draft.snsPlatform} />{draft.snsHandle.trim() || "@계정명"}</p>
                ) : <p>{draft.snsHandle.trim() || "SNS (선택)"}</p>}
              </AutoFitText>
            </>
          )}
        </div>
      </div>
      <figcaption className="mt-4 flex flex-col items-center gap-2 text-center">
        <SecondaryButton aria-label={back ? "명함 앞면 보기" : "명함 뒷면 보기"} onClick={() => onSideChange(back ? "front" : "back")}>{back ? "앞면 보기" : "뒷면 보기"}</SecondaryButton>
        <p className="event-card-density-note text-xs leading-5 text-warn">내용이 많아 글자가 작아졌어요. 경력과 기타 분야를 간결하게 적으면 더 읽기 좋습니다.</p>
        {back && !qrImageUrl ? <p className="text-xs leading-5 text-muted-strong">QR은 배치를 확인하기 위한 예시입니다.</p> : null}
        <p className="text-xs leading-5 text-muted-strong">분야는 줄바꿈하고, 내용이 많으면 글자 크기를 맞춰 모두 표시합니다. 실제 제작 디자인과 사진 배치는 달라질 수 있습니다.</p>
      </figcaption>
    </figure>
  );
}

/** 명함의 고정 비율 안에 모든 텍스트가 들어가도록 맞춘다. 내용은 생략하지 않는다. */
function AutoFitText({ className, children }: { readonly className: string; readonly children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = content.current;
    if (!element) return;
    const fit = () => {
      // 0.5px 단위 이진 탐색으로 입력할 때마다 필요한 레이아웃 측정을 줄인다.
      let lower = 12;
      let upper = 48;
      let fitted = lower;
      while (lower <= upper) {
        const candidate = Math.floor((lower + upper) / 2);
        element.style.fontSize = `${candidate / 2}px`;
        if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
          upper = candidate - 1;
        } else {
          fitted = candidate;
          lower = candidate + 1;
        }
      }
      element.style.fontSize = `${fitted / 2}px`;
      element.dataset.compact = String(fitted / 2 < 16);
    };
    fit();
    document.fonts?.ready.then(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children]);
  return <div ref={content} className={className}>{children}</div>;
}
