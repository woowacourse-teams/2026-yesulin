import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ReviewAutosave } from "./review-autosave";
const initial = { title: "지원서", memo: "" };
const stores: ReviewAutosave[] = [];
function setup(save = vi.fn(async (_field: string, value: string) => value)) {
  const onDirty = vi.fn();
  const store = new ReviewAutosave({ initial, save, onDirty }); stores.push(store);
  return { store, save, onDirty };
}
function deferred() { let resolve!: (value: string | null) => void; const promise = new Promise<string | null>(r => { resolve = r; }); return { promise, resolve }; }
beforeEach(() => vi.useFakeTimers());
afterEach(() => { stores.splice(0).forEach(store => store.dispose()); vi.useRealTimers(); });
it("입력이 멈춘 뒤 한 번 저장하고 원래 값으로 돌아오면 저장하지 않는다", async () => {
  const { store, save } = setup(); store.change("memo", "첫 입력"); await vi.advanceTimersByTimeAsync(600);
  store.change("memo", "마지막 입력"); await vi.advanceTimersByTimeAsync(799); expect(save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); expect(save).toHaveBeenCalledExactlyOnceWith("memo", "마지막 입력");
  store.change("memo", "수정"); store.change("memo", "마지막 입력"); await vi.advanceTimersByTimeAsync(900);
  expect(save).toHaveBeenCalledTimes(1); expect(store.getSnapshot().status).toBe("saved");
});
it("이동·blur 저장은 진행 중 요청을 공유하고 그동안 바뀐 최신 입력까지 직렬 저장한다", async () => {
  const first = deferred(); const save = vi.fn().mockReturnValueOnce(first.promise).mockImplementation(async (_field, value) => value);
  const { store } = setup(save); store.change("title", " 새 제목 "); const flush = store.flush();
  await Promise.resolve(); store.change("title", "최종 제목"); store.change("memo", "검토 메모");
  expect(store.flush()).toBe(flush); expect(save).toHaveBeenCalledTimes(1);
  first.resolve("새 제목"); expect(await flush).toBe(true);
  expect(save.mock.calls).toEqual([["title", "새 제목"], ["title", "최종 제목"], ["memo", "검토 메모"]]);
  expect(store.getSnapshot()).toMatchObject({ title: "최종 제목", memo: "검토 메모", dirty: false, status: "saved" });
});
it("한글 조합 도중 타이머와 이동 저장을 멈추고 조합 완료 후 저장한다", async () => {
  const { store, save } = setup(); store.compose("title", true); store.change("title", "가");
  await vi.advanceTimersByTimeAsync(1000); expect(await store.flush()).toBe(false); expect(save).not.toHaveBeenCalled();
  store.compose("title", false, "가람"); await vi.advanceTimersByTimeAsync(800);
  expect(save).toHaveBeenCalledExactlyOnceWith("title", "가람");
});
it("실패하면 이동을 막고 입력을 유지하며 명시적 재시도로 복구한다", async () => {
  const save = vi.fn().mockResolvedValueOnce(null).mockImplementation(async (_field, value) => value);
  const { store } = setup(save); store.change("memo", "남겨둘 메모");
  expect(await store.flush()).toBe(false); expect(store.getSnapshot()).toMatchObject({ memo: "남겨둘 메모", dirty: true, status: "error" });
  await vi.advanceTimersByTimeAsync(5000); expect(save).toHaveBeenCalledTimes(1);
  expect(await store.flush()).toBe(true); expect(store.getSnapshot().dirty).toBe(false);
});
it("배우 이름을 지울 수 있고 500자 메모 경계를 검증한다", async () => {
  const { store, save } = setup(); store.change("title", "  "); expect(await store.flush()).toBe(true); expect(save).toHaveBeenCalledWith("title", "");
  store.change("title", " 배우 프로필 "); expect(await store.flush()).toBe(true); expect(store.getSnapshot().title).toBe("배우 프로필");
  store.change("memo", "가".repeat(500)); expect(await store.flush()).toBe(true);
  store.change("memo", "가".repeat(501)); expect(await store.flush()).toBe(false); expect(save).toHaveBeenCalledTimes(3);
});
it("외부 갱신은 편집 중인 필드를 덮지 않고 종료된 화면은 추가 요청하지 않는다", async () => {
  const { store, save } = setup(); store.change("memo", "작성 중"); store.sync({ title: "외부 제목", memo: "외부 메모" });
  expect(store.getSnapshot()).toMatchObject({ title: "외부 제목", memo: "작성 중" });
  store.dispose(); await vi.advanceTimersByTimeAsync(1000); expect(await store.flush()).toBe(false); expect(save).not.toHaveBeenCalled();
});
it("진행 중 화면 종료 후 남은 필드 요청과 publish를 중단한다", async () => {
  const first = deferred(); const save = vi.fn().mockReturnValue(first.promise); const { store } = setup(save);
  const listener = vi.fn(); store.subscribe(listener); store.change("title", "제목"); store.change("memo", "메모");
  const pending = store.flush(); await Promise.resolve(); store.dispose(); listener.mockClear(); first.resolve("제목");
  expect(await pending).toBe(false); expect(save).toHaveBeenCalledTimes(1); expect(listener).not.toHaveBeenCalled();
});

it("전송 중 원래 값으로 되돌려도 최신 값 저장 전에는 이탈 보호를 해제하지 않는다", async () => {
  const first = deferred(); const save = vi.fn().mockReturnValueOnce(first.promise).mockImplementation(async (_field, value) => value);
  const { store, onDirty } = setup(save); store.change("memo", "전송 중"); const pending = store.flush(); await Promise.resolve();
  store.change("memo", ""); expect(store.getSnapshot().dirty).toBe(true); expect(onDirty).toHaveBeenLastCalledWith(true);
  first.resolve("전송 중"); expect(await pending).toBe(true);
  expect(save.mock.calls).toEqual([["memo", "전송 중"], ["memo", ""]]); expect(onDirty).toHaveBeenLastCalledWith(false);
});
it("전송 결과가 불명확해도 되돌린 값을 재전송해 서버 상태를 확정한다", async () => {
  const first = deferred(); const save = vi.fn().mockReturnValueOnce(first.promise).mockImplementation(async (_field, value) => value);
  const { store } = setup(save); store.change("memo", "전송 중"); const pending = store.flush(); await Promise.resolve(); store.change("memo", "");
  first.resolve(null); expect(await pending).toBe(false); expect(store.getSnapshot().dirty).toBe(true);
  expect(await store.flush()).toBe(true); expect(save).toHaveBeenLastCalledWith("memo", "");
});

it('실패한 메모 요청 중 받은 외부 이름은 요청 종료 후 반영한다',async()=>{
  const first=deferred();const {store}=setup(vi.fn().mockReturnValueOnce(first.promise));store.change('memo','보존 메모');const pending=store.flush();await Promise.resolve();
  store.sync({title:'다른 곳에서 수정한 이름',memo:''});first.resolve(null);expect(await pending).toBe(false);
  expect(store.getSnapshot()).toMatchObject({title:'다른 곳에서 수정한 이름',memo:'보존 메모',errorField:'memo',status:'error',dirty:true});
});
it('자신의 저장 정규화 값은 대기 중 외부 snapshot의 과거 값으로 되돌리지 않는다',async()=>{
  const first=deferred();const {store}=setup(vi.fn().mockReturnValueOnce(first.promise));store.change('title',' 새 이름 ');const pending=store.flush();await Promise.resolve();
  store.sync({title:'지원서',memo:'외부 메모'});first.resolve('새 이름');expect(await pending).toBe(true);
  expect(store.getSnapshot()).toMatchObject({title:'새 이름',memo:'외부 메모',dirty:false});
});
