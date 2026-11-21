# Testing the new mcp-use evals CLI (and contributing back)

We're trying Manufact's newest feature, `mcp-use evals` (released in mcp-use v2.12.9 / @mcp-use/cli v5.4.0), on my existing application-tracker MCP App, then turning what we learn into issues, a docs example or a PR on the mcp-use repo.

**Why:** I already have 4 issues and 2 merged PRs on mcp-use. Evals are what Manufact is shipping right now, so honest feedback and fixes here are the most useful contribution I can make, and they keep me on the team's radar.

**What the feature does:** eval suites live in YAML files, run on Manufact Cloud, and can gate CI. `run --wait` exits with code 1 unless every run passes, and `--markdown-file` writes a report for PR comments or CI job summaries.

## Rules

- **Read the current docs before running anything.** Start with the mcp-use CLI reference for `evals` and the eval suite YAML format, then the repo's CONTRIBUTING file. Don't rely on remembered commands, flags or YAML keys. If the docs and your memory disagree, the docs win.
- **Scope is my decision.** Do only what's in the steps below. Ask me before adding or removing anything.
- **Budget guard (important).** I'm on the Free plan: $5 a month, hard limit, with **$4.00 left** at the start of this work (2026-11-21). An eval run costs about $0.70 and a checklist run about $0.90, so at most 5 eval runs. Plan: 1 run in Step 3, 1–2 in Step 4, 2 spare for retries; no checklist runs. **Ask me before every command that starts a cloud eval run or checklist run**, say how many runs you expect it to use, and log it in `RUNS.md` afterwards. Anything that runs locally or only reads (validate, list, get, export, options, models) is fine without asking.
- Use pnpm, not npm (if a tool requires something else, tell me why).
- Comments only explain *why*, never *what*.
- When you create or replace a file, show me the full file.
- One step at a time. After each step, stop, summarise in two or three sentences, give me a short test checklist, and wait for "next".
- **Fake data only.** The tracker uses fictional Jane Doe data. Never use my real applications log.
- **Never post anything publicly** (issues, PRs, comments). Draft them and show me. I post them myself.
- **Secrets** (Manufact API keys, tokens) go in gitignored env files or GitHub Actions secrets. Never commit them or print them.
- Keep `FRICTION.md` and `RUNS.md` from the first command.

## FRICTION.md

Log anything that slowed me down. One entry each:

- what I was trying to do
- what happened (exact error text if any)
- what I expected
- tag: `docs` / `cli` / `bug` / `ux`
- severity: blocker / annoying / minor

Don't work around a problem silently: log it first.

## RUNS.md

One line per cloud run: date, exact command (no secrets), runs used (check the dashboard's usage), estimated cost, result, and remaining allowance.

## Steps

### Step 1: Read and set up (no cost)
- Read the evals CLI docs, the YAML suite format and CONTRIBUTING.
- Check the tracker app is deployed on Manufact Cloud and still works.
- Update `@mcp-use/cli` to a version that includes `evals` and log in.
- Run the read-only commands (`evals options`, `evals models`, `evals list`) to see what's available.
- Start `FRICTION.md` and `RUNS.md`.

Test: CLI is updated and logged in; I know the YAML format in two or three bullets; I know which clients and models I can pick.

### Step 2: Write the smallest useful suite (no cost)
- Write one suite in `evals/` with one or two steps, one client and one model. For example: "ask which applications are due for a follow-up" and check the right tool is called.
- Validate it locally using whatever the docs say validates without starting a run. If nothing validates without pushing, tell me before pushing.
- Log anything confusing about the YAML format (missing schema, unclear keys, unhelpful validation errors).

Test: the file validates; I can explain every key in it.

### Step 3: First cloud run (about 1 run, ask first)
- `push` the suite, then one `run --wait` with `--json-file` and `--markdown-file`.
- Afterwards, check the dashboard to find out exactly how many runs were used. This tells us whether a "run" is a whole suite or one client-and-model pair.
- Try the read-only commands on the result: `runs`, `report`, `get`, `export`.

Test: the run finishes; the Markdown report is readable; `RUNS.md` shows the real usage.

### Step 4: GitHub Actions gate (1 to 2 runs, ask first)
- Add a workflow that runs the suite with `--wait` and writes the Markdown report to the job summary.
- **Trigger it manually only** (`workflow_dispatch`) so it can't burn the allowance on every push.
- Run it once passing. If budget allows and I agree, run it once with a deliberately failing step to confirm the job fails.

Test: the job passes and shows the report; a failing eval fails the job (if we ran that check).

### Step 5: Turn friction into contributions (no cost)
- Sort `FRICTION.md`. Pick the one to three most useful items.
- Search mcp-use's GitHub issues for duplicates first.
- Draft clear issues with reproduction steps. For anything genuinely small, draft a PR, following CONTRIBUTING.
- If the YAML format was hard to learn, draft a short docs example: "gate your MCP server's CI on evals," using my workflow as the basis. Ask the maintainers first whether they want it before writing a PR for it.
- Show me every draft before anything is posted.

Test: each draft is specific, reproducible, polite and follows their contribution rules.

## Done when

- [ ] One eval suite runs on Manufact Cloud for my tracker app
- [ ] A manually triggered GitHub Actions workflow gates on it and shows the report
- [ ] `RUNS.md` shows every cloud run and we stayed within the Free allowance
- [ ] `FRICTION.md` has honest, tagged notes
- [ ] One to three issues, a PR or a docs example drafted for me to post