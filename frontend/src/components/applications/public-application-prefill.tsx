"use client";

import { useState } from "react";
import { getProfilePrefill } from "@/features/applicants/api";
import type { ProfilePrefillResponse } from "@/features/applicants/types";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import type { PostingId } from "@/features/auditions/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { PublicApplicationForm } from "./public-application-form";

type PrefillGateProps = {
  readonly postingId: PostingId;
  readonly fields: readonly ApplicationFieldInput[];
  readonly performanceTitle: string;
  readonly postingTitle: string;
  readonly companyName: string;
  readonly roleIds: readonly string[];
  readonly roleName: string;
  readonly onBack: () => void;
};

export function PublicApplicationPrefillGate(props: PrefillGateProps) {
  const query = useAuditionQuery(`application-prefill-${props.postingId}`, () => getProfilePrefill(props.postingId), "저장한 프로필을 불러오지 못했습니다.");
  const [continueEmpty, setContinueEmpty] = useState(false);
  if (continueEmpty) return <PublicApplicationForm {...props} />;
  if (query.loading) return <PrefillState title="저장한 프로필을 불러오고 있어요" detail="이 공고에서 다시 사용할 수 있는 답변을 확인하고 있습니다." />;
  if (query.error || !query.data) return <PrefillState title="프로필을 불러오지 못했어요" detail={query.error} actions={<><PrimaryButton onClick={query.reload}>다시 시도</PrimaryButton><SecondaryButton onClick={() => setContinueEmpty(true)}>빈 지원서로 계속</SecondaryButton></>} />;
  return <PublicApplicationForm {...props} prefill={query.data} />;
}

function PrefillState({ title, detail, actions }: { readonly title: string; readonly detail: string; readonly actions?: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-surface px-5"><section className="w-full max-w-lg rounded-modal border border-border bg-card px-6 py-12 text-center"><span aria-hidden="true" className="mx-auto block h-10 w-10 animate-pulse rounded-2xl bg-brand" /><h1 className="mt-5 text-xl font-bold">{title}</h1><p className="mt-2 text-sm leading-6 text-muted-strong">{detail}</p>{actions ? <div className="mt-6 flex justify-center gap-2">{actions}</div> : null}</section></main>;
}

export type ApplicationPrefill = ProfilePrefillResponse;
