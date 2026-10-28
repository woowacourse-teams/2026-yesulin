"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { ConfirmDialog } from "@/components/shows/manage/confirm-dialog";
import { FieldSelect, PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import { MAX_PROFILE_CAREER_COUNT, profileCareerGenreLabel } from "@/features/applicants/career-genre";
import {
  addProfileImportPhoto,
  birthDateOf,
  closeProfileImport,
  getProfileImport,
  getProfileImportOverview,
  heightOf,
  importedCareers,
  isProfileImportReading,
  profileImportFileError,
  startProfileImport,
  type ImportedCareer,
  type ProfileImport,
  type ProfileImportFact,
  type ProfileImportOverview,
} from "@/features/applicants/profile-import";
import { ApplicantRequestError } from "@/features/applicants/request";
import type { ApplicantAnswerValue, CareerEntry, EducationInformation, EducationLevel } from "@/features/applicants/types";
import { errorMessage } from "@/features/auditions/use-audition-query";
import { MAX_ACTOR_PHOTO_COUNT } from "@/features/files/photo-policy";

type DraftValues = Readonly<Record<string, ApplicantAnswerValue>>;

const POLL_INTERVAL_MS = 3_000;

/**
 * 편집 화면의 'PDF로 채우기'. PDF 추출이 꺼진 환경에서는 버튼을 숨긴다. 고른 값만 입력란에 넣고 저장은 기존 '프로필 저장'으로
 * 한다. 창을 닫아도 서버는 계속 읽고, 결과는 지우기 전까지(최대 24시간) 다시 열어 볼 수 있다.
 */
export function ProfileImport({
  values,
  photoCount,
  onApply,
  onPhotoAdded,
}: {
  readonly values: DraftValues;
  readonly photoCount: number;
  readonly onApply: (updates: DraftValues, needsCareerInput: boolean) => void;
  readonly onPhotoAdded: () => Promise<void>;
}) {
  const titleId = useId();
  const [overview, setOverview] = useState<ProfileImportOverview | null | undefined>(undefined);
  const [current, setCurrent] = useState<ProfileImport | null>(null);
  const [open, setOpen] = useState(false);
  /** 같은 후보를 다시 넣으면 서버가 사진을 또 복사하므로, 창을 다시 열어도 넣은 후보를 기억한다. */
  const [addedPhotos, setAddedPhotos] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let active = true;
    getProfileImportOverview()
      .then((result) => {
        if (!active) return;
        setOverview(result);
        setCurrent(result?.current ?? null);
      })
      .catch((cause) => {
        console.error("[PDF로 채우기 상태 조회 실패]", cause);
        if (active) setOverview(null);
      });
    return () => { active = false; };
  }, []);

  /** 오늘 횟수와 남은 결과는 서버가 정하므로, 지우거나 올리기에 실패하면 다시 읽는다. */
  const reload = () => {
    getProfileImportOverview()
      .then((result) => {
        if (!result) return;
        setOverview(result);
        setCurrent(result.current);
      })
      .catch((cause) => console.error("[PDF로 채우기 상태 조회 실패]", cause));
  };

  const reading = current !== null && isProfileImportReading(current.status);
  const jobId = current?.jobId;
  const reloadAfterMissing = useEffectEvent(reload);
  /** 한 번 조회에 실패해도 다음 간격에 다시 읽는다. 결과가 지워졌으면(404) 상태를 다시 읽고 멈춘다. */
  useEffect(() => {
    if (!reading || !jobId) return;
    let active = true;
    let timer = 0;
    const poll = () => {
      timer = window.setTimeout(() => {
        getProfileImport(jobId)
          .then((next) => { if (active) setCurrent(next); })
          .catch((cause) => {
            console.error("[PDF로 채우기 상태 조회 실패]", cause);
            if (!active || !(cause instanceof ApplicantRequestError) || cause.status !== 404) return;
            active = false;
            reloadAfterMissing();
          })
          .finally(() => { if (active) poll(); });
      }, POLL_INTERVAL_MS);
    };
    poll();
    return () => { active = false; window.clearTimeout(timer); };
  }, [reading, jobId]);

  if (!overview) return null;
  const closed = () => {
    setAddedPhotos(new Set());
    setCurrent(null);
    reload();
  };

  return <>
    <SecondaryButton onClick={() => setOpen(true)} className="shrink-0">
      PDF로 채우기{reading ? <span className="ml-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">읽는 중</span> : null}
    </SecondaryButton>
    {open ? <ModalShell
      open
      onClose={() => setOpen(false)}
      labelledBy={titleId}
      placement="responsiveSheet"
      className="max-h-[92dvh] w-full overflow-y-auto break-keep rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] md:w-[min(680px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader id={titleId} title="PDF로 채우기" subtitle="PDF 프로필에서 읽은 값을 골라 입력란에 넣어요. 저장은 ‘프로필 저장’으로 해요." />
      <div className="px-5 py-5 md:px-6">
        {current
          ? <ImportProgress key={current.jobId} importJob={current} values={values} photoCount={photoCount} onClosed={closed} onApply={(updates, needsInput) => { onApply(updates, needsInput); setOpen(false); }} addedPhotos={addedPhotos} onPhotoAdded={async (fileKey) => { setAddedPhotos((added) => new Set(added).add(fileKey)); await onPhotoAdded(); }} />
          : <ImportStart usedToday={overview.usedToday} onStarted={setCurrent} onFailed={reload} />}
      </div>
      <div className="flex justify-end border-t border-border px-5 py-3 md:px-6">
        <TextButton onClick={() => setOpen(false)}>창 닫기</TextButton>
      </div>
    </ModalShell> : null}
  </>;
}

function ImportStart({ usedToday, onStarted, onFailed }: {
  readonly usedToday: boolean;
  readonly onStarted: (started: ProfileImport) => void;
  /** 업로드 주소를 받은 뒤 실패하면 서버에는 올리는 중인 결과가 남으므로 상태를 다시 읽는다. */
  readonly onFailed: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (usedToday) {
    return <p role="status" className="rounded-card border border-border bg-surface px-4 py-6 text-center text-sm leading-6">오늘은 이미 PDF로 채우기를 썼어요. 내일 다시 쓸 수 있어요.</p>;
  }

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const invalid = profileImportFileError(file);
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    setError("");
    try {
      onStarted(await startProfileImport(file));
    } catch (cause) {
      console.error("[PDF로 채우기 업로드 실패]", cause);
      setError(errorMessage(cause, "PDF를 올리지 못했어요. 잠시 후 다시 시도해 주세요."));
      onFailed();
    } finally {
      setBusy(false);
    }
  };

  return <div>
    <ul className="grid gap-1.5 text-sm leading-6 text-muted-strong">
      <li>· 이름, 생년월일, 키, 학력, 경력, 사진 후보를 읽어요. 확실하지 않은 값은 비워 둬요.</li>
      <li>· 하루에 한 번 쓸 수 있어요. 읽지 못했거나 제안할 값이 없으면 세지 않아요.</li>
      <li>· 올린 PDF와 읽은 내용은 결과를 지우면 삭제돼요. 남겨 둔 결과는 나온 뒤 24시간이 지나면 순서대로 정리해요.</li>
    </ul>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => void upload(event)} />
    <PrimaryButton onClick={() => inputRef.current?.click()} disabled={busy} className="mt-5 min-h-12 w-full">
      {busy ? "PDF 올리는 중…" : "PDF 선택"}
    </PrimaryButton>
    <p className="mt-2 text-xs text-muted">PDF · 25MB 이하</p>
    {error ? <p role="alert" className="mt-3 text-sm font-medium text-fail">{error}</p> : null}
  </div>;
}

function ImportProgress({
  importJob,
  values,
  photoCount,
  addedPhotos,
  onClosed,
  onApply,
  onPhotoAdded,
}: {
  readonly importJob: ProfileImport;
  readonly values: DraftValues;
  readonly photoCount: number;
  readonly addedPhotos: ReadonlySet<string>;
  readonly onClosed: () => void;
  readonly onApply: (updates: DraftValues, needsCareerInput: boolean) => void;
  readonly onPhotoAdded: (fileKey: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reading = isProfileImportReading(importJob.status);

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await closeProfileImport(importJob.jobId);
      setConfirming(false);
      onClosed();
    } catch (cause) {
      console.error("[PDF로 채우기 결과 지우기 실패]", cause);
      setConfirming(false);
      setError(errorMessage(cause, "결과를 지우지 못했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setBusy(false);
    }
  };

  return <div>
    <p className="truncate text-sm font-semibold">{importJob.originalFilename}</p>
    {reading ? (
      <p role="status" className="mt-3 rounded-card border border-border bg-surface px-4 py-6 text-center text-sm leading-6">
        {importJob.status === "UPLOADING"
          ? "PDF를 올리고 있어요. 올리기가 끊겼다면 10분쯤 뒤 결과를 지우고 다시 올려 주세요."
          : importJob.status === "DELAYED"
            ? "평소보다 오래 걸리고 있어요. 창을 닫아도 계속 읽어요."
            : "PDF를 읽고 있어요. 보통 1분 안에 끝나요. 창을 닫아도 계속 읽어요."}
      </p>
    ) : null}
    {importJob.status === "UPLOAD_EXPIRED" ? <Notice>PDF 업로드를 마치지 못했어요. 결과를 지우고 다시 올려 주세요.</Notice> : null}
    {importJob.status === "FAILED" ? <Notice>PDF에서 글자를 읽지 못했어요. 스캔한 이미지로 만든 PDF는 읽지 못할 수 있어요. 오늘 횟수에는 세지 않아요.</Notice> : null}
    {importJob.proposals && importJob.status !== "FAILED"
      ? <ImportSuggestions importJob={importJob} values={values} photoCount={photoCount} addedPhotos={addedPhotos} onApply={onApply} onPhotoAdded={onPhotoAdded} />
      : null}
    {!reading ? (
      <div className="mt-6 border-t border-border-soft pt-4">
      <p className="text-xs leading-5 text-muted">결과는 {formatDeletesAt(importJob.deletesAt)}부터 순서대로 정리해요. 다 썼으면 지금 지울 수 있어요.</p>
        <SecondaryButton onClick={() => setConfirming(true)} disabled={busy} className="mt-2">결과 지우기</SecondaryButton>
      </div>
    ) : null}
    {error ? <p role="alert" className="mt-3 text-sm font-medium text-fail">{error}</p> : null}
    {confirming ? (
      <ConfirmDialog
        title="결과를 지울까요?"
        description="올린 PDF와 읽은 내용을 지금 지워요. 입력란에 넣은 값과 보관함에 넣은 사진은 그대로 남아요. 오늘 쓴 횟수는 돌아오지 않아요."
        confirmLabel="지우기"
        destructive
        busy={busy}
        onClose={() => setConfirming(false)}
        onConfirm={() => void remove()}
      />
    ) : null}
  </div>;
}

type Selection = {
  readonly name: boolean;
  readonly birth: boolean;
  readonly height: boolean;
  readonly educationLevel: Exclude<EducationLevel, "NONE"> | "";
  readonly careers: readonly boolean[];
};

const text = (value: ApplicantAnswerValue | undefined) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const EDUCATION_LABELS: Record<EducationLevel, string> = { NONE: "학력 없음", HIGH_SCHOOL: "고등학교 졸업", UNIVERSITY: "대학교 졸업" };

function educationText(value: ApplicantAnswerValue | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("school" in value)) return "";
  const education = value as EducationInformation;
  return [education.level ? EDUCATION_LABELS[education.level] : "", education.school.trim(), education.major.trim()].filter(Boolean).join(" · ");
}

/** 값이 비어 있는 항목은 미리 고르고, 이미 값이 있으면 바꿀지 배우가 직접 고르게 한다. */
function ImportSuggestions({
  importJob,
  values,
  photoCount,
  addedPhotos,
  onApply,
  onPhotoAdded,
}: {
  readonly importJob: ProfileImport;
  readonly values: DraftValues;
  readonly photoCount: number;
  readonly addedPhotos: ReadonlySet<string>;
  readonly onApply: (updates: DraftValues, needsCareerInput: boolean) => void;
  readonly onPhotoAdded: (fileKey: string) => Promise<void>;
}) {
  const proposals = importJob.proposals!;
  const currentCareers = Array.isArray(values.CAREER) ? values.CAREER as readonly CareerEntry[] : [];
  const careers = importedCareers(proposals.careers, currentCareers);
  const birth = proposals.birthDate ? birthDateOf(proposals.birthDate.value) : null;
  const height = proposals.height ? heightOf(proposals.height.value) : null;
  const [selection, setSelection] = useState<Selection>(() => ({
    name: Boolean(proposals.name) && !text(values.NAME),
    birth: Boolean(birth) && !text(values.BIRTH),
    height: Boolean(height) && !text(values.HEIGHT),
    educationLevel: "",
    careers: careers.map((career) => !career.duplicate && !career.similar),
  }));
  const select = (update: Partial<Selection>) => setSelection((currentSelection) => ({ ...currentSelection, ...update }));
  const chosenCareers = careers.filter((_, index) => selection.careers[index]);
  const careerOverflow = currentCareers.length + chosenCareers.length - MAX_PROFILE_CAREER_COUNT;
  const hasFacts = proposals.name || proposals.birthDate || proposals.height || proposals.education || proposals.age || careers.length;
  const anySelected = selection.name || selection.birth || selection.height || selection.educationLevel !== "" || chosenCareers.length > 0;

  const apply = () => {
    const updates: Record<string, ApplicantAnswerValue> = {};
    if (selection.name && proposals.name) updates.NAME = proposals.name.value.trim().slice(0, 100);
    if (selection.birth && birth) updates.BIRTH = birth;
    if (selection.height && height) updates.HEIGHT = height;
    if (selection.educationLevel && proposals.education) {
      updates.SCHOOL = { level: selection.educationLevel, school: proposals.education.value.trim().slice(0, 255), major: "" };
    }
    if (chosenCareers.length) updates.CAREER = [...currentCareers, ...chosenCareers.map((career) => career.entry)];
    onApply(updates, chosenCareers.some((career) => career.needsInput));
  };

  return <div className="mt-4 grid gap-6">
    {importJob.analysisStatus !== "COMPLETED" ? <Notice>이름·프로필 정보를 정리하지 못했어요. {proposals.photos.length ? "사진 후보만 보여요." : ""}</Notice> : null}
    {!hasFacts && !proposals.photos.length ? <Notice>PDF에서 제안할 값을 찾지 못했어요. 오늘 횟수에는 세지 않아요.</Notice> : null}

    {hasFacts ? <section aria-labelledby="profile-import-facts">
      <h3 id="profile-import-facts" className="font-bold">기본정보·학력</h3>
      <ul className="mt-3 divide-y divide-border-soft rounded-card border border-border">
        {proposals.name ? <FactRow label="이름" fact={proposals.name} current={text(values.NAME)} proposed={proposals.name.value.trim()} checked={selection.name} onChange={(checked) => select({ name: checked })} /> : null}
        {proposals.birthDate ? <FactRow label="생년월일" fact={proposals.birthDate} current={text(values.BIRTH)} proposed={birth} checked={selection.birth} onChange={(checked) => select({ birth: checked })} /> : null}
        {proposals.age && !birth ? <FactRow label="나이" fact={proposals.age} current="" proposed={null} note="나이는 생년월일 칸에 넣을 수 없어요. 생년월일을 직접 입력해 주세요." checked={false} onChange={() => {}} /> : null}
        {proposals.height ? <FactRow label="키" fact={proposals.height} current={text(values.HEIGHT) && `${text(values.HEIGHT)}cm`} proposed={height === null ? null : `${height}cm`} checked={selection.height} onChange={(checked) => select({ height: checked })} /> : null}
        {proposals.education ? <EducationRow fact={proposals.education} current={educationText(values.SCHOOL)} level={selection.educationLevel} onChange={(educationLevel) => select({ educationLevel })} /> : null}
      </ul>
    </section> : null}

    {careers.length ? <section aria-labelledby="profile-import-careers">
      <h3 id="profile-import-careers" className="font-bold">경력</h3>
      <p className="mt-1 text-sm leading-6 text-muted">기존 경력 뒤에 더해요. 연도는 네 자리로 적힌 것만, 장르는 정해진 이름과 같을 때만 넣어요.</p>
      <ul className="mt-3 divide-y divide-border-soft rounded-card border border-border">
        {careers.map((career, index) => <CareerRow key={`${career.entry.title}-${index}`} career={career} evidence={proposals.careers[index]!.evidence} checked={Boolean(selection.careers[index])} onChange={(checked) => select({ careers: selection.careers.map((value, candidate) => candidate === index ? checked : value) })} />)}
      </ul>
      {careerOverflow > 0 ? <p role="alert" className="mt-2 text-sm font-medium text-fail">경력은 {MAX_PROFILE_CAREER_COUNT}개까지예요. {careerOverflow}개를 빼 주세요.</p> : null}
    </section> : null}

    {proposals.photos.length ? <PhotoCandidates jobId={importJob.jobId} photos={proposals.photos} photoCount={photoCount} added={addedPhotos} onAdded={onPhotoAdded} /> : null}

    {hasFacts ? <div className="flex flex-wrap items-center gap-3">
      <PrimaryButton onClick={apply} disabled={!anySelected || careerOverflow > 0} className="min-h-12 px-5">고른 값 입력란에 넣기</PrimaryButton>
      <p className="min-w-0 flex-1 text-xs leading-5 text-muted">넣은 뒤 ‘프로필 저장’을 눌러야 저장돼요.</p>
    </div> : null}
  </div>;
}

function Evidence({ value }: { readonly value: string | null }) {
  return value ? <p className="mt-1 break-words text-xs leading-5 text-muted">근거: “{value}”</p> : null;
}

function FactRow({
  label,
  fact,
  current,
  proposed,
  note,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly fact: ProfileImportFact;
  /** 지금 입력란 값을 제안 값과 같은 형식으로 적은 것. 비어 있으면 빈 문자열이다. */
  readonly current: string;
  /** 입력란에 넣을 값. 형식을 읽지 못했으면 null이고 고를 수 없다. */
  readonly proposed: string | null;
  readonly note?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  const id = useId();
  const same = proposed !== null && current === proposed;
  return <li className="flex gap-3 px-4 py-3">
    <input id={id} type="checkbox" checked={checked} disabled={proposed === null || same} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-brand" />
    <label htmlFor={id} className="min-w-0 flex-1 text-sm">
      <span className="font-semibold">{label}</span> <span className="break-words">{proposed ?? fact.value}</span>
      {proposed === null ? <span className="mt-1 block text-xs text-fail">{note ?? "형식을 확실히 읽지 못했어요. 직접 입력해 주세요."}</span> : null}
      {same ? <span className="mt-1 block text-xs text-muted">지금 값과 같아요.</span> : null}
      {proposed !== null && !same && current ? <span className="mt-1 block text-xs text-muted-strong">지금 값 {current} 대신 넣어요.</span> : null}
      <Evidence value={fact.evidence} />
    </label>
  </li>;
}

function EducationRow({
  fact,
  current,
  level,
  onChange,
}: {
  readonly fact: ProfileImportFact;
  readonly current: string;
  readonly level: Selection["educationLevel"];
  readonly onChange: (level: Selection["educationLevel"]) => void;
}) {
  const id = useId();
  return <li className="px-4 py-3 text-sm">
    <p><span className="font-semibold">학력</span> <span className="break-words">{fact.value}</span></p>
    {current ? <p className="mt-1 text-xs text-muted-strong">지금 값 {current}</p> : null}
    <Evidence value={fact.evidence} />
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="text-xs text-muted-strong">최종 학력을 고르면 학교 칸에 원문을 넣어요</label>
      <FieldSelect id={id} value={level} onChange={(event) => onChange(event.target.value as Selection["educationLevel"])} className="min-h-10 w-auto">
        <option value="">넣지 않음</option>
        <option value="HIGH_SCHOOL">{EDUCATION_LABELS.HIGH_SCHOOL}</option>
        <option value="UNIVERSITY">{EDUCATION_LABELS.UNIVERSITY}</option>
      </FieldSelect>
    </div>
    {level ? <p className="mt-1 text-xs text-muted">학교 칸을 이 원문으로 바꾸고 전공 칸은 비워요. 필요하면 추가정보 탭에서 나눠 적어 주세요.</p> : null}
  </li>;
}

function CareerRow({
  career,
  evidence,
  checked,
  onChange,
}: {
  readonly career: ImportedCareer;
  readonly evidence: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  const id = useId();
  const { entry } = career;
  return <li className="flex gap-3 px-4 py-3">
    <input id={id} type="checkbox" checked={checked} disabled={career.duplicate} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-brand" />
    <label htmlFor={id} className="min-w-0 flex-1 text-sm">
      <span className="num text-muted">{entry.year || "연도 ?"}</span>{" "}
      <span className="font-semibold">{entry.title}</span>{" "}
      <span className="text-muted-strong">{entry.part ? `${entry.part} 역` : "배역 ?"}</span>{" "}
      <span className="text-xs text-muted">· {profileCareerGenreLabel(entry.genre)}</span>
      {career.duplicate ? <span className="mt-1 block text-xs text-muted">이미 있는 경력이에요.</span> : null}
      {career.similar ? <span className="mt-1 block text-xs text-muted-strong">같은 작품 경력이 이미 있어요. 다른 경력이면 골라 주세요.</span> : null}
      {!career.duplicate && career.needsInput ? <span className="mt-1 block text-xs text-fail">넣은 뒤 빈 연도·배역을 채워야 저장돼요.</span> : null}
      <Evidence value={evidence} />
    </label>
  </li>;
}

function PhotoCandidates({
  jobId,
  photos,
  photoCount,
  added,
  onAdded,
}: {
  readonly jobId: string;
  readonly photos: readonly { readonly fileKey: string; readonly url: string }[];
  readonly photoCount: number;
  readonly added: ReadonlySet<string>;
  readonly onAdded: (fileKey: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState("");
  const full = photoCount >= MAX_ACTOR_PHOTO_COUNT;

  const add = async (fileKey: string) => {
    setAdding(fileKey);
    setError("");
    try {
      await addProfileImportPhoto(jobId, fileKey);
      await onAdded(fileKey);
    } catch (cause) {
      console.error("[PDF 사진 후보 추가 실패]", cause);
      setError(errorMessage(cause, "사진을 보관함에 넣지 못했어요."));
    } finally {
      setAdding(null);
    }
  };

  return <section aria-labelledby="profile-import-photos">
    <h3 id="profile-import-photos" className="font-bold">사진 후보</h3>
    <p className="mt-1 text-sm leading-6 text-muted">
      {full ? `사진 보관함이 가득 찼어요(${MAX_ACTOR_PHOTO_COUNT}장). 보관함에서 사진을 지운 뒤 넣을 수 있어요.` : "보관함에 넣으면 바로 저장돼요. 로고나 다른 그림이 섞여 있을 수 있어요."}
    </p>
    <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo, index) => <li key={photo.fileKey} className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="relative aspect-[3/4]"><Image src={photo.url} alt={`사진 후보 ${index + 1}`} fill unoptimized sizes="(min-width: 640px) 200px, 45vw" className="object-contain" /></div>
        <div className="p-2">
          <SecondaryButton onClick={() => void add(photo.fileKey)} disabled={full || added.has(photo.fileKey) || adding !== null} className="min-h-10 w-full text-xs">
            {added.has(photo.fileKey) ? "넣었어요" : adding === photo.fileKey ? "넣는 중…" : "보관함에 넣기"}
          </SecondaryButton>
        </div>
      </li>)}
    </ul>
    {error ? <p role="alert" className="mt-2 text-sm font-medium text-fail">{error}</p> : null}
  </section>;
}

function Notice({ children }: { readonly children: ReactNode }) {
  return <p role="status" className="mt-3 rounded-control border border-warn/30 bg-warn-bg px-4 py-3 text-sm leading-6">{children}</p>;
}

const DELETES_AT_FORMAT = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" });

function formatDeletesAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "24시간 뒤" : DELETES_AT_FORMAT.format(date);
}
