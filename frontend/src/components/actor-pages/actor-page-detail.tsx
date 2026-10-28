"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { ContentSkeleton, ContentState } from "@/components/ui/content-state";
import { getActorPage } from "@/features/actor-pages/api";
import {
  ACTOR_PAGE_INQUIRY_URL,
  actorBodyLine,
  actorPageRoutes,
  type ActorPageContent,
  type PublicActorPage,
} from "@/features/actor-pages/types";
import { profileCareerGenreLabel } from "@/features/applicants/career-genre";
import { educationText } from "@/features/applicants/education";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { ActorBookmarkButton } from "./actor-bookmarks";
import { ActorPageScreen } from "./actor-page-screen";
import { ActorPhotoGallery } from "./actor-photo-gallery";

type PageState =
  | { readonly status: "loading" }
  | { readonly status: "missing" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly actorPage: PublicActorPage };

/** 서버가 미리 읽은 페이지를 쓰고, 목 환경·서버 API 미설정 시 브라우저에서 읽는다. 아이디가 정규 아이디와 다르면 주소를 바꾼다. */
export function ActorPageRoute({ handle, initial }: { readonly handle: string; readonly initial: PublicActorPage | null }) {
  const router = useRouter();
  const [state, setState] = useState<PageState>(() => initial ? { status: "ready", actorPage: initial } : { status: "loading" });

  const load = useCallback(() => {
    let active = true;
    getActorPage(handle)
      .then((actorPage) => {
        if (!active) return;
        if (actorPage.handle !== handle) router.replace(actorPageRoutes.detail(actorPage.handle));
        setState({ status: "ready", actorPage });
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof AuditionRequestError && cause.status === 404) {
          setState({ status: "missing" });
          return;
        }
        console.error("[배우 페이지 조회 실패]", cause);
        setState({ status: "error" });
      });
    return () => { active = false; };
  }, [handle, router]);

  useEffect(() => {
    if (initial) return;
    return load();
  }, [initial, load]);

  return (
    <ActorPageScreen backToList>
      {state.status === "loading" ? (
        <ContentSkeleton label="배우 페이지 불러오는 중" className="mt-4">
          <div className="grid gap-6 min-[901px]:grid-cols-[minmax(0,340px)_1fr]"><div className="aspect-[3/4] rounded-card bg-border-soft" /><div><div className="h-8 w-1/3 rounded bg-border-soft" /><div className="mt-3 h-5 w-1/2 rounded bg-border-soft" /></div></div>
        </ContentSkeleton>
      ) : null}
      {state.status === "missing" ? <MissingActorPage /> : null}
      {state.status === "error" ? (
        <ScreenError message="배우 페이지를 불러오지 못했어요." onRetry={() => { setState({ status: "loading" }); load(); }} />
      ) : null}
      {state.status === "ready" ? <ActorPageView actorPage={state.actorPage} /> : null}
    </ActorPageScreen>
  );
}

/** 비공개·잠금·없는 아이디를 구분하지 않는다. */
export function MissingActorPage() {
  return (
    <ContentState
      headingLevel={1}
      className="mt-4"
      title="배우 페이지를 찾을 수 없어요"
      description="주소가 바뀌었거나 지금은 공개되지 않은 페이지예요."
      action={<Link href={actorPageRoutes.list()} className="font-semibold text-brand hover:underline">배우 목록 보기</Link>}
    />
  );
}

/**
 * 배우 페이지 본문. 본인 미리보기(`preview`)는 마이페이지 안에 그려 제목 단계를 한 단계 내리고, 아직 입력하지 않은 이름·성별·
 * 생년월일과 정하지 않은 아이디는 비워 두며 공유 버튼을 숨긴다.
 */
export function ActorPageView({ actorPage, preview = false }: { readonly actorPage: ActorPageContent; readonly preview?: boolean }) {
  const name = actorPage.name ?? "이름 미입력";
  const NameHeading = preview ? "h2" : "h1";
  const { gender, birthYear, age } = actorPage;
  const body = actorBodyLine(actorPage);
  const basicInformation = [
    gender ? { label: "성별", value: gender === "FEMALE" ? "여성" : "남성" } : null,
    birthYear !== null ? { label: "출생", value: `${birthYear}년생${age !== null ? ` (만 ${age}세)` : ""}` } : null,
    body ? { label: "신체", value: body } : null,
  ].filter((item) => item !== null);
  const GroupHeading = preview ? "h4" : "h3";
  const otherInformation = [
    actorPage.education ? { label: "학력", value: educationText({ level: actorPage.education.level, school: actorPage.education.school ?? "", major: actorPage.education.major ?? "" }) } : null,
    actorPage.nationality ? { label: "국적", value: actorPage.nationality } : null,
    actorPage.hobbies ? { label: "취미", value: actorPage.hobbies } : null,
  ].filter((item) => item !== null);

  return (
    <article className="mt-4">
      <div className="grid items-start gap-7 min-[901px]:grid-cols-[minmax(0,340px)_minmax(0,1fr)] min-[901px]:gap-10">
        <div className="min-w-0 min-[901px]:sticky min-[901px]:top-[104px] min-[901px]:-m-2 min-[901px]:max-h-[calc(100dvh-120px)] min-[901px]:overflow-y-auto min-[901px]:p-2">
          <ActorPhotoGallery name={name} representativePhotoUrl={actorPage.representativePhotoUrl} photos={actorPage.photos} />
        </div>

        <div className="grid min-w-0 gap-5">
          <header className="rounded-card border border-border bg-card p-5 min-[761px]:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                {actorPage.handle ? <p className="text-sm font-semibold text-muted-strong">@{actorPage.handle}</p> : null}
                <NameHeading className="mt-1 break-words text-[32px] font-bold leading-tight tracking-tight min-[761px]:text-4xl">{name}</NameHeading>
              </div>
              {!preview && actorPage.handle ? (
                <div className="flex flex-wrap items-start gap-2">
                  {actorPage.publicId ? <ActorBookmarkButton publicId={actorPage.publicId} name={name} /> : null}
                  <ShareButton name={name} handle={actorPage.handle} />
                </div>
              ) : null}
            </div>
            {basicInformation.length > 0 ? (
              <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-4 border-t border-border-soft pt-5">
                {basicInformation.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs font-medium text-muted-strong">{item.label}</dt>
                    <dd className="num mt-1 text-sm font-semibold">{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </header>

          <aside className="rounded-card border border-brand-line bg-brand-soft p-5 text-sm leading-6">
            <p className="font-semibold">이 배우와 함께하고 싶다면</p>
            <p className="mt-1 text-muted-strong">연락처 대신 예술in이 배우에게 문의를 전달해 드려요.</p>
            <a href={ACTOR_PAGE_INQUIRY_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-control bg-brand px-4 font-semibold text-white hover:bg-brand-strong">
              카카오톡으로 문의하기<span className="sr-only"> (새 창에서 열림)</span>
            </a>
          </aside>

          {actorPage.coverLetter ? <Section preview={preview} title="자기소개"><p className="whitespace-pre-line break-words leading-7">{actorPage.coverLetter}</p></Section> : null}

          {actorPage.videos.length > 0 ? (
            <Section preview={preview} title="영상">
              <ul className="grid gap-4">
                {actorPage.videos.map((video, index) => (
                  <li key={video.youtubeId} className="overflow-hidden rounded-card border border-border bg-foreground">
                    <div className="aspect-video">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&playsinline=1`}
                        title={`${name} 영상 ${index + 1}`}
                        loading="lazy"
                        allow="encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        className="h-full w-full border-0"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {actorPage.careerGroups.length > 0 ? (
            <Section preview={preview} title="경력">
              <div className="grid gap-6">
                {actorPage.careerGroups.map((group) => (
                  <section key={group.genre ?? "UNCLASSIFIED"} aria-label={profileCareerGenreLabel(group.genre)}>
                    <GroupHeading className="text-sm font-bold text-muted-strong">{profileCareerGenreLabel(group.genre)}</GroupHeading>
                    <ul className="mt-2 divide-y divide-border-soft border-y border-border-soft">
                      {group.careers.map((career, index) => (
                        <li key={`${career.year}-${career.title}-${index}`} className="flex gap-4 py-2.5 text-sm">
                          <span className="num w-12 shrink-0 text-muted">{career.year}</span>
                          <span className="min-w-0 break-words"><strong className="font-semibold">{career.title}</strong> <span className="text-muted-strong">{career.roleName} 역</span></span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </Section>
          ) : null}

          {actorPage.specialty ? <Section preview={preview} title="특기"><p className="whitespace-pre-line break-words leading-7">{actorPage.specialty}</p></Section> : null}

          {otherInformation.length > 0 || actorPage.links.length > 0 ? (
            <Section preview={preview} title="더 알아보기">
              <dl className="grid gap-3 text-sm">
                {otherInformation.map((item) => (
                  <div key={item.label} className="grid grid-cols-[4rem_1fr] gap-3">
                    <dt className="font-semibold text-muted-strong">{item.label}</dt>
                    <dd className="min-w-0 break-words">{item.value}</dd>
                  </div>
                ))}
                {actorPage.links.length > 0 ? (
                  <div className="grid grid-cols-[4rem_1fr] gap-3">
                    <dt className="font-semibold text-muted-strong">링크</dt>
                    <dd className="grid min-w-0 gap-1">{actorPage.links.map((link) => <ExternalLink key={link.url} url={link.url} />)}</dd>
                  </div>
                ) : null}
              </dl>
            </Section>
          ) : null}
        </div>
      </div>

      <footer className="mt-10 border-t border-border pt-5 text-sm text-muted-strong">
        문제가 있는 페이지는 예술in에 알려 주세요.{" "}
        <a href={ACTOR_PAGE_INQUIRY_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
          문의하기<span className="sr-only"> (새 창에서 열림)</span>
        </a>
      </footer>
    </article>
  );
}

function Section({ title, preview, children }: { readonly title: string; readonly preview: boolean; readonly children: ReactNode }) {
  const Heading = preview ? "h3" : "h2";
  return (
    <section className="min-w-0 rounded-card border border-border bg-card p-5 min-[761px]:p-7">
      <Heading className="mb-4 text-lg font-bold tracking-tight">{title}</Heading>
      {children}
    </section>
  );
}

/** 배우가 입력한 링크라 http·https 주소만 링크로 만들고 검색엔진에 추천하지 않는다. */
function ExternalLink({ url }: { readonly url: string }) {
  if (!/^https?:\/\//i.test(url)) return <span className="break-all">{url}</span>;
  return (
    <a href={url} target="_blank" rel="nofollow ugc noopener noreferrer" className="break-all text-brand hover:underline">
      {url}<span className="sr-only"> (새 창에서 열림)</span>
    </a>
  );
}

type ShareStatus = "idle" | "copied" | "failed";

/** 휴대폰은 공유 창을 열고, 지원하지 않으면 주소를 복사한다. 공유 창을 닫은 것은 실패로 보지 않는다. */
function ShareButton({ name, handle }: { readonly name: string; readonly handle: string }) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const share = async () => {
    const url = new URL(actorPageRoutes.detail(handle), window.location.origin).toString();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${name} | 예술in`, url });
        return;
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => void share()} className="inline-flex min-h-11 items-center rounded-control border border-border bg-card px-4 text-sm font-semibold hover:border-brand-line">
        페이지 공유
      </button>
      <p role="status" className="text-sm text-muted-strong">
        {status === "copied" ? "페이지 주소를 복사했어요." : status === "failed" ? "주소를 복사하지 못했어요. 주소창의 주소를 복사해 주세요." : ""}
      </p>
    </div>
  );
}
