// @vitest-environment jsdom
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screeningApplicant } from "@/features/pdf-reviews/screening-adapter";
import type { ReviewDetail, ReviewEntry } from "@/features/pdf-reviews/types";
import { ReviewUploadPanel } from "../review-upload-panel";
import { ApplicantCards } from "./applicant-cards";
import { BoardProvider, type BoardContextValue } from "./board-context";

let root: Root;
let container: HTMLDivElement;
const roles = [{ id: "r1", name: "남주" }];
const entry = (id: string, patch: Partial<ReviewEntry>): ReviewEntry => ({
  id, jobId: `job-${id}`, originalFilename: `${id}.pdf`, title: "", applicantName: "자동 추출 이름", roleId: null,
  matchStatus: "NEEDS_CHECK", matchEvidence: null, memo: "", decision: "PENDING", processingStatus: "READY", ...patch,
});
const entries = [entry("plain", {}), entry("named", { title: "가람", roleId: "r1" }), entry("loading", { processingStatus: "UPLOADING" })];
const review: ReviewDetail = { id: "review", title: "심사", createdAt: "2026-11-16", roles, entries };
const rows = entries.map(item => screeningApplicant(review, item));
const board = { selected: new Set(), toggleSelected: vi.fn(), openApplicant: vi.fn() } as unknown as BoardContextValue;

async function render(node: React.ReactNode) {
  await act(async () => root.render(<BoardProvider value={board}>{node}</BoardProvider>));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); vi.unstubAllGlobals(); });

describe("PDF 심사 지원자 목록", () => {
  it("카드는 기본 파일명 또는 수동 제목을 한 번만 표시한다", async () => {
    await render(<ApplicantCards rows={rows} />);
    const titles = [...container.querySelectorAll("h2")].map(node => node.textContent);
    expect(titles).toEqual(["plain.pdf", "가람", "loading.pdf"]);
    const named = container.querySelectorAll("article")[1];
    expect([...named.querySelectorAll("p span")].map(node => node.textContent)).toEqual(["남주"]);
    expect(container.textContent).not.toMatch(/이름 미입력|미배정|자동 추출 이름/);
    expect(container.textContent).toContain("업로드 중");
  });

  it("업로드 버튼은 올리는 동안 진행 표시를 보인다", async () => {
    const props = { inputRef: createRef<HTMLInputElement>(), folderInputRef: createRef<HTMLInputElement>(), disabled: false, onChoose: vi.fn() };
    await render(<ReviewUploadPanel {...props} busy />);
    expect(container.textContent).toContain("파일 준비하고 올리는 중…");
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    await render(<ReviewUploadPanel {...props} busy={false} />);
    expect(container.querySelector(".animate-spin")).toBeNull();
    expect([...container.querySelectorAll('button')].map(button => [button.textContent, button.querySelector('svg')?.getAttribute('aria-hidden')])).toEqual([
      ['폴더 선택', 'true'], ['PDF 추가', 'true'],
    ]);
  });
});
