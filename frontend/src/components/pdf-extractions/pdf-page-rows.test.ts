import { expect, it } from "vitest";
import { layoutPageRows, MIN_ROW_SCALE, PAGE_FIT_GAP, PAGE_SIDE_PADDING } from "./pdf-page-rows";

const portrait = { width: 595, height: 842 };
const landscape = { width: 842, height: 595 };
const long = { width: 600, height: 1800 };
const reader = { width: 900, height: 656 };
const inner = reader.width - PAGE_SIDE_PADDING * 2;
const usable = reader.height - PAGE_FIT_GAP;
const indexes = (rows: ReturnType<typeof layoutPageRows>) => rows.map(row => row.map(page => page.index));

it("세로 쪽은 조금 줄여서라도 두 장씩 한 화면에 나란히 놓는다", () => {
  const rows = layoutPageRows(reader, [portrait, portrait, portrait], "page");
  expect(indexes(rows)).toEqual([[0, 1], [2]]);
  const pairWidth = rows[0].reduce((sum, page) => sum + page.width, 0);
  expect(pairWidth).toBeLessThanOrEqual(inner);
  expect(rows[0][0].width * portrait.height / portrait.width).toBeGreaterThanOrEqual(usable * MIN_ROW_SCALE);
  expect(rows[1][0].width).toBe(Math.floor(usable * portrait.width / portrait.height));
});

it("가로 쪽은 한 장이 화면 폭을 넘지 않게 혼자 한 화면을 쓴다", () => {
  const rows = layoutPageRows(reader, [landscape, landscape], "page");
  expect(indexes(rows)).toEqual([[0], [1]]);
  expect(rows[0][0].width).toBeLessThanOrEqual(inner);
  expect(rows[0][0].width).toBeGreaterThan(inner - 2);
});

it("세로와 가로가 섞이면 쪽마다 알맞게 묶는다", () => {
  const rows = layoutPageRows(reader, [portrait, landscape, landscape, portrait, portrait], "page");
  expect(indexes(rows)).toEqual([[0], [1], [2], [3, 4]]);
});

it("세로로 긴 이미지는 앞뒤 쪽과 묶지 않고 원본 높이만큼의 폭으로 세로 스크롤한다", () => {
  const rows = layoutPageRows(reader, [portrait, long, portrait], "page");
  expect(indexes(rows)).toEqual([[0], [1], [2]]);
  expect(rows[1][0].width).toBe(usable);
});

it("폭 맞춤이나 높이를 아직 못 잰 화면은 한 쪽씩 폭에 맞춘다", () => {
  expect(layoutPageRows(reader, [portrait, portrait], "width")).toEqual([[{ index: 0, width: 900 }], [{ index: 1, width: 900 }]]);
  expect(layoutPageRows({ width: 900, height: 0 }, [portrait, portrait], "page")).toEqual([[{ index: 0, width: inner }], [{ index: 1, width: inner }]]);
});

it("좁은 휴대폰 화면은 세로 쪽도 한 장씩 보여 준다", () => {
  const rows = layoutPageRows({ width: 390, height: 548 }, [portrait, portrait], "page");
  expect(indexes(rows)).toEqual([[0], [1]]);
  expect(rows[0][0].width).toBeLessThanOrEqual(390 - PAGE_SIDE_PADDING * 2);
});
