import { afterEach, describe, expect, it, vi } from "vitest";
import { publishAuditionPost, updateMyAuditionPost } from "./producer-api";
import { producerAuditionPostRoutes } from "./types";

afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

const write = {
  category: "뮤지컬",
  title: "배우 모집",
  pay: "",
  deadlineText: "상시",
  authorName: "다른 이름",
  bodyHtml: "<p>지원은 메일로</p>",
  tags: ["뮤지컬"],
  attachmentUrls: [],
};

describe("producer audition post API", () => {
  it("작성자는 서버가 기획사 이름으로 정하므로 보내지 않는다", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(
      String(url).includes("/audition-posts") ? json({ id: 3 }, 201) : json({}, 401),
    ));
    vi.stubGlobal("fetch", fetchMock);

    await publishAuditionPost(write);
    await updateMyAuditionPost("3", write);

    const calls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/audition-posts"));
    expect(calls.map(([url, init]) => [url, init.method])).toEqual([
      ["/api/v1/producers/me/audition-posts", "POST"],
      ["/api/v1/producers/me/audition-posts/3", "PUT"],
    ]);
    for (const [, init] of calls) {
      expect(JSON.parse(String(init.body))).not.toHaveProperty("authorName");
      expect(JSON.parse(String(init.body))).toMatchObject({ title: "배우 모집", bodyHtml: "<p>지원은 메일로</p>" });
    }
  });

  it("관리 화면 주소는 공고 ID를 인코딩한다", () => {
    expect(producerAuditionPostRoutes.edit("a/b")).toBe("/producers/audition-posts/a%2Fb/edit");
  });
});
