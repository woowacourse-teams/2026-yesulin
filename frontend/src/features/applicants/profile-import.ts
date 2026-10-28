import { putPdf } from "@/features/pdf-extractions/api";
import type { PreparedPdfUpload } from "@/features/pdf-extractions/types";
import { PROFILE_CAREER_GENRES, type ProfileCareerGenre } from "./career-genre";
import { careerIdentity } from "./career-identity";
import { ApplicantRequestError, applicantRequest } from "./request";
import type { CareerEntry } from "./types";

export type ProfileImportStatus = "UPLOADING" | "UPLOAD_EXPIRED" | "QUEUED" | "DELAYED" | "COMPLETED" | "PARTIAL" | "FAILED";

/** 원문에서 옮겨 적은 값과 그 근거 구절. 날짜·단위를 바꾸지 않은 원문 그대로다. */
export type ProfileImportFact = { readonly value: string; readonly evidence: string | null };

export type ProfileImportCareer = {
  readonly title: string;
  readonly part: string | null;
  readonly genre: string | null;
  readonly period: string | null;
  readonly venue: string | null;
  readonly company: string | null;
  readonly evidence: string;
};

export type ProfileImportProposals = {
  readonly name: ProfileImportFact | null;
  readonly birthDate: ProfileImportFact | null;
  readonly age: ProfileImportFact | null;
  readonly height: ProfileImportFact | null;
  readonly education: ProfileImportFact | null;
  readonly careers: readonly ProfileImportCareer[];
  /** 사진일 가능성이 높은 이미지. url은 잠시 동안만 쓸 수 있다. */
  readonly photos: readonly { readonly fileKey: string; readonly url: string }[];
};

export type ProfileImport = {
  readonly jobId: string;
  readonly status: ProfileImportStatus;
  readonly originalFilename: string;
  readonly createdAt: string;
  /** 이 시각이 지나면 원본 PDF와 추출 결과를 지운다. */
  readonly deletesAt: string;
  /** 이름·프로필 정리 결과. 결과 전이면 null이다. */
  readonly analysisStatus: "COMPLETED" | "FAILED" | "SKIPPED" | null;
  readonly analysisReason: string | null;
  readonly proposals: ProfileImportProposals | null;
};

export type ProfileImportOverview = {
  /** 오늘(한국 날짜) 제안 값이 나온 가져오기를 이미 했는지. 실패·빈 결과는 세지 않는다. */
  readonly usedToday: boolean;
  readonly current: ProfileImport | null;
};

export const MAX_PROFILE_IMPORT_BYTES = 25 * 1024 * 1024;
const BASE_PATH = "/v1/applicants/me/profile-imports";

/** PDF 추출이 꺼진 환경은 API가 없어 404다. 그때는 null이고 화면이 버튼을 숨긴다. */
export async function getProfileImportOverview(): Promise<ProfileImportOverview | null> {
  try {
    return await applicantRequest<ProfileImportOverview>(BASE_PATH);
  } catch (cause) {
    if (cause instanceof ApplicantRequestError && cause.status === 404) return null;
    throw cause;
  }
}

/** 업로드 주소를 받아 PDF를 저장소에 바로 올리고 업로드를 확인한다. 읽는 일은 서버가 따로 한다. */
export async function startProfileImport(file: File): Promise<ProfileImport> {
  const prepared = await applicantRequest<{ readonly jobId: string; readonly upload: PreparedPdfUpload["upload"] }>(
    `${BASE_PATH}/uploads`,
    { method: "POST", body: JSON.stringify({ originalFilename: file.name, size: file.size }) },
  );
  await putPdf(file, prepared.upload);
  return applicantRequest<ProfileImport>(`${BASE_PATH}/${encodeURIComponent(prepared.jobId)}/completion`, { method: "POST" });
}

export const getProfileImport = (jobId: string) =>
  applicantRequest<ProfileImport>(`${BASE_PATH}/${encodeURIComponent(jobId)}`);

/** 사진 후보를 새 배우 사진으로 복사해 보관함 맨 뒤에 넣는다. 보관함은 따로 다시 읽는다. */
export const addProfileImportPhoto = (jobId: string, fileKey: string) =>
  applicantRequest<unknown>(`${BASE_PATH}/${encodeURIComponent(jobId)}/photos`, {
    method: "POST",
    body: JSON.stringify({ fileKey }),
  });

/** 원본 PDF와 추출 결과를 바로 지운다. */
export const closeProfileImport = (jobId: string) =>
  applicantRequest<void>(`${BASE_PATH}/${encodeURIComponent(jobId)}`, { method: "DELETE" });

export function isProfileImportReading(status: ProfileImportStatus): boolean {
  return status === "UPLOADING" || status === "QUEUED" || status === "DELAYED";
}

export function profileImportFileError(file: File): string | null {
  const pdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!pdf) return "PDF 파일만 올릴 수 있어요.";
  return file.size > MAX_PROFILE_IMPORT_BYTES ? "PDF는 25MB 이하만 올릴 수 있어요." : null;
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * `1998.07.04`, `1998-7-4`, `1998년 7월 4일`처럼 연·월·일이 모두 있을 때만 입력란 형식(`YYYY-MM-DD`)으로 바꾼다.
 * 두 자리 연도, 없는 날짜, 미래 날짜는 읽지 않는다.
 */
export function birthDateOf(value: string, today = new Date()): string | null {
  const match = value.match(/(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || date.getTime() > today.getTime()) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** `165cm`, `165`처럼 정수 센티미터만 읽는다. 소수나 다른 단위는 읽지 않는다. */
export function heightOf(value: string): number | null {
  const match = value.trim().match(/^(\d{2,3})\s*(?:cm|㎝|센티미터|센티)?$/i);
  if (!match) return null;
  const height = Number(match[1]);
  return height >= 50 && height <= 250 ? height : null;
}

/**
 * 기간에 적힌 네 자리 연도가 하나뿐일 때만 그 연도를 쓴다. `25.08 ~ 12`처럼 두 자리 연도이거나 서로 다른 연도가 여럿이면
 * 확실히 읽을 수 없으므로 비운다.
 */
export function careerYearOf(period: string | null, today = new Date()): number | null {
  if (!period) return null;
  const years = new Set([...period.matchAll(/(?<!\d)(\d{4})(?!\d)/g)].map((match) => Number(match[1])));
  if (years.size !== 1) return null;
  const [year] = years;
  return year! >= 1950 && year! <= today.getFullYear() + 1 ? year! : null;
}

/** 정해 둔 장르 이름과 정확히 같을 때만 장르로 쓴다. 그 밖은 미분류다. */
export function careerGenreOf(value: string | null): ProfileCareerGenre | null {
  const label = value?.trim();
  return PROFILE_CAREER_GENRES.find((genre) => genre.label === label)?.value ?? null;
}

export type ImportedCareer = {
  readonly entry: CareerEntry;
  /** 연도나 배역을 읽지 못해 저장하기 전에 직접 채워야 한다. */
  readonly needsInput: boolean;
  /** 이미 프로필에 같은 연도·작품·배역이 있다. */
  readonly duplicate: boolean;
  /** 연도나 배역을 읽지 못했는데 같은 작품 경력이 이미 있다. 같은 경력일 수 있어 미리 고르지 않는다. */
  readonly similar: boolean;
};

/** 경력 제안을 입력란 경력으로 바꾼다. 읽지 못한 연도는 0(빈칸), 배역은 빈 문자열로 둔다. */
export function importedCareers(careers: readonly ProfileImportCareer[], current: readonly CareerEntry[], today = new Date()) {
  const existing = new Set(current.map(careerIdentity));
  const titles = new Set(current.map((career) => career.title.trim()));
  return careers.map((career): ImportedCareer => {
    const year = careerYearOf(career.period, today);
    const entry: CareerEntry = { year: year ?? 0, title: career.title.trim(), part: career.part?.trim() ?? "", genre: careerGenreOf(career.genre) };
    const needsInput = year === null || !entry.part;
    const duplicate = year !== null && existing.has(careerIdentity(entry));
    return { entry, needsInput, duplicate, similar: !duplicate && needsInput && titles.has(entry.title) };
  });
}
