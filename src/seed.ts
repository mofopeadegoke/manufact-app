import { z } from "zod";
import { addDays } from "./dates.js";
import seedRows from "./seed.json" with { type: "json" };
import { isClosed, STATUSES, type Application } from "./types.js";

// The seed stores day offsets, not dates, so a server started months from
// now still shows a mix of due and not-due rows instead of everything overdue.
const seedRowSchema = z
  .object({
    company: z.string().min(1),
    role: z.string().min(1),
    link: z.string().optional(),
    status: z.enum(STATUSES),
    appliedDaysAgo: z.number().int().min(0),
    followUpInDays: z.number().int().optional(),
  })
  .refine((row) => !(isClosed(row.status) && row.followUpInDays !== undefined), {
    message: "A rejected or offer row cannot have a follow-up",
  });

export function materializeSeed(rows: unknown, today: string): Application[] {
  return z
    .array(seedRowSchema)
    .parse(rows)
    .map((row, index) => ({
      id: `app-${index + 1}`,
      company: row.company,
      role: row.role,
      ...(row.link !== undefined ? { link: row.link } : {}),
      status: row.status,
      appliedOn: addDays(today, -row.appliedDaysAgo),
      ...(row.followUpInDays !== undefined
        ? { followUpOn: addDays(today, row.followUpInDays) }
        : {}),
    }));
}

export function loadSeed(today: string): Application[] {
  return materializeSeed(seedRows, today);
}
