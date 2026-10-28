import { delay, http, HttpResponse } from "msw";
import type { PublicActorPage, PublicActorPageSummary } from "@/features/actor-pages/types";
import { actorPageOwnerHandlers, actorPageSeedHandler, ownerPublicActorPage } from "./actor-page-owner-handlers";

/**
 * 배우 목록·배우 페이지 확인용 목. 고정 공개 페이지 14개(목록 2페이지)에, 목 배우가 편집 화면에서 공개하면 그 페이지를
 * 맨 앞에 더한다. 서버처럼 아이디는 대소문자를 가리지 않고 찾고, 비공개 페이지(`hidden.actor` 시나리오)와 없는 아이디는
 * 목록에 없으므로 같은 404로 답한다.
 */
const PHOTOS = [
  "/images/applicants/kim-harin-profile.png",
  "/images/applicants/kim-harin-full-body.png",
  "/images/applicants/kim-harin-acting-1.png",
] as const;

const FEATURED: PublicActorPage = {
  publicId: "00000000-0000-4000-8000-000000000001",
  handle: "min.zzun_",
  name: "김하린",
  gender: "FEMALE",
  birthYear: 2000,
  age: 25,
  height: 165,
  weight: null,
  representativePhotoUrl: PHOTOS[0],
  photos: PHOTOS.map((url) => ({ url })),
  videos: [{ url: "https://youtu.be/aqz-KE-bpKQ", youtubeId: "aqz-KE-bpKQ" }],
  careerGroups: [
    { genre: "THEATER", careers: [
      { year: 2025, title: "햄릿", roleName: "오필리아" },
      { year: 2023, title: "갈매기", roleName: "니나" },
    ] },
    { genre: "MUSICAL", careers: [{ year: 2024, title: "레미제라블", roleName: "코제트" }] },
    { genre: null, careers: [{ year: 2022, title: "졸업 공연", roleName: "주연" }] },
  ],
  coverLetter: "무대 위에서 오래 숨 쉬는 배우가 되고 싶어요.\n작은 역할도 끝까지 책임지는 배우 김하린입니다.",
  specialty: "탭댄스, 피아노",
  hobbies: "등산",
  nationality: "대한민국",
  education: { level: "UNIVERSITY", school: "예술대학교", major: "연기" },
  links: [{ url: "https://www.instagram.com/" }],
};

const NAMES = ["이도윤", "박서연", "최지호", "정하은", "강민준", "윤서아", "임도현", "한지우", "오시우", "서예린", "신준서", "권나은", "황지안"];

const OTHERS: PublicActorPage[] = NAMES.map((name, index) => ({
  publicId: `00000000-0000-4000-8000-${String(index + 2).padStart(12, "0")}`,
  handle: `actor${index + 2}`,
  name,
  gender: index % 2 === 0 ? "MALE" : "FEMALE",
  birthYear: 1990 + index,
  age: 35 - index,
  height: index % 3 === 0 ? null : 160 + index,
  weight: index % 4 === 0 ? 50 + index : null,
  representativePhotoUrl: index % 5 === 4 ? null : PHOTOS[index % PHOTOS.length],
  photos: index % 5 === 4 ? [] : [{ url: PHOTOS[index % PHOTOS.length] }],
  videos: [],
  careerGroups: [],
  coverLetter: null,
  specialty: null,
  hobbies: null,
  nationality: null,
  education: null,
  links: [],
}));

const fixed: readonly PublicActorPage[] = [FEATURED, ...OTHERS];

function listed(): readonly PublicActorPage[] {
  const owner = ownerPublicActorPage();
  return owner ? [owner, ...fixed] : fixed;
}

function toSummary(page: PublicActorPage): PublicActorPageSummary {
  const { publicId, handle, name, gender, birthYear, age, height, weight, representativePhotoUrl } = page;
  return { publicId, handle, name, gender, birthYear, age, height, weight, representativePhotoUrl };
}

const notFound = () => HttpResponse.json({ code: "ACTOR_PAGE_NOT_FOUND", message: "배우 페이지를 찾을 수 없습니다." }, { status: 404 });

/**
 * 목 공연사의 관심 배우. 저장한 최신순으로 두고, 목록에 없는 페이지(비공개가 된 배우)의 저장은 숨기되 한도에 센다.
 * 처음에는 공개 배우 2명과 비공개가 된 배우 1명을 저장해 둔다. `?mockActorBookmarks=full`은 한도(300명)를 채운다.
 */
const BOOKMARK_LIMIT = 300;
const HIDDEN_PUBLIC_ID = (index: number) => `00000000-0000-4000-9000-${String(index).padStart(12, "0")}`;
const seededBookmarks = () => [FEATURED.publicId, OTHERS[1]!.publicId, HIDDEN_PUBLIC_ID(1)];
let bookmarks: string[] = seededBookmarks();
let appliedBookmarkSeed: string | null = null;

/** 주소에서 온 값이라 정해 둔 이름만 받는다. */
function applyBookmarkSeed() {
  const seed = new URLSearchParams(globalThis.location?.search ?? "").get("mockActorBookmarks");
  if (seed !== "full" || seed === appliedBookmarkSeed) return;
  const visible = seededBookmarks().slice(0, 2);
  bookmarks = [...visible, ...Array.from({ length: BOOKMARK_LIMIT - visible.length }, (_, index) => HIDDEN_PUBLIC_ID(index + 1))];
  appliedBookmarkSeed = seed;
}

const BOOKMARKS = "/api/v1/producers/me/actor-bookmarks";

export const actorPageHandlers = [
  actorPageSeedHandler,

  http.get("/api/v1/public/actor-pages", async ({ request }) => {
    await delay(120);
    const params = new URL(request.url).searchParams;
    const page = Number(params.get("page") ?? 0);
    const size = Number(params.get("size") ?? 12);
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 48 || (params.get("sort") ?? "recent") !== "recent") {
      return HttpResponse.json({ code: "INVALID_REQUEST", message: "목록 조회 조건이 올바르지 않습니다." }, { status: 400 });
    }
    const pages = listed();
    return HttpResponse.json({
      actorPages: pages.slice(page * size, (page + 1) * size).map(toSummary),
      page,
      size,
      totalPages: Math.ceil(pages.length / size),
      totalElements: pages.length,
    });
  }),

  http.get("/api/v1/public/actor-pages/by-handle/:handle", async ({ params }) => {
    await delay(120);
    const handle = String(params.handle).toLowerCase();
    const actorPage = listed().find((candidate) => candidate.handle === handle);
    return actorPage ? HttpResponse.json(actorPage) : notFound();
  }),

  ...actorPageOwnerHandlers((handle) => handle === "hidden.actor" || fixed.some((candidate) => candidate.handle === handle)),

  http.get("/api/v1/producers/me/actor-bookmark-ids", async () => {
    await delay(100);
    applyBookmarkSeed();
    return HttpResponse.json({ publicIds: bookmarks });
  }),

  http.get(BOOKMARKS, async ({ request }) => {
    await delay(160);
    applyBookmarkSeed();
    const params = new URL(request.url).searchParams;
    const page = Number(params.get("page") ?? 0);
    const size = Number(params.get("size") ?? 12);
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 48) {
      return HttpResponse.json({ code: "INVALID_REQUEST", message: "목록 조회 조건이 올바르지 않습니다." }, { status: 400 });
    }
    const pages = listed();
    const visible = bookmarks.flatMap((publicId) => pages.find((candidate) => candidate.publicId === publicId) ?? []);
    return HttpResponse.json({
      actorPages: visible.slice(page * size, (page + 1) * size).map(toSummary),
      page,
      size,
      totalPages: Math.ceil(visible.length / size),
      totalElements: visible.length,
      savedCount: bookmarks.length,
      hiddenCount: bookmarks.length - visible.length,
      limit: BOOKMARK_LIMIT,
    });
  }),

  http.put(`${BOOKMARKS}/:publicId`, async ({ params }) => {
    await delay(160);
    const publicId = String(params.publicId);
    if (bookmarks.includes(publicId)) return new HttpResponse(null, { status: 204 });
    if (!listed().some((candidate) => candidate.publicId === publicId)) return notFound();
    if (bookmarks.length >= BOOKMARK_LIMIT) {
      const hidden = bookmarks.filter((saved) => !listed().some((candidate) => candidate.publicId === saved)).length;
      return HttpResponse.json({
        code: "ACTOR_BOOKMARK_LIMIT_EXCEEDED",
        message: `관심 배우는 ${BOOKMARK_LIMIT}명까지 저장할 수 있습니다.${hidden ? ` 비공개로 바뀌어 목록에 보이지 않는 배우 ${hidden}명도 포함됩니다.` : ""}`,
      }, { status: 409 });
    }
    bookmarks = [publicId, ...bookmarks];
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${BOOKMARKS}/:publicId`, async ({ params }) => {
    await delay(140);
    bookmarks = bookmarks.filter((saved) => saved !== String(params.publicId));
    return new HttpResponse(null, { status: 204 });
  }),
];
