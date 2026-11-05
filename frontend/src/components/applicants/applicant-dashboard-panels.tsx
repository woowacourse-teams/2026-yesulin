import Image from "next/image";
import Link from "next/link";
import { SiteIcon } from "@/components/ui/site-icon";
import { formatApplicantDate } from "@/features/applicants/presentation";
import { applicantRoutes } from "@/features/applicants/routes";
import type { ApplicantProfileResponse, ApplicantSubmissionSummary } from "@/features/applicants/types";

const PHOTO_PREVIEW_LIMIT = 5;

/** 사진·영상 보관함. 편집은 내 프로필에서 한다. */
export function LibraryPanel({ profile }: { readonly profile: ApplicantProfileResponse }) {
  return (
    <div className="applicant-library-panel">
      <h3>사진 <span className="num">{profile.photoLibrary.length}</span></h3>
      <ul className="applicant-photo-grid">
        {profile.photoLibrary.slice(0, PHOTO_PREVIEW_LIMIT).map((photo, index) => (
          <li key={photo.id}><Image src={photo.url} alt={`보관함 사진 ${index + 1}`} fill unoptimized sizes="(max-width: 760px) 33vw, 180px" /></li>
        ))}
        <li><Link href={applicantRoutes.profile} className="applicant-library-add"><SiteIcon name="plus" size={20} />사진 관리</Link></li>
      </ul>
      <h3>영상 <span className="num">{profile.videoLibrary.length}</span></h3>
      <VideoSummary count={profile.videoLibrary.length} />
      <p className="workspace-caption">프로필을 수정해도 이미 제출한 지원서의 내용은 바뀌지 않아요.</p>
    </div>
  );
}

function VideoSummary({ count }: { readonly count: number }) {
  if (count > 0) return <Link href={applicantRoutes.profile} className="workspace-text-link">영상 관리 <SiteIcon name="next" size={16} /></Link>;
  return (
    <Link href={applicantRoutes.profile} className="applicant-video-empty">
      <SiteIcon name="plus" size={22} />
      <strong>연기 영상 추가</strong>
      <span>YouTube 링크 하나면 돼요. 영상이 있으면 공연사가 나를 더 잘 알 수 있어요.</span>
    </Link>
  );
}

/** 최근 지원서. 목록을 읽지 못했으면 null을 받아 다시 확인하도록 안내한다. */
export function SubmissionsPanel({ submissions }: { readonly submissions: readonly ApplicantSubmissionSummary[] | null }) {
  return (
    <div className="applicant-submissions-panel">
      <SubmissionCards submissions={submissions} />
      <div className="applicant-submissions-footer">
        <p className="workspace-caption">지원 결과와 후속 일정은 각 공연사의 안내를 확인해주세요.</p>
        <Link href={applicantRoutes.submissions} className="workspace-text-link">전체 보기 <SiteIcon name="next" size={16} /></Link>
      </div>
    </div>
  );
}

function SubmissionCards({ submissions }: { readonly submissions: readonly ApplicantSubmissionSummary[] | null }) {
  if (submissions === null) return <DashboardEmpty title="지원서를 불러오지 못했어요" detail="잠시 후 새로고침하면 다시 확인할 수 있어요." />;
  if (!submissions.length) return <DashboardEmpty title="아직 제출한 지원서가 없어요" detail="외부 공고의 예술in 지원 링크에서 지원서를 작성하면 여기에 모아 볼 수 있어요." />;
  return <ul className="applicant-submission-cards">{submissions.slice(0, 4).map((submission) => <SubmissionCard key={submission.id} submission={submission} />)}</ul>;
}

function SubmissionCard({ submission }: { readonly submission: ApplicantSubmissionSummary }) {
  const roles = submission.selectedRoles.map((role) => role.roleName).join(" · ");
  return (
    <li>
      <Link href={applicantRoutes.submission(submission.id)} className="applicant-submission-card">
        <span className="applicant-submission-poster"><Image src={submission.posterUrl} alt="" fill unoptimized sizes="(max-width: 760px) 50vw, 200px" /></span>
        <strong>{submission.performanceTitle}</strong>
        <span>{roles || submission.postingTitle}</span>
        <small><span className="num">{formatApplicantDate(submission.submittedAt)}</span> · 제출 완료</small>
      </Link>
    </li>
  );
}

export function DashboardEmpty({ title, detail }: { readonly title: string; readonly detail: string }) {
  return <div className="rounded-card border border-dashed border-border bg-surface px-5 py-8 text-center"><strong>{title}</strong><p className="mt-2 text-sm leading-6 text-muted">{detail}</p></div>;
}
