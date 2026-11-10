import { z } from "zod";
import { isIsoDate } from "./dates.js";
import { STATUSES } from "./types.js";

const isoDate = (description: string) =>
  z
    .string()
    .refine(isIsoDate, "Must be a real calendar date in YYYY-MM-DD format")
    .describe(description);

const id = z
  .string()
  .min(1, "id is required")
  .describe('Application id as returned by list_applications, e.g. "app-3"');

const link = z
  .url({ protocol: /^https?$/, error: "Must be an http(s) URL" })
  .describe("Link to the job posting (http or https)");

const role = z.string().trim().min(1, "role cannot be empty");

// Inputs are strict so a misspelled field is reported to the model
// instead of being dropped and leaving it believing the change was made.
export const noInput = z.strictObject({});

export const addApplicationInput = z.strictObject({
  company: z
    .string()
    .trim()
    .min(1, "company cannot be empty")
    .describe("Company name"),
  role: role.describe("Job title applied for"),
  link: link.optional(),
  appliedOn: isoDate("Date the application was sent, YYYY-MM-DD"),
  followUpOn: isoDate(
    "Date to follow up, YYYY-MM-DD. Defaults to 10 days after appliedOn"
  ).optional(),
});

export const updateApplicationInput = z.strictObject({
  id,
  status: z
    .enum(STATUSES)
    .optional()
    .describe(
      "New status. rejected and offer also remove the follow-up date"
    ),
  followUpOn: isoDate(
    "New follow-up date, YYYY-MM-DD. Not allowed on rejected or offer applications"
  ).optional(),
  link: link.optional(),
  role: role.describe("New job title").optional(),
});

export const idInput = z.strictObject({ id });

const application = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  link: z.string().optional(),
  status: z.enum(STATUSES),
  appliedOn: z.string().describe("YYYY-MM-DD"),
  followUpOn: z
    .string()
    .optional()
    .describe("YYYY-MM-DD; absent for rejected and offer applications"),
});

const listedApplication = application.extend({
  followUpDue: z
    .boolean()
    .describe("True when the follow-up date is today or earlier"),
});

export const applicationListOutput = z.object({
  today: z.string().describe("The server's current date (UTC), YYYY-MM-DD"),
  dueCount: z.number().int().describe("How many follow-ups are due"),
  applications: z
    .array(listedApplication)
    .describe("Due follow-ups first, then most recently applied"),
});

export const applicationChangeOutput = z.object({
  application: listedApplication,
});

export const deleteApplicationOutput = z.object({
  deleted: application,
});

export const draftFollowUpOutput = z.object({
  application,
  daysSinceApplied: z.number().int(),
  followUpDue: z.boolean(),
  guidance: z
    .array(z.string())
    .describe("Writing guidance for the follow-up email"),
});

export type AddApplicationInput = z.infer<typeof addApplicationInput>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationInput>;
export type IdInput = z.infer<typeof idInput>;
export type ApplicationListOutput = z.infer<typeof applicationListOutput>;
export type ApplicationChangeOutput = z.infer<typeof applicationChangeOutput>;
export type DeleteApplicationOutput = z.infer<typeof deleteApplicationOutput>;
export type DraftFollowUpOutput = z.infer<typeof draftFollowUpOutput>;
