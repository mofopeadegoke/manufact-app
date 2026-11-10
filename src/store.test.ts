import { describe, expect, it } from "vitest";
import {
  addApplication,
  createState,
  deleteApplication,
  followUpsDue,
  getApplication,
  listApplications,
  updateApplication,
  type Change,
  type Result,
  type StoreErrorCode,
} from "./store.js";
import type { Application } from "./types.js";

const TODAY = "2026-11-10";

const APPLICATIONS: Application[] = [
  {
    id: "app-1",
    company: "Acme Robotics",
    role: "Software Engineer",
    link: "https://example.com/jobs/acme",
    status: "applied",
    appliedOn: "2026-11-05",
    followUpOn: "2026-11-15",
  },
  {
    id: "app-2",
    company: "Globex Systems",
    role: "Full-Stack Engineer",
    status: "applied",
    appliedOn: "2026-10-26",
    followUpOn: "2026-11-05",
  },
  {
    id: "app-3",
    company: "Larkspur Analytics",
    role: "Frontend Engineer",
    status: "interviewing",
    appliedOn: "2026-10-20",
    followUpOn: TODAY,
  },
  {
    id: "app-4",
    company: "Tidewater Health",
    role: "Platform Engineer",
    status: "rejected",
    appliedOn: "2026-10-11",
  },
  {
    id: "app-5",
    company: "Pinecrest Software",
    role: "Backend Engineer",
    status: "applied",
    appliedOn: "2026-11-08",
    followUpOn: "2026-11-18",
  },
];

const state = () => createState(APPLICATIONS);

function expectOk(result: Result<Change>): Change {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.value;
}

function expectError(result: Result<unknown>, code: StoreErrorCode): void {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe(code);
    expect(result.error.message).not.toBe("");
  }
}

describe("listApplications", () => {
  it("puts due rows first, longest overdue at the top", () => {
    const ids = listApplications(state(), TODAY).map((a) => a.id);
    expect(ids.slice(0, 2)).toEqual(["app-2", "app-3"]);
  });

  it("orders the rest by most recently applied", () => {
    const ids = listApplications(state(), TODAY).map((a) => a.id);
    expect(ids.slice(2)).toEqual(["app-5", "app-1", "app-4"]);
  });

  it("flags each row as due or not", () => {
    const due = Object.fromEntries(
      listApplications(state(), TODAY).map((a) => [a.id, a.followUpDue])
    );
    expect(due).toEqual({
      "app-1": false,
      "app-2": true,
      "app-3": true,
      "app-4": false,
      "app-5": false,
    });
  });

  it("does not reorder the stored applications", () => {
    const s = state();
    listApplications(s, TODAY);
    expect(s.applications.map((a) => a.id)).toEqual(
      APPLICATIONS.map((a) => a.id)
    );
  });
});

describe("followUpsDue", () => {
  it("returns only rows due today or earlier", () => {
    expect(followUpsDue(state(), TODAY).map((a) => a.id)).toEqual([
      "app-2",
      "app-3",
    ]);
  });

  it("returns nothing when no follow-up has come due", () => {
    expect(followUpsDue(state(), "2026-10-01")).toEqual([]);
  });
});

describe("getApplication", () => {
  it("finds an application by id", () => {
    const result = getApplication(state(), "app-3");
    expect(result.ok && result.value.company).toBe("Larkspur Analytics");
  });

  it("fails for an unknown id", () => {
    expectError(getApplication(state(), "app-99"), "not_found");
  });
});

describe("addApplication", () => {
  const input = {
    company: "Bluefinch Labs",
    role: "Developer Experience Engineer",
    appliedOn: "2026-11-10",
  };

  it("adds an applied row with the next id", () => {
    const { state: next, application } = expectOk(
      addApplication(state(), input)
    );
    expect(application).toEqual({
      id: "app-6",
      company: "Bluefinch Labs",
      role: "Developer Experience Engineer",
      status: "applied",
      appliedOn: "2026-11-10",
      followUpOn: "2026-11-20",
    });
    expect(next.applications).toHaveLength(6);
  });

  it("keeps a link and an explicit follow-up date", () => {
    const { application } = expectOk(
      addApplication(state(), {
        ...input,
        link: "https://example.com/jobs/bluefinch",
        followUpOn: "2026-11-12",
      })
    );
    expect(application.link).toBe("https://example.com/jobs/bluefinch");
    expect(application.followUpOn).toBe("2026-11-12");
  });

  it("allows a follow-up on the applied date itself", () => {
    const { application } = expectOk(
      addApplication(state(), { ...input, followUpOn: "2026-11-10" })
    );
    expect(application.followUpOn).toBe("2026-11-10");
  });

  it("rejects a follow-up before the applied date", () => {
    expectError(
      addApplication(state(), { ...input, followUpOn: "2026-11-09" }),
      "follow_up_before_applied"
    );
  });

  it("allows a duplicate company and role", () => {
    const { application } = expectOk(
      addApplication(state(), {
        company: "Acme Robotics",
        role: "Software Engineer",
        appliedOn: "2026-11-10",
      })
    );
    expect(application.id).toBe("app-6");
  });

  it("never reuses the id of a deleted row", () => {
    const afterDelete = expectOk(deleteApplication(state(), "app-5")).state;
    const first = expectOk(addApplication(afterDelete, input));
    const afterSecondDelete = expectOk(
      deleteApplication(first.state, first.application.id)
    ).state;
    const second = expectOk(addApplication(afterSecondDelete, input));
    expect(first.application.id).toBe("app-6");
    expect(second.application.id).toBe("app-7");
  });

  it("leaves the original state untouched", () => {
    const s = state();
    expectOk(addApplication(s, input));
    expect(s.applications).toHaveLength(5);
    expect(s.nextId).toBe(6);
  });
});

describe("updateApplication", () => {
  it("changes status and keeps the follow-up date while still open", () => {
    const { application } = expectOk(
      updateApplication(state(), "app-1", { status: "interviewing" })
    );
    expect(application.status).toBe("interviewing");
    expect(application.followUpOn).toBe("2026-11-15");
  });

  it.each(["rejected", "offer"] as const)(
    "clears the follow-up date when status becomes %s",
    (status) => {
      const { application } = expectOk(
        updateApplication(state(), "app-2", { status })
      );
      expect(application.status).toBe(status);
      expect("followUpOn" in application).toBe(false);
    }
  );

  it("leaves the follow-up empty when a closed row is reopened", () => {
    const { application } = expectOk(
      updateApplication(state(), "app-4", { status: "interviewing" })
    );
    expect(application.status).toBe("interviewing");
    expect(application.followUpOn).toBeUndefined();
  });

  it("can reopen a closed row and set a follow-up in one update", () => {
    const { application } = expectOk(
      updateApplication(state(), "app-4", {
        status: "applied",
        followUpOn: "2026-11-20",
      })
    );
    expect(application.followUpOn).toBe("2026-11-20");
  });

  it("changes follow-up date, link and role", () => {
    const { application } = expectOk(
      updateApplication(state(), "app-1", {
        followUpOn: "2026-11-25",
        link: "https://example.com/jobs/acme-senior",
        role: "Senior Software Engineer",
      })
    );
    expect(application).toMatchObject({
      followUpOn: "2026-11-25",
      link: "https://example.com/jobs/acme-senior",
      role: "Senior Software Engineer",
      status: "applied",
      company: "Acme Robotics",
    });
  });

  it("rejects a follow-up date on a closed row", () => {
    expectError(
      updateApplication(state(), "app-4", { followUpOn: "2026-11-20" }),
      "follow_up_on_closed"
    );
  });

  it("rejects a follow-up date sent together with a closing status", () => {
    expectError(
      updateApplication(state(), "app-1", {
        status: "rejected",
        followUpOn: "2026-11-20",
      }),
      "follow_up_on_closed"
    );
  });

  it("rejects a follow-up before the applied date", () => {
    expectError(
      updateApplication(state(), "app-1", { followUpOn: "2026-11-04" }),
      "follow_up_before_applied"
    );
  });

  it("rejects an update with no fields", () => {
    expectError(updateApplication(state(), "app-1", {}), "empty_update");
  });

  it("fails for an unknown id", () => {
    expectError(
      updateApplication(state(), "app-99", { status: "offer" }),
      "not_found"
    );
  });

  it("changes only the targeted row and leaves the original state untouched", () => {
    const s = state();
    const { state: next } = expectOk(
      updateApplication(s, "app-1", { status: "offer" })
    );
    expect(s.applications[0]?.status).toBe("applied");
    expect(next.applications.slice(1)).toEqual(s.applications.slice(1));
  });
});

describe("deleteApplication", () => {
  it("removes the row and returns it", () => {
    const { state: next, application } = expectOk(
      deleteApplication(state(), "app-2")
    );
    expect(application.company).toBe("Globex Systems");
    expect(next.applications.map((a) => a.id)).toEqual([
      "app-1",
      "app-3",
      "app-4",
      "app-5",
    ]);
  });

  it("fails for an unknown id", () => {
    expectError(deleteApplication(state(), "app-99"), "not_found");
  });

  it("fails when the same row is deleted twice", () => {
    const { state: next } = expectOk(deleteApplication(state(), "app-2"));
    expectError(deleteApplication(next, "app-2"), "not_found");
  });
});
