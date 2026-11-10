import type { Application } from "./types.js";

export const DEFAULT_FOLLOW_UP_DAYS = 10;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  // JavaScript rolls 2026-02-30 over into March instead of rejecting it,
  // so a date only counts as real if it survives the round trip unchanged.
  return !Number.isNaN(parsed.getTime()) && toIsoDate(parsed) === value;
}

// Dates are calendar days with no time zone, so all arithmetic stays in UTC
// to keep daylight-saving changes from shifting a result by a day.
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toUtcMs(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getTime();
}

export function todayUtc(now: Date = new Date()): string {
  return toIsoDate(now);
}

export function addDays(isoDate: string, days: number): string {
  return toIsoDate(new Date(toUtcMs(isoDate) + days * MS_PER_DAY));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

export function defaultFollowUpDate(appliedOn: string): string {
  return addDays(appliedOn, DEFAULT_FOLLOW_UP_DAYS);
}

export function isFollowUpDue(
  application: Pick<Application, "followUpOn">,
  today: string
): boolean {
  if (application.followUpOn === undefined) return false;
  // ISO dates sort the same as text, so no parsing is needed to compare them.
  return application.followUpOn <= today;
}
