import Image from "next/image";
import Link from "next/link";
import { DefaultProfileIcon } from "@/components/ui/default-profile-icon";
import { SiteIcon } from "@/components/ui/site-icon";
import { actorPageAddress, pageRepresentativePhoto, type ActorPageSettings } from "@/features/actor-pages/settings";
import { actorPageRoutes } from "@/features/actor-pages/types";
import { profileAnswerText, profileSummary, representativePhoto } from "@/features/applicants/profile-answers";
import { applicantRoutes } from "@/features/applicants/routes";
import type { ApplicantProfileResponse } from "@/features/applicants/types";

type PageTone = "public" | "locked" | "private";
type PageStatus = { readonly label: string; readonly detail: string; readonly tone: PageTone };

/** 잠금이 공개보다 앞선다. 잠긴 페이지는 공개 상태여도 보이지 않는다. */
function actorPageStatus(settings: ActorPageSettings): PageStatus {
  if (settings.locked) return { label: "운영자가 잠갔어요", detail: "설정에서 잠긴 이유를 확인할 수 있어요.", tone: "locked" };
  if (settings.status === "PUBLIC") return { label: "공개 중", detail: "누구나 내 배우 페이지를 볼 수 있어요.", tone: "public" };
  if (settings.autoHiddenReason) return { label: "자동으로 비공개됐어요", detail: "설정에서 이유를 확인하고 다시 공개할 수 있어요.", tone: "private" };
  return { label: "비공개", detail: "공개하면 누구나 내 배우 페이지를 볼 수 있어요.", tone: "private" };
}

/** 마이페이지 상단. 사진은 배우 페이지 대표(첫 공개 사진)를, 없으면 보관함 대표를 쓴다. 공개 전환은 동의와 공개 사본 준비가 필요해 설정 화면의 공개 흐름으로 보낸다. */
export function ApplicantStageHero({ profile, actorPage }: { readonly profile: ApplicantProfileResponse; readonly actorPage: ActorPageSettings | null }) {
  const name = profileAnswerText(profile, "NAME") || "배우";
  return (
    <section className="applicant-stage" aria-labelledby="applicant-stage-name">
      <StagePhoto profile={profile} />
      <div className="applicant-stage-body">
        <p className="applicant-stage-kicker">내 배우 페이지</p>
        <h2 id="applicant-stage-name" className="applicant-stage-name">{name}</h2>
        <p className="applicant-stage-meta">{profileSummary(profile).join(" · ")}</p>
        <CompletenessNudge profile={profile} />
        {actorPage && <PublicationPanel settings={actorPage} />}
        <div className="applicant-stage-actions">
          {actorPage && <PrimaryPageAction settings={actorPage} />}
          <Link href={applicantRoutes.profile} className="applicant-stage-button applicant-stage-button-ghost">프로필 수정</Link>
        </div>
      </div>
    </section>
  );
}

function StagePhoto({ profile }: { readonly profile: ApplicantProfileResponse }) {
  const photo = pageRepresentativePhoto(profile.photoLibrary) ?? representativePhoto(profile);
  if (!photo) return <span className="applicant-stage-photo applicant-stage-photo-empty"><DefaultProfileIcon className="h-14 w-14" /></span>;
  return <Image src={photo.url} alt="내 프로필 사진" width={360} height={450} unoptimized priority className="applicant-stage-photo" />;
}

function CompletenessNudge({ profile }: { readonly profile: ApplicantProfileResponse }) {
  const { filled, standardTotal } = profile.completeness;
  if (filled >= standardTotal) return null;
  return (
    <Link href={applicantRoutes.profile} className="applicant-stage-nudge">
      기본정보 <span className="num">{filled}/{standardTotal}</span> · 마저 채우면 지원서에 바로 써요 <SiteIcon name="next" size={14} />
    </Link>
  );
}

function PublicationPanel({ settings }: { readonly settings: ActorPageSettings }) {
  const status = actorPageStatus(settings);
  return (
    <div className="applicant-stage-publication" data-tone={status.tone}>
      <span className="applicant-stage-dot" aria-hidden="true" />
      <div>
        <strong>{status.label}</strong>
        <p>{status.detail}</p>
        {status.tone === "public" && settings.handle && <p className="applicant-stage-address">{actorPageAddress(settings.handle)}</p>}
      </div>
    </div>
  );
}

function PrimaryPageAction({ settings }: { readonly settings: ActorPageSettings }) {
  const status = actorPageStatus(settings);
  if (status.tone === "public" && settings.handle) {
    return (
      <a href={actorPageRoutes.detail(settings.handle)} target="_blank" rel="noopener noreferrer" className="applicant-stage-button">
        내 배우 페이지 보기 <SiteIcon name="next" size={16} /><span className="sr-only"> (새 창에서 열림)</span>
      </a>
    );
  }
  return <Link href={applicantRoutes.actorPageSettings} className="applicant-stage-button">{settingsActionLabel(settings)}</Link>;
}

function settingsActionLabel(settings: ActorPageSettings): string {
  if (settings.locked || settings.autoHiddenReason || settings.status === "PUBLIC") return "배우 페이지 설정";
  return "배우 페이지 공개하기";
}
