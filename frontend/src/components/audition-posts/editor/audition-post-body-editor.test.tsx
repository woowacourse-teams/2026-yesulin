// @vitest-environment jsdom
import type { Editor } from "@tiptap/react";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditionPostBodyEditor } from "./audition-post-body-editor";

let container: HTMLDivElement;
let root: Root;
const onChange = vi.fn();

function EditorFixture({ initialHtml = "" }: { readonly initialHtml?: string }) {
  const [draftHtml, setDraftHtml] = useState<string | null>(null);
  return <AuditionPostBodyEditor id="body" labelledBy="body-label" initialHtml={initialHtml} draftHtml={draftHtml}
    onChange={(html) => { onChange(html); setDraftHtml(html); }} />;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  onChange.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function previewBody() {
  return container.querySelector("#body-preview .post-body");
}

function viewButton(label: string) {
  const button = [...container.querySelectorAll("button")].find((item) => item.textContent === label);
  if (!button) throw new Error(`보기 버튼을 찾지 못했습니다: ${label}`);
  return button;
}

function editorInstance() {
  const textbox = container.querySelector<HTMLElement & { editor: Editor }>("#body");
  if (!textbox?.editor) throw new Error("본문 편집기가 없습니다.");
  return textbox.editor;
}

describe("공고 작성 미리보기", () => {
  it("Enter 두 번으로 만든 빈 문단을 저장 HTML과 실시간 미리보기에서 보존한다", async () => {
    await act(async () => root.render(<EditorFixture />));
    expect(container.querySelector("#body-preview")?.textContent).toContain("본문을 입력하면");
    const editor = editorInstance();
    await act(async () => {
      editor.commands.insertContent("첫 줄");
      editor.commands.keyboardShortcut("Enter");
      editor.commands.keyboardShortcut("Enter");
      editor.commands.insertContent("다음 줄");
    });
    const expected = "<p>첫 줄</p><p></p><p>다음 줄</p>";
    expect(onChange).toHaveBeenLastCalledWith(expected);
    expect(previewBody()?.innerHTML).toBe(expected);

    await act(async () => viewButton("미리보기").click());
    expect(viewButton("미리보기").getAttribute("aria-pressed")).toBe("true");
    expect(previewBody()?.innerHTML).toBe(expected);
    await act(async () => viewButton("작성").click());
    expect(viewButton("작성").getAttribute("aria-pressed")).toBe("true");
    expect(editor.getHTML()).toBe(expected);

    await act(async () => { editor.commands.clearContent(); });
    expect(container.querySelector("#body-preview")?.textContent).toContain("본문을 입력하면");
  });

  it("기존 본문의 빈 문단과 표를 읽고 미리보기만 열면 저장 값을 변경하지 않는다", async () => {
    const html = "<p>모집 안내</p><p></p><table><tbody><tr><td>배역</td></tr></tbody></table>";
    await act(async () => root.render(<EditorFixture initialHtml={html} />));
    await act(async () => viewButton("미리보기").click());
    expect(previewBody()?.innerHTML).toBe(html);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("미리보기에서 서식과 사진은 표시하고 탐색과 인라인 동작은 제거한다", async () => {
    const html = '<p><strong>지원</strong> <a href="https://example.com/apply">양식</a>'
      + '<img src="https://example.com/poster.png" onerror="noop()" alt="포스터"></p><hr><p><s>마감</s></p>';
    await act(async () => root.render(<EditorFixture initialHtml={html} />));
    expect(previewBody()?.querySelector("strong")?.textContent).toBe("지원");
    expect(previewBody()?.querySelector("s")?.textContent).toBe("마감");
    expect(previewBody()?.querySelector("hr")).not.toBeNull();
    expect(previewBody()?.querySelector("a")?.getAttribute("href")).toBeNull();
    expect(previewBody()?.querySelector("img")?.getAttribute("alt")).toBe("포스터");
    expect(previewBody()?.querySelector("img")?.getAttribute("onerror")).toBeNull();
  });
});
