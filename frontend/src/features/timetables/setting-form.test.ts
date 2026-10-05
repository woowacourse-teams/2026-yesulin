import { describe, expect, it } from "vitest";
import {
  addRange,
  changeCommonRanges,
  checkRange,
  commonRangesOf,
  customDates,
  datesBetween,
  emptySettingForm,
  nextRange,
  normalizeTimeInput,
  rangesOf,
  readSettingForm,
  sortRanges,
  removeDates,
  removeRange,
  selectDates,
  setDateRanges,
  updateRange,
  type SettingForm,
} from "./setting-form";

const ALL_DAY = [{ startTime: "10:00", endTime: "18:00" }];
const LUNCH_BREAK = [{ startTime: "10:00", endTime: "12:00" }, { startTime: "13:00", endTime: "18:00" }];

const form = (overrides: Partial<SettingForm> = {}): SettingForm => ({
  slotMinutes: "30",
  slotCapacity: "2",
  windows: [
    { id: "b", date: "2026-10-11", startTime: "14:00", endTime: "16:00" },
    { id: "a", date: "2026-10-10", startTime: "10:00", endTime: "12:00" },
  ],
  ...overrides,
});

const times = (value: SettingForm, date: string) => rangesOf(value, date).map((range) => `${range.startTime}-${range.endTime}`);

describe("timetable setting form", () => {
  it("숫자로 바꾸고 시간대를 날짜순으로 정렬한다", () => {
    expect(readSettingForm(form()).setting).toEqual({
      slotMinutes: 30,
      slotCapacity: 2,
      windows: [
        { date: "2026-10-10", startTime: "10:00", endTime: "12:00" },
        { date: "2026-10-11", startTime: "14:00", endTime: "16:00" },
      ],
    });
  });

  it("잘못된 항목을 한 번에 모두 알려 준다", () => {
    const result = readSettingForm(form({
      slotMinutes: "7",
      slotCapacity: "0",
      windows: [
        { id: "a", date: "2026-10-10", startTime: "10:00", endTime: "12:00" },
        { id: "b", date: "2026-10-10", startTime: "11:00", endTime: "13:00" },
        { id: "d", date: "2026-10-12", startTime: "10:03", endTime: "11:00" },
        { id: "e", date: "2026-10-13", startTime: "25:00", endTime: "26:00" },
      ],
    }));

    expect(result.setting).toBeNull();
    expect(Object.keys(result.errors).sort()).toEqual(["a", "b", "d", "e", "slotCapacity", "slotMinutes"]);
    expect(result.errors.e).toBe("시각은 10:00처럼 적어 주세요.");
    expect(readSettingForm(emptySettingForm()).errors.windows).toBe("오디션 날짜를 하나 이상 골라 주세요.");
  });

  it("고른 날짜를 전체 오디션 가능 시간 묶음으로 열고 이미 고른 날짜는 그대로 둔다", () => {
    let next = selectDates(emptySettingForm(), ["2026-10-11"], ALL_DAY);
    next = selectDates(next, datesBetween("2026-10-12", "2026-10-10"), LUNCH_BREAK);

    expect(times(next, "2026-10-10")).toEqual(["10:00-12:00", "13:00-18:00"]);
    expect(times(next, "2026-10-11")).toEqual(["10:00-18:00"]);
    expect(customDates(next, LUNCH_BREAK)).toEqual(["2026-10-11"]);
    expect(commonRangesOf(next).map((range) => range.startTime)).toEqual(["10:00", "13:00"]);
    expect(commonRangesOf(emptySettingForm()).map((range) => range.endTime)).toEqual(["18:00"]);
  });

  it("전체 시간을 바꾸면 그 시간을 따르던 날짜만 바뀌고 따로 고친 날짜는 남는다", () => {
    let next = selectDates(emptySettingForm(), datesBetween("2026-10-10", "2026-10-12"), ALL_DAY);
    const custom = rangesOf(next, "2026-10-11")[0];
    next = updateRange(next, custom.id, { startTime: "14:00" });
    next = changeCommonRanges(next, ALL_DAY, LUNCH_BREAK);

    expect(times(next, "2026-10-10")).toEqual(["10:00-12:00", "13:00-18:00"]);
    expect(times(next, "2026-10-11")).toEqual(["14:00-18:00"]);
    expect(times(next, "2026-10-12")).toEqual(["10:00-12:00", "13:00-18:00"]);
  });

  it("날짜별로 시간을 더하거나 빼고, 전체 시간으로 되돌리거나 날짜를 뺄 수 있다", () => {
    let next = addRange(form(), "2026-10-10");
    expect(times(next, "2026-10-10")).toEqual(["10:00-12:00", "13:00-15:00"]);

    next = removeRange(next, "a");
    expect(times(next, "2026-10-10")).toEqual(["13:00-15:00"]);
    expect(times(setDateRanges(next, ["2026-10-10"], LUNCH_BREAK), "2026-10-10")).toEqual(["10:00-12:00", "13:00-18:00"]);
    expect(selectedDatesOf(removeDates(next, ["2026-10-10"]))).toEqual(["2026-10-11"]);
    expect(nextRange([])).toEqual({ startTime: "10:00", endTime: "12:00" });
  });

  it("오디션 가능 시간을 넣기 전에 형식·순서·겹침을 검사하고 시작 순으로 정렬한다", () => {
    const morning = { startTime: "10:00", endTime: "12:00" };

    expect(checkRange({ startTime: "13:00", endTime: "18:00" }, [morning], "20")).toBeNull();
    expect(checkRange({ startTime: "11:00", endTime: "13:00" }, [morning], "20")).toBe("다른 시간과 겹쳐요.");
    expect(checkRange({ startTime: "15:00", endTime: "14:00" }, [], "20")).toBe("끝나는 시각이 시작 시각보다 늦어야 해요.");
    expect(checkRange({ startTime: "10:00", endTime: "10:10" }, [], "20")).toBe("오디션 진행 시간(20분)보다 길게 정해 주세요.");
    expect(checkRange({ startTime: "", endTime: "12:00" }, [], "20")).toBe("시작·끝 시각을 적어 주세요.");
    expect(sortRanges([{ startTime: "13:00", endTime: "18:00" }, morning])[0]).toBe(morning);
  });

  it("직접 입력한 시각을 HH:mm으로 맞춘다", () => {
    expect(normalizeTimeInput("9")).toBe("09:00");
    expect(normalizeTimeInput("930")).toBe("09:30");
    expect(normalizeTimeInput("1000")).toBe("10:00");
    expect(normalizeTimeInput(" 13:05 ")).toBe("13:05");
    expect(normalizeTimeInput("25")).toBe("25");
    expect(normalizeTimeInput("10:3")).toBe("10:3");
  });
});

function selectedDatesOf(value: SettingForm) {
  return [...new Set(value.windows.map((window) => window.date))];
}
