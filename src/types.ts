export const STATUSES = ["applied", "interviewing", "rejected", "offer"] as const;

export type Status = (typeof STATUSES)[number];

export type Application = {
  id: string;
  company: string;
  role: string;
  link?: string;
  status: Status;
  appliedOn: string;
  followUpOn?: string;
};

// A rejection or an offer ends the chase, so those rows never carry a follow-up date.
export function isClosed(status: Status): boolean {
  return status === "rejected" || status === "offer";
}
