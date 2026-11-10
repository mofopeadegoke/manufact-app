import { describe, expect, it } from "vitest";
import { isFollowUpDue, isIsoDate } from "./dates.js";
import { loadSeed, materializeSeed } from "./seed.js";
import { isClosed, STATUSES } from "./types.js";

const TODAY = "2026-11-10";

describe("materializeSeed", () => {
  it("turns day offsets into dates relative to today", () => {
    const [application] = materializeSeed(
      [
        {
          company: "Acme Robotics",
          role: "Software Engineer",
          status: "applied",
          appliedDaysAgo: 12,
          followUpInDays: -2,
        },
      ],
      TODAY
    );
    expect(application).toEqual({
      id: "app-1",
      company: "Acme Robotics",
      role: "Software Engineer",
      status: "applied",
      appliedOn: "2026-10-29",
      followUpOn: "2026-11-08",
    });
  });

  it("rejects a closed row that has a follow-up", () => {
    expect(() =>
      materializeSeed(
        [
          {
            company: "Tidewater Health",
            role: "Platform Engineer",
            status: "rejected",
            appliedDaysAgo: 30,
            followUpInDays: 2,
          },
        ],
        TODAY
      )
    ).toThrow();
  });

  it("rejects an unknown status", () => {
    expect(() =>
      materializeSeed(
        [{ company: "X", role: "Y", status: "ghosted", appliedDaysAgo: 1 }],
        TODAY
      )
    ).toThrow();
  });
});

describe("the bundled seed file", () => {
  const seed = loadSeed(TODAY);

  it("has 8 to 10 rows with unique ids", () => {
    expect(seed.length).toBeGreaterThanOrEqual(8);
    expect(seed.length).toBeLessThanOrEqual(10);
    expect(new Set(seed.map((a) => a.id)).size).toBe(seed.length);
  });

  it("covers every status", () => {
    expect(new Set(seed.map((a) => a.status))).toEqual(new Set(STATUSES));
  });

  it("has both due and not-due follow-ups whatever day it is loaded", () => {
    for (const today of [TODAY, "2030-02-28"]) {
      const rows = loadSeed(today);
      expect(rows.some((a) => isFollowUpDue(a, today))).toBe(true);
      expect(
        rows.some((a) => a.followUpOn && !isFollowUpDue(a, today))
      ).toBe(true);
    }
  });

  it("has valid dates and no follow-up on closed rows", () => {
    for (const application of seed) {
      expect(isIsoDate(application.appliedOn)).toBe(true);
      if (isClosed(application.status)) {
        expect(application.followUpOn).toBeUndefined();
      } else if (application.followUpOn) {
        expect(isIsoDate(application.followUpOn)).toBe(true);
        expect(application.followUpOn >= application.appliedOn).toBe(true);
      }
    }
  });
});
