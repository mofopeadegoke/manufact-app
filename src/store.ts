import { defaultFollowUpDate, isFollowUpDue } from "./dates.js";
import { isClosed, type Application, type Status } from "./types.js";

export type StoreState = {
  applications: readonly Application[];
  // Kept separately so a deleted row's id is never handed out again.
  nextId: number;
};

export type StoreErrorCode =
  | "not_found"
  | "empty_update"
  | "follow_up_before_applied"
  | "follow_up_on_closed";

export type StoreError = { code: StoreErrorCode; message: string };

// Expected failures are returned, not thrown, so the tool layer can turn
// each one into a readable error for the model without a try/catch.
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: StoreError };

export type Change = { state: StoreState; application: Application };

export type ListedApplication = Application & { followUpDue: boolean };

export type NewApplication = {
  company: string;
  role: string;
  link?: string;
  appliedOn: string;
  followUpOn?: string;
};

export type ApplicationPatch = {
  status?: Status;
  followUpOn?: string;
  link?: string;
  role?: string;
};

const ID_PREFIX = "app-";

function fail<T>(code: StoreErrorCode, message: string): Result<T> {
  return { ok: false, error: { code, message } };
}

function notFound<T>(id: string): Result<T> {
  return fail("not_found", `No application with id "${id}".`);
}

export function createState(applications: readonly Application[]): StoreState {
  const highest = applications.reduce((max, application) => {
    const n = Number(application.id.slice(ID_PREFIX.length));
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);
  return { applications, nextId: highest + 1 };
}

export function listApplications(
  state: StoreState,
  today: string
): ListedApplication[] {
  return state.applications
    .map((application) => ({
      ...application,
      followUpDue: isFollowUpDue(application, today),
    }))
    .sort((a, b) => {
      if (a.followUpDue !== b.followUpDue) return a.followUpDue ? -1 : 1;
      // Among due rows the longest-overdue comes first; the rest are newest first.
      const order = a.followUpDue
        ? (a.followUpOn ?? "").localeCompare(b.followUpOn ?? "")
        : b.appliedOn.localeCompare(a.appliedOn);
      return order !== 0 ? order : a.id.localeCompare(b.id);
    });
}

export function followUpsDue(
  state: StoreState,
  today: string
): ListedApplication[] {
  return listApplications(state, today).filter((a) => a.followUpDue);
}

export function getApplication(
  state: StoreState,
  id: string
): Result<Application> {
  const application = state.applications.find((a) => a.id === id);
  return application ? { ok: true, value: application } : notFound(id);
}

export function addApplication(
  state: StoreState,
  input: NewApplication
): Result<Change> {
  const followUpOn = input.followUpOn ?? defaultFollowUpDate(input.appliedOn);
  if (followUpOn < input.appliedOn) {
    return fail(
      "follow_up_before_applied",
      `Follow-up date ${followUpOn} is before the applied date ${input.appliedOn}.`
    );
  }

  const application: Application = {
    id: `${ID_PREFIX}${state.nextId}`,
    company: input.company,
    role: input.role,
    ...(input.link !== undefined ? { link: input.link } : {}),
    status: "applied",
    appliedOn: input.appliedOn,
    followUpOn,
  };

  return {
    ok: true,
    value: {
      state: {
        applications: [...state.applications, application],
        nextId: state.nextId + 1,
      },
      application,
    },
  };
}

export function updateApplication(
  state: StoreState,
  id: string,
  patch: ApplicationPatch
): Result<Change> {
  const hasChange =
    patch.status !== undefined ||
    patch.followUpOn !== undefined ||
    patch.link !== undefined ||
    patch.role !== undefined;
  if (!hasChange) {
    return fail(
      "empty_update",
      "Nothing to update: give at least one of status, followUpOn, link or role."
    );
  }

  const found = getApplication(state, id);
  if (!found.ok) return found;
  const current = found.value;

  const status = patch.status ?? current.status;
  const closed = isClosed(status);

  if (closed && patch.followUpOn !== undefined) {
    return fail(
      "follow_up_on_closed",
      `A ${status} application cannot have a follow-up date.`
    );
  }
  if (patch.followUpOn !== undefined && patch.followUpOn < current.appliedOn) {
    return fail(
      "follow_up_before_applied",
      `Follow-up date ${patch.followUpOn} is before the applied date ${current.appliedOn}.`
    );
  }

  const { followUpOn: currentFollowUp, ...rest } = current;
  const followUpOn = closed ? undefined : (patch.followUpOn ?? currentFollowUp);

  const application: Application = {
    ...rest,
    status,
    ...(patch.role !== undefined ? { role: patch.role } : {}),
    ...(patch.link !== undefined ? { link: patch.link } : {}),
    ...(followUpOn !== undefined ? { followUpOn } : {}),
  };

  return {
    ok: true,
    value: {
      state: {
        ...state,
        applications: state.applications.map((a) =>
          a.id === id ? application : a
        ),
      },
      application,
    },
  };
}

export function deleteApplication(
  state: StoreState,
  id: string
): Result<Change> {
  const found = getApplication(state, id);
  if (!found.ok) return found;

  return {
    ok: true,
    value: {
      state: {
        ...state,
        applications: state.applications.filter((a) => a.id !== id),
      },
      application: found.value,
    },
  };
}
