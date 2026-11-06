import { describe, expect, it, vi } from "vitest";
import { DraftHistory } from "./draft-history";

function fixture() {
  const entries: unknown[] = [{ __NA: true, tree: "initial" }];
  let cursor = 0;
  const history = {
    get state() { return entries[cursor]; },
    pushState: vi.fn((state: unknown) => { entries.splice(++cursor); entries.push(state); }),
    replaceState: vi.fn((state: unknown) => { entries[cursor] = state; }),
    go: vi.fn(),
  };
  const nativePush = history.pushState;
  const confirm = vi.fn(() => true);
  const guard = new DraftHistory(history, confirm);
  guard.connect();
  const travel = (index: number) => {
    cursor = index;
    const event = { state: entries[cursor], stopImmediatePropagation: vi.fn() };
    guard.traverse(event);
    return event;
  };
  const hash = () => { nativePush(null); guard.recordHashEntry(); };
  return { history, confirm, travel, entries, hash };
}

describe("작성 중 브라우저 이동", () => {
  it("브라우저가 생성한 해시 기록도 이동 거리에 포함한다", () => {
    const { history, confirm, travel, hash } = fixture();
    history.pushState({ __NA: true });
    hash();
    history.pushState({ __NA: true });
    confirm.mockReturnValue(false);
    travel(0);
    expect(history.go).toHaveBeenLastCalledWith(3);
  });

  it("뒤로 이동한 뒤 해시를 열어도 도착한 화면의 라우터 상태를 유지한다", () => {
    const { history, travel, hash } = fixture();
    history.pushState({ __NA: true, tree: "new" });
    travel(0);
    hash();
    expect(history.state).toMatchObject({ __NA: true, tree: "initial" });
  });

  it("Next 상태를 유지하고 replace는 방문 기록을 늘리지 않는다", () => {
    const { history, entries } = fixture();
    history.pushState({ __NA: true, tree: "new" });
    history.replaceState({ __NA: true, tree: "updated" });
    expect(entries).toHaveLength(2);
    expect(history.state).toMatchObject({ __NA: true, tree: "updated" });
  });

  it("뒤로 이동을 취소하면 원래 기록으로 복귀하고 두 이벤트 모두 화면에 전달하지 않는다", () => {
    const { history, confirm, travel } = fixture();
    history.pushState({ __NA: true });
    confirm.mockReturnValue(false);
    expect(travel(0).stopImmediatePropagation).toHaveBeenCalledOnce();
    expect(history.go).toHaveBeenCalledWith(1);
    expect(travel(1).stopImmediatePropagation).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("앞으로 이동 취소와 여러 단계 건너뛰기도 원래 위치로 복귀한다", () => {
    const { history, confirm, travel } = fixture();
    history.pushState({ __NA: true });
    history.pushState({ __NA: true });
    travel(0);
    confirm.mockReturnValue(false);
    expect(travel(2).stopImmediatePropagation).toHaveBeenCalledOnce();
    expect(history.go).toHaveBeenLastCalledWith(-2);
    travel(0);
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("확인한 이동은 라우터로 전달하고 다음 이동의 기준 위치를 갱신한다", () => {
    const { history, confirm, travel } = fixture();
    history.pushState({ __NA: true });
    history.pushState({ __NA: true });
    expect(travel(1).stopImmediatePropagation).not.toHaveBeenCalled();
    confirm.mockReturnValue(false);
    travel(0);
    expect(history.go).toHaveBeenLastCalledWith(1);
  });

  it("replace 후에도 취소 복귀 거리를 보존한다", () => {
    const { history, confirm, travel } = fixture();
    history.pushState({ __NA: true });
    history.replaceState({ __NA: true });
    confirm.mockReturnValue(false);
    travel(0);
    expect(history.go).toHaveBeenCalledWith(1);
  });
});
