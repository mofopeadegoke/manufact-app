import {
  ModelContext,
  useCallTool,
  useHostContext,
  useOpenExternal,
  useSendFollowUp,
  useToolContext,
  useViewTheme,
} from "mcp-use/react";
import { useState } from "react";
import { daysBetween } from "../../src/dates.js";
import type { ApplicationListOutput } from "../../src/schemas.js";
import { isClosed, STATUSES, type Status } from "../../src/types.js";
import "./view.css";

type Row = ApplicationListOutput["applications"][number];

type Notice = { kind: "info" | "error"; text: string };

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function dueLabel(row: Row, today: string): string {
  if (row.followUpOn === undefined) return "";
  const overdueBy = daysBetween(row.followUpOn, today);
  if (overdueBy === 0) return "Due today";
  return `Overdue by ${overdueBy} ${overdueBy === 1 ? "day" : "days"}`;
}

export default function Pipeline() {
  const tool = useToolContext<"list_applications">();
  const { hostCapabilities, locale } = useHostContext();
  const theme = useViewTheme();
  const list = useCallTool("list_applications");
  const update = useCallTool("update_application");
  const remove = useCallTool("delete_application");
  const sendFollowUp = useSendFollowUp();
  const openExternal = useOpenExternal();

  // The table first shows what the tool call returned, then whatever the
  // server says after each change, so sorting and due flags are never guessed here.
  const [refreshed, setRefreshed] = useState<ApplicationListOutput>();
  const [busyId, setBusyId] = useState<string>();
  const [confirmingId, setConfirmingId] = useState<string>();
  const [notice, setNotice] = useState<Notice>();

  if (tool.status === "pending") {
    return (
      <div className="tracker" data-theme={theme}>
        <p className="tracker-empty" role="status">
          Loading applications…
        </p>
      </div>
    );
  }

  if (tool.status === "error") {
    return (
      <div className="tracker" data-theme={theme}>
        <p className="tracker-notice" data-kind="error" role="alert">
          Could not load applications: {tool.error.message}
        </p>
      </div>
    );
  }

  const { applications, today, dueCount } = refreshed ?? tool.toolOutput;
  const canSendMessage = hostCapabilities?.message !== undefined;
  const canOpenLinks = hostCapabilities?.openLinks !== undefined;

  const formatDate = (isoDate: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      // Dates are calendar days stored in UTC; formatting in the viewer's
      // zone could show the previous day.
      timeZone: "UTC",
    }).format(new Date(`${isoDate}T00:00:00Z`));

  async function run(row: Row, action: () => Promise<string>) {
    setBusyId(row.id);
    setNotice(undefined);
    try {
      const message = await action();
      const next = await list.callTool({});
      setRefreshed(next.structuredContent);
      setNotice({ kind: "info", text: message });
    } catch (error) {
      setNotice({ kind: "error", text: errorText(error) });
    } finally {
      setBusyId(undefined);
    }
  }

  const changeStatus = (row: Row, status: Status) =>
    run(row, async () => {
      await update.callTool({ id: row.id, status });
      return `${row.company} is now ${status}.`;
    });

  const deleteRow = (row: Row) => {
    setConfirmingId(undefined);
    return run(row, async () => {
      await remove.callTool({ id: row.id });
      return `Deleted ${row.company}, ${row.role}.`;
    });
  };

  async function draftFollowUp(row: Row) {
    setNotice(undefined);
    try {
      await sendFollowUp({
        prompt: `Draft a follow-up email for my application to ${row.company} for the ${row.role} role (id ${row.id}). Use the draft_followup tool for the details.`,
      });
      setNotice({
        kind: "info",
        text: `Asked for a follow-up draft for ${row.company}. It will appear in the chat.`,
      });
    } catch (error) {
      setNotice({ kind: "error", text: errorText(error) });
    }
  }

  return (
    <div className="tracker" data-theme={theme}>
      <ModelContext
        content={`The user is looking at the application pipeline table: ${applications.length} applications, ${dueCount} due for follow-up. They can change status and delete rows from the table, so call list_applications again before relying on earlier results.`}
      />

      <header className="tracker-header">
        <h1>Applications</h1>
        <p>
          {applications.length} total, {dueCount} due for follow-up
        </p>
      </header>

      {/* Always mounted so screen readers announce changes to its text. */}
      <p
        className="tracker-notice"
        data-kind={notice?.kind ?? "info"}
        role={notice?.kind === "error" ? "alert" : "status"}
        hidden={notice === undefined}
      >
        {notice?.text}
      </p>

      {applications.length === 0 ? (
        <p className="tracker-empty">
          No applications yet. Ask in chat to add one.
        </p>
      ) : (
        <table className="tracker-table">
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Applied</th>
              <th scope="col">Follow-up</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((row) => {
              const busy = busyId === row.id;
              const confirming = confirmingId === row.id;
              return (
                <tr
                  key={row.id}
                  data-due={row.followUpDue ? "true" : undefined}
                  aria-busy={busy}
                >
                  <th scope="row" data-label="Company">
                    {row.link === undefined ? (
                      row.company
                    ) : (
                      <a
                        href={row.link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => {
                          // Sandboxed hosts block plain links, so the host is
                          // asked to open it when it offers to.
                          if (!canOpenLinks || row.link === undefined) return;
                          event.preventDefault();
                          void openExternal({ url: row.link });
                        }}
                      >
                        {row.company}
                      </a>
                    )}
                  </th>
                  <td data-label="Role">{row.role}</td>
                  <td data-label="Status">
                    <select
                      aria-label={`Status for ${row.company}`}
                      value={row.status}
                      disabled={busy}
                      onChange={(event) =>
                        void changeStatus(row, event.target.value as Status)
                      }
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Applied">
                    <time dateTime={row.appliedOn}>
                      {formatDate(row.appliedOn)}
                    </time>
                  </td>
                  <td data-label="Follow-up">
                    {row.followUpOn === undefined ? (
                      <span className="tracker-muted">None</span>
                    ) : (
                      // One wrapper so the date and its due label stay together
                      // in the narrow layout's two-column grid.
                      <div>
                        <time dateTime={row.followUpOn}>
                          {formatDate(row.followUpOn)}
                        </time>
                        {row.followUpDue && (
                          <span className="tracker-due">
                            <span aria-hidden="true">! </span>
                            {dueLabel(row, today)}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td data-label="Actions">
                    {confirming ? (
                      <div
                        className="tracker-actions"
                        role="group"
                        aria-label={`Confirm deleting ${row.company}`}
                      >
                        <span>Delete {row.company}?</span>
                        <button
                          type="button"
                          className="tracker-danger"
                          onClick={() => void deleteRow(row)}
                        >
                          Yes, delete
                        </button>
                        <button
                          type="button"
                          autoFocus
                          onClick={() => setConfirmingId(undefined)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="tracker-actions">
                        {canSendMessage && !isClosed(row.status) && (
                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`Draft follow-up for ${row.company}`}
                            onClick={() => void draftFollowUp(row)}
                          >
                            Draft follow-up
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={`Delete ${row.company}`}
                          onClick={() => setConfirmingId(row.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!canSendMessage && (
        <p className="tracker-muted tracker-footnote">
          This app can't send messages from the table here. To get a follow-up
          email, ask in chat: "draft a follow-up for" and the company name.
        </p>
      )}
    </div>
  );
}
