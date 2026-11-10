import { MCPServer } from "mcp-use";
import { todayUtc } from "./src/dates.js";
import {
  addApplicationHandler,
  deleteApplicationHandler,
  draftFollowUpHandler,
  followUpsDueHandler,
  listApplicationsHandler,
  updateApplicationHandler,
  type AppStore,
  type HandlerContext,
} from "./src/handlers.js";
import {
  addApplicationInput,
  applicationChangeOutput,
  applicationListOutput,
  deleteApplicationOutput,
  draftFollowUpOutput,
  idInput,
  noInput,
  updateApplicationInput,
} from "./src/schemas.js";
import { loadSeed } from "./src/seed.js";
import { createState } from "./src/store.js";

const server = new MCPServer({
  name: "application-tracker",
  title: "Application Tracker",
  version: "1.0.0",
  description:
    "Tracks a job-application pipeline and which follow-ups are due. Demo with fictional data.",
  instructions:
    "Applications are identified by id (e.g. app-3). Call list_applications first to find the id for a company. Dates are YYYY-MM-DD. To write a follow-up email, call draft_followup and write the email yourself from what it returns.",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// mcp-use advises against module-level state because it is lost on restart
// and not shared between instances. That is the accepted trade-off here:
// the project is a demo whose data is meant to reset.
const store: AppStore = { state: createState(loadSeed(todayUtc())) };

// Built per call so "today" is correct on a server that runs past midnight.
const context = (): HandlerContext => ({ store, today: todayUtc() });

export const listApplications = server.tool(
  {
    name: "list_applications",
    title: "List applications",
    description:
      "List every job application with its id, status and dates. Applications due for follow-up come first and are flagged.",
    inputSchema: noInput,
    outputSchema: applicationListOutput,
    view: {
      name: "pipeline",
      description:
        "Interactive table of job applications with status editing, delete and follow-up drafting",
      // The View draws its own border so it looks the same in every host.
      prefersBorder: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async () => listApplicationsHandler(context())
);

export const followupsDue = server.tool(
  {
    name: "followups_due",
    title: "Follow-ups due",
    description:
      "List only the applications whose follow-up date is today or earlier.",
    inputSchema: noInput,
    outputSchema: applicationListOutput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async () => followUpsDueHandler(context())
);

export const addApplication = server.tool(
  {
    name: "add_application",
    title: "Add application",
    description:
      "Add a job application with status applied. The follow-up date defaults to 10 days after the applied date.",
    inputSchema: addApplicationInput,
    outputSchema: applicationChangeOutput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async (input) => addApplicationHandler(context(), input)
);

export const updateApplication = server.tool(
  {
    name: "update_application",
    title: "Update application",
    description:
      "Change an application's status, follow-up date, link or role. Give the id and at least one field to change.",
    inputSchema: updateApplicationInput,
    outputSchema: applicationChangeOutput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async (input) => updateApplicationHandler(context(), input)
);

export const deleteApplication = server.tool(
  {
    name: "delete_application",
    title: "Delete application",
    description:
      "Permanently remove one application by id. Confirm with the user before calling.",
    inputSchema: idInput,
    outputSchema: deleteApplicationOutput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    },
  },
  async (input) => deleteApplicationHandler(context(), input)
);

export const draftFollowup = server.tool(
  {
    name: "draft_followup",
    title: "Draft follow-up",
    description:
      "Get one application's details and writing guidance so you can write the follow-up email. This tool does not write the email; you do.",
    inputSchema: idInput,
    outputSchema: draftFollowUpOutput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async (input) => draftFollowUpHandler(context(), input)
);

export default server;
