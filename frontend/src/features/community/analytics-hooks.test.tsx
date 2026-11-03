// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAbandonTracking, useTrackOnce } from "./analytics";

const track = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/features/analytics/product-analytics", () => ({ trackProductEvent: track }));

let root: Root;

function Viewed({ ready, onTrack }: { readonly ready: boolean; readonly onTrack: () => void }) {
  useTrackOnce(ready, onTrack);
  return null;
}

function Editor({ active, unsaved }: { readonly active: boolean; readonly unsaved: boolean }) {
  useAbandonTracking(active, unsaved);
  return null;
}

async function render(node: React.ReactNode) { await act(async () => root.render(node)); }
async function unmount() { await act(async () => root.unmount()); }

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  track.mockClear();
  root = createRoot(document.createElement("div"));
});
afterEach(() => vi.unstubAllGlobals());

describe("useTrackOnce", () => {
  it("준비되기 전에는 보내지 않고, 준비된 뒤 다시 그려도 한 번만 보낸다", async () => {
    const onTrack = vi.fn();
    await render(<Viewed ready={false} onTrack={onTrack} />);
    expect(onTrack).not.toHaveBeenCalled();
    await render(<Viewed ready onTrack={onTrack} />);
    await render(<Viewed ready={false} onTrack={onTrack} />);
    await render(<Viewed ready onTrack={onTrack} />);
    expect(onTrack).toHaveBeenCalledTimes(1);
    await unmount();
  });
});

describe("useAbandonTracking", () => {
  it("아무것도 쓰지 않고 떠나면 보내지 않는다", async () => {
    await render(<Editor active unsaved={false} />);
    await unmount();
    expect(track).not.toHaveBeenCalled();
  });

  it("쓴 내용을 올리지 않고 떠나면 한 번 보낸다", async () => {
    await render(<Editor active unsaved={false} />);
    await render(<Editor active unsaved />);
    await unmount();
    expect(track.mock.calls).toEqual([["community_compose_abandoned"]]);
  });

  it("저장에 성공한 뒤 떠나거나 글 수정 화면이면 보내지 않는다", async () => {
    await render(<Editor active unsaved />);
    await render(<Editor active unsaved={false} />);
    await unmount();
    root = createRoot(document.createElement("div"));
    await render(<Editor active={false} unsaved />);
    await unmount();
    expect(track).not.toHaveBeenCalled();
  });
});
