import { delay, http, HttpResponse } from "msw";
import type { ProfileImport, ProfileImportProposals, ProfileImportStatus } from "@/features/applicants/profile-import";
import { MAX_PROFILE_IMPORT_BYTES } from "@/features/applicants/profile-import";
import { addApplicantLibraryPhoto } from "./store";

/**
 * 배우 'PDF로 채우기' 목. 서버처럼 올리기 → 확인 → 읽는 중 → 결과 순서로 움직이고, 확인 뒤 몇 초가 지나면 정해 둔 결과를 준다.
 * 시작 상태는 `?mockProfileImport=used|failed|result`로 고른다.
 */
const BASE = "/api/v1/applicants/me/profile-imports";
const READ_DELAY_MS = 3_500;
const KEEP_FOR_MS = 24 * 60 * 60 * 1000;

type MockImport = {
  readonly jobId: string;
  readonly originalFilename: string;
  readonly createdAt: string;
  uploaded: boolean;
  /** 확인한 뒤 결과가 나오는 시각. 확인 전이면 null이다. */
  readyAt: number | null;
  readonly outcome: "COMPLETED" | "FAILED";
};

const PROPOSALS: ProfileImportProposals = {
  name: { value: "김하린", evidence: "배우 김하린 Kim Harin" },
  birthDate: { value: "1999.04.18", evidence: "생년월일 1999.04.18" },
  age: { value: "만 27세", evidence: "만 27세" },
  height: { value: "167cm", evidence: "167cm / 52kg" },
  education: { value: "한국예술종합학교 연극원 연기과 졸업", evidence: "학력 한국예술종합학교 연극원 연기과 졸업" },
  careers: [
    { title: "갈매기", part: "니나", genre: "연극", period: "2024.05 ~ 06", venue: "대학로 예술극장", company: null, evidence: "2024.05 ~ 06 연극 <갈매기> 니나 역 / 대학로 예술극장" },
    { title: "빨래", part: null, genre: "뮤지컬", period: "23.03 ~ 04", venue: null, company: "극단 바람", evidence: "23.03 ~ 04 뮤지컬 <빨래> 앙상블 / 극단 바람" },
    { title: "푸른 방", part: "윤서", genre: "연극", period: "2025", venue: null, company: null, evidence: "2025 연극 <푸른 방> 윤서 역" },
    { title: "여름의 끝", part: "수진", genre: "단편영화", period: "2022", venue: null, company: null, evidence: "2022 단편영화 <여름의 끝> 수진 역" },
  ],
  photos: [
    { fileKey: "mock-profile-import/page-1-image-1.jpg", url: "/images/applicants/kim-harin-extra-1.jpg" },
    { fileKey: "mock-profile-import/page-2-image-1.jpg", url: "/images/applicants/kim-harin-extra-2.jpg" },
  ],
};

let current: MockImport | null = null;
let usedToday = false;
let nextJob = 1;
let nextPhoto = 1;
let appliedSeed: string | null = null;

const apiError = (status: number, code: string, message: string) => HttpResponse.json({ code, message }, { status });
const notFound = () => apiError(404, "PROFILE_IMPORT_NOT_FOUND", "PDF로 채우기 결과를 찾을 수 없습니다.");

function newImport(originalFilename: string, outcome: MockImport["outcome"], readyAt: number | null): MockImport {
  const jobId = `mock-profile-import-${nextJob}`;
  nextJob += 1;
  return { jobId, originalFilename, createdAt: new Date().toISOString(), uploaded: readyAt !== null, readyAt, outcome };
}

/** 주소에서 온 값이라 정해 둔 이름만 받는다. */
function applySeed() {
  const seed = new URLSearchParams(globalThis.location?.search ?? "").get("mockProfileImport");
  if (!seed || seed === appliedSeed) return;
  switch (seed) {
    case "used":
      current = null;
      usedToday = true;
      break;
    case "failed":
      current = newImport("김하린_스캔본.pdf", "FAILED", Date.now());
      usedToday = false;
      break;
    case "result":
      current = newImport("김하린_프로필.pdf", "COMPLETED", Date.now());
      usedToday = true;
      break;
    default:
      return;
  }
  appliedSeed = seed;
}

function status(job: MockImport): ProfileImportStatus {
  if (!job.uploaded || job.readyAt === null) return "UPLOADING";
  return Date.now() < job.readyAt ? "QUEUED" : job.outcome;
}

/** 결과가 처음 보일 때 서버처럼 제안 값이 있는 결과만 오늘 횟수로 센다. */
function view(job: MockImport): ProfileImport {
  const jobStatus = status(job);
  const finished = jobStatus === "COMPLETED" || jobStatus === "FAILED";
  if (jobStatus === "COMPLETED") usedToday = true;
  const finishedAt = job.readyAt === null ? Date.parse(job.createdAt) : job.readyAt;
  return {
    jobId: job.jobId,
    status: jobStatus,
    originalFilename: job.originalFilename,
    createdAt: job.createdAt,
    deletesAt: new Date((finished ? finishedAt : Date.parse(job.createdAt)) + KEEP_FOR_MS).toISOString(),
    analysisStatus: jobStatus === "COMPLETED" ? "COMPLETED" : null,
    analysisReason: null,
    proposals: jobStatus === "COMPLETED" ? PROPOSALS : null,
  };
}

const owned = (jobId: unknown) => current !== null && current.jobId === String(jobId) ? current : null;
const reading = (job: MockImport) => status(job) === "UPLOADING" || status(job) === "QUEUED";

export const profileImportHandlers = [
  http.get(BASE, async () => {
    applySeed();
    await delay(160);
    const job = current ? view(current) : null;
    return HttpResponse.json({ usedToday, current: job });
  }),

  http.post(`${BASE}/uploads`, async ({ request }) => {
    applySeed();
    await delay(200);
    const body = (await request.json()) as { originalFilename?: string; size?: number };
    if (current && reading(current)) return apiError(409, "PROFILE_IMPORT_IN_PROGRESS", "PDF를 읽고 있어요. 끝난 뒤 다시 시도해 주세요.");
    if (usedToday) return apiError(409, "PROFILE_IMPORT_DAILY_LIMIT", "PDF로 채우기는 하루에 한 번 쓸 수 있습니다. 내일 다시 시도해 주세요.");
    if (!body.originalFilename?.toLowerCase().endsWith(".pdf")) return apiError(400, "INVALID_PDF", "PDF 파일만 올릴 수 있습니다.");
    if (!body.size || body.size > MAX_PROFILE_IMPORT_BYTES) return apiError(400, "INVALID_PDF", "PDF는 25MB 이하만 올릴 수 있습니다.");
    current = newImport(body.originalFilename, "COMPLETED", null);
    return HttpResponse.json({
      jobId: current.jobId,
      upload: { url: `/mock-uploads/profile-imports/${current.jobId}`, method: "PUT", expiresAt: new Date(Date.now() + 600_000).toISOString(), headers: {} },
    }, { status: 201 });
  }),

  http.put("/mock-uploads/profile-imports/:jobId", async ({ params }) => {
    await delay(400);
    const job = owned(params.jobId);
    if (job) job.uploaded = true;
    return new HttpResponse(null, { status: job ? 200 : 404 });
  }),

  http.post(`${BASE}/:jobId/completion`, async ({ params }) => {
    await delay(180);
    const job = owned(params.jobId);
    if (!job) return notFound();
    if (!job.uploaded) return apiError(409, "PDF_UPLOAD_NOT_READY", "PDF 업로드가 아직 끝나지 않았습니다.");
    job.readyAt ??= Date.now() + READ_DELAY_MS;
    return HttpResponse.json(view(job));
  }),

  http.get(`${BASE}/:jobId`, async ({ params }) => {
    applySeed();
    await delay(140);
    const job = owned(params.jobId);
    return job ? HttpResponse.json(view(job)) : notFound();
  }),

  http.post(`${BASE}/:jobId/photos`, async ({ params, request }) => {
    await delay(320);
    const job = owned(params.jobId);
    if (!job) return notFound();
    if (status(job) !== "COMPLETED") return apiError(409, "PROFILE_IMPORT_NOT_FINISHED", "PDF를 다 읽은 뒤 사진을 넣을 수 있습니다.");
    const { fileKey } = (await request.json()) as { fileKey?: string };
    const candidate = PROPOSALS.photos.find((photo) => photo.fileKey === fileKey);
    if (!candidate) return apiError(404, "PROFILE_IMPORT_PHOTO_NOT_FOUND", "사진 후보를 찾을 수 없습니다.");
    const id = `profile-import-photo-${nextPhoto}`;
    nextPhoto += 1;
    const added = addApplicantLibraryPhoto({ id, name: "pdf-profile-photo.png", url: candidate.url });
    if (!added) return apiError(409, "PHOTO_LIBRARY_LIMIT_EXCEEDED", "사진보관함에는 사진을 최대 3장까지 저장할 수 있습니다.");
    return HttpResponse.json({
      id, fileId: 0, imageUrl: added.url, displayOrder: 0, representative: added.representative,
      createdAt: new Date().toISOString(), visibility: "PRIVATE", publicCopyUrl: null,
    }, { status: 201 });
  }),

  http.delete(`${BASE}/:jobId`, async ({ params }) => {
    await delay(200);
    const job = owned(params.jobId);
    if (!job) return new HttpResponse(null, { status: 204 });
    if (reading(job)) return apiError(409, "PROFILE_IMPORT_IN_PROGRESS", "PDF를 읽고 있어 지금은 닫을 수 없습니다. 끝난 뒤 닫아 주세요.");
    current = null;
    return new HttpResponse(null, { status: 204 });
  }),
];
