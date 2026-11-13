// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { PdfOriginalViewer } from "./pdf-original-viewer";
const state = vi.hoisted(() => ({ props: {} as { url?: string; filename?: string; onRetry?: () => void; fit?: string } }));
vi.mock("next/dynamic", () => ({ default: () => function Canvas(props: typeof state.props) { state.props = props; return <div>연속 PDF</div>; } }));
it("원본을 연속 뷰어에 전달하며 일반 도구 모음·다운로드·새 창을 표시하지 않는다", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div"); const root = createRoot(host); const refresh = vi.fn();
  try {
    act(() => root.render(<PdfOriginalViewer url="https://example.test/a" filename="a.pdf" onRefresh={refresh} />));
    expect(state.props).toMatchObject({ url: "https://example.test/a", filename: "a.pdf", onRetry: refresh, fit: "width" });
    expect(host.querySelector("button,a,iframe,select")).toBeNull();
    act(() => root.render(<PdfOriginalViewer url="https://example.test/renewed" filename="a.pdf" onRefresh={refresh} fit="page" />));
    expect(state.props).toMatchObject({ url: "https://example.test/renewed", fit: "page" });
  } finally { act(() => root.unmount()); vi.unstubAllGlobals(); }
});
