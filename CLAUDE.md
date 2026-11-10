# Application Tracker MCP App (built with mcp-use)

A small MCP App that shows a job-application pipeline as an interactive widget inside Claude or ChatGPT. Built with Manufact's open-source `mcp-use` TypeScript SDK and deployed on Manufact Cloud.

**Purpose:** a job application to Manufact (founding software engineer). The point is to show I used their SDK for real, deployed it on their platform, and noticed where the developer experience can improve.

**Time box: 3–4 hours total.** Tell me as soon as a step looks likely to run over. Do not cut or change scope yourself: tell me the options and I decide.

## Rules

- **Read the current mcp-use docs before writing any code.** The SDK changes fast. Do not rely on remembered APIs. Use the official quickstart and scaffolding command. If the docs and your memory disagree, the docs win.
- **Scope is my decision.** Build only what's listed under Scope. If something seems missing or unnecessary, ask me before adding or removing it.
- Use pnpm, not npm (if the scaffolder requires something else, tell me why).
- TypeScript, strict mode.
- Comments only explain *why*, never *what*.
- When you create or replace a file, show me the full file.
- One step at a time. After each step, stop, summarize in two or three sentences, give me a short test checklist, and wait for "next".
- **Fake data only.** Seed with a fictional person (Jane Doe) and fictional companies. Never read, import or reference any real applications log or personal data.
- No Manufact branding, logos or styling in the widget.
- Keep `FRICTION.md` from the first minute (see below).

## Scope

### In
- **Tools:**
  - `list_applications`: all applications, with which ones are due for follow-up.
  - `followups_due`: applications whose follow-up date is today or earlier.
  - `add_application`: company, role, link, applied date; follow-up date defaults to applied + 10 days.
  - `update_application`: change status, follow-up date, link or role.
  - `delete_application`: remove one by id.
  - `draft_followup`: returns the application's details (company, role, applied date, days since applying, status) plus short writing guidance, so **the model in Claude or ChatGPT writes the email**. No LLM call or API key on the server.
- **Widget:** a pipeline table (company, role, status, applied, follow-up), due rows first and clearly marked (not by colour alone). From the widget I can edit status, delete a row (with a confirmation step), and ask for a follow-up draft. Use the widget-to-tool pattern the docs recommend.
- **Data:** in-memory store seeded from a JSON file with 8–10 fictional rows (mix of applied, interviewing, rejected, offer). Data resets on restart, which is fine.
- **Automated tests** (Vitest unless the scaffold already uses another runner):
  - the pure date logic (`isFollowUpDue`, default follow-up date)
  - each tool handler: valid input, invalid input, unknown id
  - widget tests only if the docs show a straightforward way; otherwise ask me
- Deployed on Manufact Cloud and tested in at least one real client (Claude or ChatGPT) plus their Inspector.
- README.

### Out
- A persistent database.
- Anything not listed under "In": ask me first.

## Data shape

```ts
type Status = "applied" | "interviewing" | "rejected" | "offer";

type Application = {
  id: string;
  company: string;
  role: string;
  link?: string;
  status: Status;
  appliedOn: string;     // ISO date
  followUpOn?: string;   // ISO date; none for rejected/offer
};
```

Keep date logic and store operations in pure functions, separate from the MCP tool wiring, so they're easy to test.

## FRICTION.md (important)

From the very first command, log anything that slowed me down: confusing docs, unclear errors, missing examples, Inspector or deploy issues, anything that didn't match the docs. One line each, with:

- what I was trying to do
- what happened
- what I expected
- severity: blocker / annoying / minor

This file is where the contribution comes from. Don't silently work around a problem: log it first.

## Steps

### Step 1: Scaffold and run (≈20 min)
Read the quickstart. Scaffold a TypeScript MCP App with the official command. Run it locally and open it in the Inspector. Set up the test runner. Start `FRICTION.md`.

Test: the starter tool/widget works in the Inspector; `pnpm test` runs.

### Step 2: Data, store and tests (≈35 min)
Seed JSON, the `Application` type, pure store functions (list, add, update, delete) and date logic, with their tests written alongside.

Test: `pnpm test` passes; tests cover due/not-due edge cases (today, yesterday, no follow-up date) and unknown ids.

### Step 3: Tools (≈40 min)
Wire up all six tools with input validation the way the SDK docs recommend. Add tool handler tests.

Test: in the Inspector, each tool works; invalid input gives a clear error; `draft_followup` returns details the model can write from; `pnpm test` passes.

### Step 4: Widget (≈50 min)
Pipeline table with due rows first. Edit status, delete with confirmation, and "Draft follow-up" actions that call the tools. Readable at narrow widths, visible keyboard focus.

Test: in the Inspector's widget preview, editing, deleting and drafting work and the table updates.

### Step 5: Deploy and try it in a real client (≈30 min)
Deploy to Manufact Cloud the way the docs recommend. Connect it to Claude or ChatGPT. Try: "what follow-ups are due?", "mark Acme as interviewing", "draft a follow-up for Globex".

Test: the widget and all actions work in the real client. Note the deployed URL.

### Step 6: README and contribution (≈30 min)
- README: what it is, example prompts, the deployed URL, a screenshot, "fake data only", how to run the tests, and a short "What I noticed" section summarizing `FRICTION.md` in two or three bullets.
- Pick the most useful, smallest item from `FRICTION.md`. Check the mcp-use GitHub repo for an existing issue first. Then draft either a GitHub issue with clear reproduction steps, or a small PR if it's genuinely quick.
- Show me the draft before anything is posted. I post it myself.

Test: README reads clearly to a stranger; the issue/PR draft is specific, reproducible and polite.

## Decisions (planning session, 2026-11-10)

Agreed before Step 1. These refine the sections above; where they differ, these win.

- **SDK version:** mcp-use v2 (2.12.x). v2 calls widgets **Views** (`views/<name>/view.tsx`, `useToolContext`, `useCallTool`, `useSendFollowUp`). Anything using `resources/`, `useWidget` or `mcp-use/server` is v1 and wrong.
- **Working style:** each step ends with a short "how this works in mcp-use" explanation as well as the summary and test checklist. Claude commits locally per step; I push.
- **Sittings:** two. Steps 1–3, then Steps 4–6. Planning time is outside the 3–4 hours.
- **Scaffold:** `mcp-apps` template via pnpm, moved into the repo root, bundled agent skill kept.
- **Seed data:** the seed JSON stores day offsets (e.g. `appliedDaysAgo`), converted to ISO dates at server start, so the demo always has a mix of due and not-due rows. The `Application` type is unchanged.
- **Dates:** strict `YYYY-MM-DD`. "Today" is the server's UTC date; pure functions take `today` as a parameter.
- **Follow-up rules:** moving to `rejected` or `offer` clears `followUpOn`. Moving back leaves it empty. Setting a follow-up date on a rejected/offer row is an error.
- **Validation:** `link` must be http(s). Duplicate company + role allowed. `followUpOn` before `appliedOn` rejected. An update with no fields is an error.
- **Ids:** short readable ids (`app-1`). Tools take an id only; the model finds it via `list_applications`.
- **Tool names:** snake_case as listed under Scope, unless the SDK rejects them.
- **View:** bound to `list_applications` only (one View binds to one tool). `followups_due` returns text and data only. Edit status and delete call tools directly. "Draft follow-up" sends a message into the chat so the model writes the email; the button is hidden if the host cannot accept messages. No template branding in the View; the default landing page stays.
- **Tests:** Vitest. Tool handlers are plain functions separate from `server.tool` registration and are tested directly. No View unit tests; verify in the Inspector and use `mcp-use screenshot` for the README.
- **Deploy:** Manufact Cloud free tier via the GitHub integration; `--no-github` local upload is the fallback. Use `pnpm run deploy`, never `pnpm deploy`.
- **Shared store:** the deployed store is public, shared, and resets on idle (scale to zero) and on deploy. Accepted; one line in the README. No reset tool.
- **Client:** Claude first (custom connectors work on every plan; Free allows one). ChatGPT only if time is left.
- **Repo:** private during the build, made public at the end.

## Done when

- [ ] All six tools and the widget work, fake data only
- [ ] `pnpm test` passes
- [ ] Deployed on Manufact Cloud and working in a real client
- [ ] `FRICTION.md` has honest notes from the whole build
- [ ] README with deployed URL, screenshot and "What I noticed"
- [ ] One issue or PR drafted for me to post