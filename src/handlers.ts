import { daysBetween, isFollowUpDue } from "./dates.js";
import type {
  AddApplicationInput,
  ApplicationChangeOutput,
  ApplicationListOutput,
  DeleteApplicationOutput,
  DraftFollowUpOutput,
  IdInput,
  UpdateApplicationInput,
} from "./schemas.js";
import {
  addApplication,
  deleteApplication,
  followUpsDue,
  getApplication,
  listApplications,
  updateApplication,
  type ListedApplication,
  type StoreError,
  type StoreState,
} from "./store.js";
import type { Application } from "./types.js";

// The one mutable thing in the app: handlers swap in each new state
// that the pure store functions return.
export type AppStore = { state: StoreState };

// `today` is passed in rather than read from the clock so tests are repeatable.
export type HandlerContext = { store: AppStore; today: string };

type TextContent = { type: "text"; text: string };

export type ToolSuccess<T> = { content: TextContent[]; structuredContent: T };
export type ToolFailure = { isError: true; content: TextContent[] };
export type ToolResult<T> = ToolSuccess<T> | ToolFailure;

function success<T>(text: string, structuredContent: T): ToolSuccess<T> {
  return { content: [{ type: "text", text }], structuredContent };
}

function failure(error: StoreError): ToolFailure {
  return { isError: true, content: [{ type: "text", text: error.message }] };
}

function describeRow(application: ListedApplication): string {
  const followUp =
    application.followUpOn === undefined
      ? "no follow-up"
      : `follow-up ${application.followUpOn}${application.followUpDue ? " (DUE)" : ""}`;
  return `${application.id}: ${application.company}, ${application.role}, ${application.status}, applied ${application.appliedOn}, ${followUp}`;
}

function withDueFlag(application: Application, today: string): ListedApplication {
  return { ...application, followUpDue: isFollowUpDue(application, today) };
}

export function listApplicationsHandler({
  store,
  today,
}: HandlerContext): ToolResult<ApplicationListOutput> {
  const applications = listApplications(store.state, today);
  const dueCount = applications.filter((a) => a.followUpDue).length;
  const heading = `${applications.length} applications, ${dueCount} due for follow-up (today is ${today}).`;
  return success([heading, ...applications.map(describeRow)].join("\n"), {
    today,
    dueCount,
    applications,
  });
}

export function followUpsDueHandler({
  store,
  today,
}: HandlerContext): ToolResult<ApplicationListOutput> {
  const applications = followUpsDue(store.state, today);
  const heading =
    applications.length === 0
      ? `No follow-ups are due (today is ${today}).`
      : `${applications.length} follow-ups due (today is ${today}).`;
  return success([heading, ...applications.map(describeRow)].join("\n"), {
    today,
    dueCount: applications.length,
    applications,
  });
}

export function addApplicationHandler(
  { store, today }: HandlerContext,
  input: AddApplicationInput
): ToolResult<ApplicationChangeOutput> {
  const result = addApplication(store.state, input);
  if (!result.ok) return failure(result.error);
  store.state = result.value.state;
  const application = withDueFlag(result.value.application, today);
  return success(`Added ${describeRow(application)}`, { application });
}

export function updateApplicationHandler(
  { store, today }: HandlerContext,
  input: UpdateApplicationInput
): ToolResult<ApplicationChangeOutput> {
  const { id, ...patch } = input;
  const result = updateApplication(store.state, id, patch);
  if (!result.ok) return failure(result.error);
  store.state = result.value.state;
  const application = withDueFlag(result.value.application, today);
  return success(`Updated ${describeRow(application)}`, { application });
}

export function deleteApplicationHandler(
  { store }: HandlerContext,
  input: IdInput
): ToolResult<DeleteApplicationOutput> {
  const result = deleteApplication(store.state, input.id);
  if (!result.ok) return failure(result.error);
  store.state = result.value.state;
  const deleted = result.value.application;
  return success(
    `Deleted ${deleted.id}: ${deleted.company}, ${deleted.role}.`,
    { deleted }
  );
}

export const FOLLOW_UP_GUIDANCE: readonly string[] = [
  "Write a short follow-up email: a subject line and at most 120 words.",
  "Name the role and say when the application was sent.",
  "Give one specific reason for interest in this company, then ask about next steps or the timeline.",
  "Stay warm and direct. Do not apologise for writing and do not pressure.",
  "Match the tone to the status: checking in if applied, keeping momentum if interviewing.",
  "Use only the details given here. Do not invent names, interviews or conversations.",
  "Leave a placeholder for anything unknown, such as the recipient's name.",
];

export function draftFollowUpHandler(
  { store, today }: HandlerContext,
  input: IdInput
): ToolResult<DraftFollowUpOutput> {
  const found = getApplication(store.state, input.id);
  if (!found.ok) return failure(found.error);
  const application = found.value;
  const daysSinceApplied = daysBetween(application.appliedOn, today);
  const text = [
    `Write a follow-up email for this application, following the guidance.`,
    `Company: ${application.company}`,
    `Role: ${application.role}`,
    `Status: ${application.status}`,
    `Applied: ${application.appliedOn} (${daysSinceApplied} days ago)`,
    `Guidance:`,
    ...FOLLOW_UP_GUIDANCE.map((line) => `- ${line}`),
  ].join("\n");
  return success(text, {
    application,
    daysSinceApplied,
    followUpDue: isFollowUpDue(application, today),
    guidance: [...FOLLOW_UP_GUIDANCE],
  });
}
