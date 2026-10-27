import { afterAll, beforeAll, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { createCommunityHandlers } from "./community-handlers";

const server = setupServer(...createCommunityHandlers());
const base = "http://localhost/api/v1/public/community/posts";
const secret = "a".repeat(64);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

function write(url: string, method: string, body: object, key = secret) {
  return fetch(url, { method, headers: { "Content-Type": "application/json", "X-Community-Key": key }, body: JSON.stringify(body) });
}

it("비회원 작성, 같은 요청 재시도, 다른 브라우저의 수정 거절을 모사한다", async () => {
  const input = { requestId: crypto.randomUUID(), title: "익명 글", body: "내용" };
  const created = await (await write(base, "POST", input)).json();
  const retry = await (await write(base, "POST", input)).json();
  expect(retry.id).toBe(created.id);
  const publicPost = await (await fetch(`${base}/${created.id}`)).json();
  expect(publicPost.editable).toBe(false);
  expect(publicPost).not.toHaveProperty("ownerHash");
  expect(publicPost).not.toHaveProperty("secret");
  expect((await write(`${base}/${created.id}`, "PUT", { title: "공격", body: "내용" }, "b".repeat(64))).status).toBe(403);
  expect((await write(base, "POST", { ...input, body: "변경" })).status).toBe(409);
});

it("댓글 수와 신고 접수, 삭제 후 조회와 쓰기 실패를 모사한다", async () => {
  const post = await (await write(base, "POST", { requestId: crypto.randomUUID(), title: "제목", body: "내용" })).json();
  const input = { requestId: crypto.randomUUID(), body: "댓글" };
  const comment = await (await write(`${base}/${post.id}/comments`, "POST", input)).json();
  await write(`${base}/${post.id}/comments`, "POST", input);
  const detail = await (await fetch(`${base}/${post.id}`)).json();
  expect(detail.commentCount).toBe(1);
  const report = { requestId: crypto.randomUUID(), reason: "SPAM", detail: "" };
  expect((await write(`http://localhost/api/v1/public/community/entries/${comment.id}/reports`, "POST", report)).status).toBe(204);
  expect((await fetch(`${base}/${post.id}`)).status).toBe(200);
  expect((await write(`${base}/${post.id}`, "DELETE", {})).status).toBe(204);
  expect((await fetch(`${base}/${post.id}/comments`)).status).toBe(404);
  expect((await write(`${base}/${post.id}/comments`, "POST", { requestId: crypto.randomUUID(), body: "댓글" })).status).toBe(404);
});
