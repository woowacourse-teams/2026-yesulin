import Image from "next/image";
import Link from "next/link";
import { DefaultProfileIcon } from "@/components/ui/default-profile-icon";
import { SiteIcon } from "@/components/ui/site-icon";
import { applicantRoutes } from "@/features/applicants/routes";
import type { ApplicantProfileResponse } from "@/features/applicants/types";

export function profileAnswerText(profile: ApplicantProfileResponse, key: string) {
  const value = profile.answers.find((answer) => answer.key === key)?.value;
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function ApplicantProfileOverview({ profile }: { readonly profile: ApplicantProfileResponse }) {
  const photo = profile.photoLibrary.find((item) => item.representative) ?? profile.photoLibrary[0];
  const name = profileAnswerText(profile, "NAME") || "배우";
  const birth = profileAnswerText(profile, "BIRTH");
  const height = profileAnswerText(profile, "HEIGHT");
  const gender = profileAnswerText(profile, "GENDER");
  const percent = Math.min(100, Math.max(0, Math.round(profile.completeness.filled / Math.max(1, profile.completeness.standardTotal) * 100)));
  return <div className="applicant-overview">
    <section className="workspace-panel" aria-labelledby="applicant-profile-title">
      <div className="applicant-identity">
        {photo
          ? <Image src={photo.url} alt="내 프로필 사진" width={116} height={148} unoptimized className="applicant-portrait" />
          : <span className="applicant-portrait applicant-portrait-empty"><DefaultProfileIcon className="h-12 w-12" /></span>}
        <div className="min-w-0">
          <p className="workspace-eyebrow" id="applicant-profile-title">내 프로필</p>
          <h2 className="applicant-identity-name">{name}</h2>
          <p className="workspace-caption mt-1">배우 프로필</p>
          <div className="applicant-identity-meta">
            {/^\d{4}/.test(birth) ? <span>{birth.slice(0, 4)}년생</span> : null}
            {gender ? <span>{gender}</span> : null}
            {height ? <span>{height}cm</span> : null}
          </div>
          <Link href={applicantRoutes.profile} className="workspace-text-link">프로필 관리 <SiteIcon name="next" size={16} /></Link>
        </div>
      </div>
      <div className="applicant-completeness">
        <div><span>필수 기본정보</span><strong className="num">{profile.completeness.filled} / {profile.completeness.standardTotal}개</strong></div>
        <div className="workspace-progress" role="progressbar" aria-label="필수 기본정보 작성률" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: percent + "%" }} /></div>
        <p className="workspace-caption">기본정보를 채워두면 다음 지원서에 활용할 수 있어요.</p>
      </div>
    </section>
    <section className="workspace-panel applicant-library" aria-labelledby="applicant-library-title">
      <div className="workspace-panel-heading"><h2 id="applicant-library-title">프로필 보관함</h2><Link href={applicantRoutes.profile} className="workspace-text-link">관리하기</Link></div>
      <div className="applicant-library-row"><span className="applicant-library-icon"><SiteIcon name="image" /></span><div><h3>사진</h3><p>프로필 · 전신 · 연기 사진</p></div><strong className="num">{profile.photoLibrary.length}<small>장</small></strong></div>
      <div className="applicant-library-row"><span className="applicant-library-icon"><SiteIcon name="video" /></span><div><h3>영상</h3><p>YouTube 영상 링크</p></div><strong className="num">{profile.videoLibrary.length}<small>개</small></strong></div>
      <div className="workspace-note"><SiteIcon name="about" size={17} /><p>프로필을 수정해도 이미 제출한 지원서의 내용은 바뀌지 않아요.</p></div>
    </section>
  </div>;
}
