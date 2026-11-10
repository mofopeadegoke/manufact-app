# FRICTION.md

Honest notes on anything that slowed the build down. Versions: `mcp-use` 2.12.3, `create-mcp-use-app` 2.1.1, `@mcp-use/client` 2.4.5, pnpm 12.18.0, Node 26.13.0, Windows 11.

Severity: **blocker** / **annoying** / **minor**.

## Step 0: reading the docs

| # | Trying to do | What happened | Expected | Severity |
| - | - | - | - | - |
| 1 | Learn how to preview a View in the Inspector | The "Debug widgets in the Inspector" page still uses v1 terms (`widget.name`, `resources/`, `useWidget()`) and links to `/v1/...` | The page to match the v2 Views docs (`view.name`, `views/`, `useToolContext()`) | annoying |
| 2 | Find how to unit-test a tool handler | No recipe anywhere in the docs; the scaffold has no test runner or `test` script. Only the Inspector and the CLI client are documented | A short "testing tools" page, or one example test in the template | annoying |
| 3 | Find out whether a private GitHub repo can be deployed | Not stated on the deploy or integrations pages | One sentence saying private repos are (or are not) supported | minor |
| 4 | Find out how long a free-tier server stays up before scaling to zero | Not stated; only "Prevent Scale to Zero" on paid plans is described | The idle timeout, since it decides whether in-memory demo state is usable | minor |
| 5 | Find which Claude and ChatGPT plans can connect a custom MCP server | Not in the mcp-use docs; had to read Anthropic's help centre | A link out to each vendor's requirements from the "connect clients" page | minor |

## Step 1: scaffold and run

| # | Trying to do | What happened | Expected | Severity |
| - | - | - | - | - |
| 6 | Scaffold into an existing repo root (the repo already had `CLAUDE.md` and `.git`) | The scaffolder only creates a new named subfolder, so I scaffolded in a temp folder and moved the files | A `.` target, or a documented way to scaffold into the current directory | minor |
| 7 | Scaffold with the default agent skill | The same `mcp-apps-builder` skill (9 files) was written three times: `.agents/`, `.claude/` and `.cursor/`, 27 files in a fresh repo | One copy, or a prompt/flag to pick which agents to install for | minor |
| 8 | Run `mcp-use client connect dev http://localhost:3000/mcp` for the first time | The CLI printed "installing @mcp-use/client…", installed it, then in the same run printed "@mcp-use/client is not installed" and exited with an error. The second run worked | Either the first run succeeds after the auto-install, or it tells me to re-run | annoying |
| 9 | Same command as #8 | The auto-install edited `package.json` without asking and put `@mcp-use/client` under `dependencies`, although it is a dev/verification tool | A prompt before changing `package.json`, and `devDependencies` as the target | annoying |
| 10 | Call a tool with invalid input from the CLI client (`tools call say-hello` with no `name`) | Output was only "Tool say-hello returned an error." The real reason ("name: Invalid input: expected string, received undefined") appears only with `--json` | The tool's error text printed in the default output too | annoying |
| 11 | Set scripts with `pnpm pkg set scripts.test:watch=...` | Not an mcp-use issue: pnpm 12 rejects `:` in a property path. Edited `package.json` by hand | n/a (pnpm) | minor |
