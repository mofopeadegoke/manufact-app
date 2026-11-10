import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  defaultFollowUpDate,
  isFollowUpDue,
  isIsoDate,
  todayUtc,
} from "./dates.js";

const TODAY = "2026-11-10";

describe("isIsoDate", () => {
  it("accepts a real calendar date", () => {
    expect(isIsoDate("2026-11-10")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
  });

  it.each([
    ["wrong separator", "2026/11/10"],
    ["day first", "10-11-2026"],
    ["with a time", "2026-11-10T09:00:00Z"],
    ["unpadded", "2026-1-5"],
    ["month 13", "2026-13-01"],
    ["February 30", "2026-02-30"],
    ["February 29 in a non-leap year", "2026-02-29"],
    ["empty", ""],
    ["words", "tomorrow"],
  ])("rejects %s", (_label, value) => {
    expect(isIsoDate(value)).toBe(false);
  });
});

describe("addDays", () => {
  it("adds and subtracts days", () => {
    expect(addDays("2026-11-10", 10)).toBe("2026-11-20");
    expect(addDays("2026-11-10", -10)).toBe("2026-10-31");
    expect(addDays("2026-11-10", 0)).toBe("2026-11-10");
  });

  it("crosses month, year and leap-day boundaries", () => {
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
    expect(addDays("2028-02-20", 10)).toBe("2028-03-01");
  });
});

describe("daysBetween", () => {
  it("counts whole days, negative when the end is earlier", () => {
    expect(daysBetween("2026-11-01", "2026-11-10")).toBe(9);
    expect(daysBetween("2026-11-10", "2026-11-10")).toBe(0);
    expect(daysBetween("2026-11-10", "2026-11-01")).toBe(-9);
  });
});

describe("todayUtc", () => {
  it("uses the UTC calendar day, not the local one", () => {
    expect(todayUtc(new Date("2026-11-10T23:59:59Z"))).toBe("2026-11-10");
    expect(todayUtc(new Date("2026-11-11T00:00:00Z"))).toBe("2026-11-11");
  });
});

describe("defaultFollowUpDate", () => {
  it("is ten days after applying", () => {
    expect(defaultFollowUpDate("2026-11-10")).toBe("2026-11-20");
    expect(defaultFollowUpDate("2026-12-28")).toBe("2027-01-07");
  });
});

describe("isFollowUpDue", () => {
  it("is due when the follow-up date is today", () => {
    expect(isFollowUpDue({ followUpOn: TODAY }, TODAY)).toBe(true);
  });

  it("is due when the follow-up date was yesterday", () => {
    expect(isFollowUpDue({ followUpOn: "2026-11-09" }, TODAY)).toBe(true);
  });

  it("is due when the follow-up date is long past", () => {
    expect(isFollowUpDue({ followUpOn: "2025-12-31" }, TODAY)).toBe(true);
  });

  it("is not due when the follow-up date is tomorrow", () => {
    expect(isFollowUpDue({ followUpOn: "2026-11-11" }, TODAY)).toBe(false);
  });

  it("is not due when there is no follow-up date", () => {
    expect(isFollowUpDue({}, TODAY)).toBe(false);
  });
});
