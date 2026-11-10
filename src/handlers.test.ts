import { beforeEach, describe, expect, it } from "vitest";
import {
  addApplicationHandler,
  deleteApplicationHandler,
  draftFollowUpHandler,
  followUpsDueHandler,
  listApplicationsHandler,
  updateApplicationHandler,
  type AppStore,
  type HandlerContext,
  type ToolResult,
  type ToolSuccess,
} from "./handlers.js";
import {
  addApplicationInput,
  applicationChangeOutput,
  applicationListOutput,
  deleteApplicationOutput,
  draftFollowUpOutput,
  idInput,
  noInput,
  updateApplicationInput,
} from "./schemas.js";
import { createState } from "./store.js";
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
    company: "Tidewater Health",
    role: "Platform Engineer",
    status: "rejected",
    appliedOn: "2026-10-11",
  },
];

let store: AppStore;
let ctx: HandlerContext;

beforeEach(() => {
  store = { state: createState(APPLICATIONS) };
  ctx = { store, today: TODAY };
});

function expectSuccess<T>(result: ToolResult<T>): ToolSuccess<T> {
  if ("isError" in result) {
    throw new Error(`expected success, got: ${result.content[0]?.text}`);
  }
  expect(result.content[0]?.text).not.toBe("");
  return result;
}

function expectFailure(result: ToolResult<unknown>, pattern: RegExp): void {
  expect("isError" in result && result.isError).toBe(true);
  expect("structuredContent" in result).toBe(false);
  expect(result.content[0]?.text).toMatch(pattern);
}

// The SDK validates input with these same schemas before a handler runs,
// so a schema rejection here is what a client sees as an invalid-input error.
function messagesFor(
  schema: { safeParse: (value: unknown) => { success: boolean; error?: { issues: { message: string }[] } } },
  value: unknown
): string[] {
  const parsed = schema.safeParse(value);
  expect(parsed.success).toBe(false);
  return parsed.error?.issues.map((issue) => issue.message) ?? [];
}

describe("list_applications", () => {
  it("returns every application, due rows first, matching its output schema", () => {
    const { content, structuredContent } = expectSuccess(
      listApplicationsHandler(ctx)
    );
    expect(structuredContent.applications.map((a) => a.id)).toEqual([
      "app-2",
      "app-1",
      "app-3",
    ]);
    expect(structuredContent.dueCount).toBe(1);
    expect(structuredContent.today).toBe(TODAY);
    expect(applicationListOutput.safeParse(structuredContent).success).toBe(true);
    expect(content[0]?.text).toContain("app-2: Globex Systems");
    expect(content[0]?.text).toContain("(DUE)");
  });

  it("accepts no arguments and rejects unexpected ones", () => {
    expect(noInput.safeParse({}).success).toBe(true);
    expect(noInput.safeParse({ status: "applied" }).success).toBe(false);
  });
});

describe("followups_due", () => {
  it("returns only due applications", () => {
    const { structuredContent } = expectSuccess(followUpsDueHandler(ctx));
    expect(structuredContent.applications.map((a) => a.id)).toEqual(["app-2"]);
    expect(structuredContent.dueCount).toBe(1);
    expect(applicationListOutput.safeParse(structuredContent).success).toBe(true);
  });

  it("says so when nothing is due", () => {
    const { content, structuredContent } = expectSuccess(
      followUpsDueHandler({ store, today: "2026-10-01" })
    );
    expect(structuredContent.applications).toEqual([]);
    expect(content[0]?.text).toMatch(/No follow-ups are due/);
  });
});

describe("add_application", () => {
  const valid = {
    company: "Bluefinch Labs",
    role: "Developer Experience Engineer",
    link: "https://example.com/jobs/bluefinch",
    appliedOn: "2026-11-10",
  };

  it("adds the application and stores it", () => {
    const input = addApplicationInput.parse(valid);
    const { structuredContent } = expectSuccess(
      addApplicationHandler(ctx, input)
    );
    expect(structuredContent.application).toEqual({
      id: "app-4",
      ...valid,
      status: "applied",
      followUpOn: "2026-11-20",
      followUpDue: false,
    });
    expect(applicationChangeOutput.safeParse(structuredContent).success).toBe(true);
    expect(store.state.applications).toHaveLength(4);
  });

  it("trims whitespace around company and role", () => {
    const input = addApplicationInput.parse({
      ...valid,
      company: "  Bluefinch Labs  ",
    });
    expect(input.company).toBe("Bluefinch Labs");
  });

  it.each([
    ["a missing company", { ...valid, company: undefined }, /./],
    ["a blank company", { ...valid, company: "   " }, /company cannot be empty/],
    ["a blank role", { ...valid, role: "" }, /role cannot be empty/],
    ["a date in the wrong format", { ...valid, appliedOn: "10/11/2026" }, /YYYY-MM-DD/],
    ["a date that does not exist", { ...valid, appliedOn: "2026-02-30" }, /YYYY-MM-DD/],
    ["a bad follow-up date", { ...valid, followUpOn: "next week" }, /YYYY-MM-DD/],
    ["a link that is not a URL", { ...valid, link: "bluefinch careers page" }, /http\(s\) URL/],
    ["a link that is not http(s)", { ...valid, link: "ftp://example.com/job" }, /http\(s\) URL/],
    ["an unknown field", { ...valid, salary: 100 }, /./],
  ])("rejects %s", (_label, input, pattern) => {
    expect(messagesFor(addApplicationInput, input).join(" ")).toMatch(pattern);
  });

  it("returns an error when the follow-up is before the applied date", () => {
    const input = addApplicationInput.parse({
      ...valid,
      followUpOn: "2026-11-01",
    });
    expectFailure(addApplicationHandler(ctx, input), /before the applied date/);
    expect(store.state.applications).toHaveLength(3);
  });
});

describe("update_application", () => {
  it("changes the status and stores it", () => {
    const input = updateApplicationInput.parse({
      id: "app-1",
      status: "interviewing",
    });
    const { structuredContent } = expectSuccess(
      updateApplicationHandler(ctx, input)
    );
    expect(structuredContent.application.status).toBe("interviewing");
    expect(applicationChangeOutput.safeParse(structuredContent).success).toBe(true);
    expect(store.state.applications[0]?.status).toBe("interviewing");
  });

  it("clears the follow-up when the application is rejected", () => {
    const { structuredContent } = expectSuccess(
      updateApplicationHandler(ctx, { id: "app-2", status: "rejected" })
    );
    expect(structuredContent.application.followUpOn).toBeUndefined();
    expect(structuredContent.application.followUpDue).toBe(false);
  });

  it("recomputes the due flag when the follow-up date moves", () => {
    const { structuredContent } = expectSuccess(
      updateApplicationHandler(ctx, { id: "app-1", followUpOn: "2026-11-09" })
    );
    expect(structuredContent.application.followUpDue).toBe(true);
  });

  it.each([
    ["a missing id", { status: "offer" }, /./],
    ["an unknown status", { id: "app-1", status: "ghosted" }, /./],
    ["a bad follow-up date", { id: "app-1", followUpOn: "soon" }, /YYYY-MM-DD/],
    ["a bad link", { id: "app-1", link: "not a url" }, /http\(s\) URL/],
    ["a blank role", { id: "app-1", role: " " }, /role cannot be empty/],
    ["an attempt to change the company", { id: "app-1", company: "Other" }, /./],
  ])("rejects %s", (_label, input, pattern) => {
    expect(messagesFor(updateApplicationInput, input).join(" ")).toMatch(pattern);
  });

  it("returns an error when no field is given", () => {
    const input = updateApplicationInput.parse({ id: "app-1" });
    expectFailure(updateApplicationHandler(ctx, input), /Nothing to update/);
  });

  it("returns an error for a follow-up date on a rejected application", () => {
    expectFailure(
      updateApplicationHandler(ctx, { id: "app-3", followUpOn: "2026-11-20" }),
      /cannot have a follow-up date/
    );
  });

  it("returns an error for an unknown id and changes nothing", () => {
    const before = store.state;
    expectFailure(
      updateApplicationHandler(ctx, { id: "app-99", status: "offer" }),
      /No application with id "app-99"/
    );
    expect(store.state).toBe(before);
  });
});

describe("delete_application", () => {
  it("removes the application and reports what was deleted", () => {
    const { structuredContent } = expectSuccess(
      deleteApplicationHandler(ctx, idInput.parse({ id: "app-2" }))
    );
    expect(structuredContent.deleted.company).toBe("Globex Systems");
    expect(deleteApplicationOutput.safeParse(structuredContent).success).toBe(true);
    expect(store.state.applications.map((a) => a.id)).toEqual([
      "app-1",
      "app-3",
    ]);
  });

  it.each([
    ["a missing id", {}],
    ["an empty id", { id: "" }],
    ["a numeric id", { id: 2 }],
  ])("rejects %s", (_label, input) => {
    expect(messagesFor(idInput, input).length).toBeGreaterThan(0);
  });

  it("returns an error for an unknown id and deletes nothing", () => {
    expectFailure(
      deleteApplicationHandler(ctx, { id: "app-99" }),
      /No application with id "app-99"/
    );
    expect(store.state.applications).toHaveLength(3);
  });
});

describe("draft_followup", () => {
  it("returns the details and guidance the model needs, and changes nothing", () => {
    const before = store.state;
    const { content, structuredContent } = expectSuccess(
      draftFollowUpHandler(ctx, idInput.parse({ id: "app-2" }))
    );
    expect(structuredContent.application).toMatchObject({
      company: "Globex Systems",
      role: "Full-Stack Engineer",
      appliedOn: "2026-10-26",
      status: "applied",
    });
    expect(structuredContent.daysSinceApplied).toBe(15);
    expect(structuredContent.followUpDue).toBe(true);
    expect(structuredContent.guidance.length).toBeGreaterThan(0);
    expect(draftFollowUpOutput.safeParse(structuredContent).success).toBe(true);
    expect(content[0]?.text).toContain("Globex Systems");
    expect(content[0]?.text).toContain("15 days ago");
    expect(store.state).toBe(before);
  });

  it("rejects a missing id", () => {
    expect(messagesFor(idInput, {}).length).toBeGreaterThan(0);
  });

  it("returns an error for an unknown id", () => {
    expectFailure(
      draftFollowUpHandler(ctx, { id: "app-99" }),
      /No application with id "app-99"/
    );
  });
});
