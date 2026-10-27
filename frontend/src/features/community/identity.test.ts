import { afterEach, expect, it, vi } from "vitest";
import { readIdentity, writeIdentity } from "./identity";

afterEach(() => vi.unstubAllGlobals());

it("읽기만 할 때는 식별자를 만들지 않는다", () => {
  const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
  vi.stubGlobal("localStorage", storage);
  expect(readIdentity()).toEqual({});
  expect(storage.setItem).not.toHaveBeenCalled();
});

it("쓰기에는 브라우저에 저장된 비밀값을 다시 사용한다", async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  const first = await writeIdentity();
  expect(first["X-Community-Key"]).toMatch(/^[a-f0-9]{64}$/);
  expect(await writeIdentity()).toEqual(first);
});

it("저장소가 막혔어도 읽을 수 있지만 관리 권한을 잃을 글은 등록하지 않는다", async () => {
  vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); } });
  expect(readIdentity()).toEqual({});
  await expect(writeIdentity()).rejects.toThrow("브라우저 저장 공간");
});
