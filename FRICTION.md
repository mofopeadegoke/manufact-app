# FRICTION.md

Honest notes on anything that slowed the build down. Versions: `mcp-use` 2.12.3, `create-mcp-use-app` 2.1.1, `@mcp-use/client` 2.4.5, pnpm 12.18.0, Node 26.13.0, Windows 11.

Severity: **blocker** / **annoying** / **minor**. Sorted most urgent first. Numbers are the original log order. Items already drafted as an issue or PR (#10, #12) are in `docs/` and no longer listed here.

## Annoying

| # | Step | Trying to do | What happened | Expected |
| - | - | - | - | - |
| 17 | 4 | Test a `useSendFollowUp` button in the Inspector's tool preview | The button never appears: the docs say to hide it unless `hostCapabilities.message` is defined, and neither the Inspector's tool preview, the Inspector's Chat tab, nor the `mcp-use screenshot` host defines it. The Chat tab is the surprising one, since a conversation is attached there. The docs do not say which Inspector surface, if any, supports follow-up messages | A note in the Views docs on where follow-up messages can be tested locally, or a toggle in the Inspector's debug controls to simulate the capability |
| 8 | 1 | Run `mcp-use client connect dev http://localhost:3000/mcp` for the first time | The CLI printed "installing @mcp-use/client…", installed it, then in the same run printed "@mcp-use/client is not installed" and exited with an error. The second run worked | Either the first run succeeds after the auto-install, or it tells me to re-run |
| 1 | 0 | Learn how to preview a View in the Inspector | The "Debug widgets in the Inspector" page still uses v1 terms (`widget.name`, `resources/`, `useWidget()`) and links to `/v1/...` | The page to match the v2 Views docs (`view.name`, `views/`, `useToolContext()`) |
| 20 | 5 | Try the deployed app in Gemini | The tools worked, but Gemini drew its own plain table from the tool's data and never loaded the View, so there was no status dropdown and no Delete or Draft buttons. Nothing in the mcp-use docs says which hosts render Views | A host support table (Claude, ChatGPT, Gemini, others): tools only, or tools and Views |
| 15 | 4 | Capture the View with `mcp-use screenshot --server dev --tool list_applications --wait-for ".tracker-table"` | Failed twice with `browser_timeout: View did not become ready in time`, although the table renders: the same command without `--wait-for` (using `--delay 1500`) captured it with `.tracker-table` present | `--wait-for` to find a selector inside the View, or the help text to say which document the selector is matched against |
| 2 | 0 | Find how to unit-test a tool handler | No recipe anywhere in the docs; the scaffold has no test runner or `test` script. Only the Inspector and the CLI client are documented | A short "testing tools" page, or one example test in the template |
| 9 | 1 | Same command as #8 | The auto-install edited `package.json` without asking and put `@mcp-use/client` under `dependencies`, although it is a dev/verification tool | A prompt before changing `package.json`, and `devDependencies` as the target |
| 14 | 4 | Find out whether the Inspector's Chat tab (with its list of hosted models) costs anything | The Inspector docs say only "hosted chat where available or a provider key stored in your browser". The billing page meters "LLM tokens" from "Inspector Chat" at $5 per 1M tokens, but nothing says whether the local Inspector's chat draws on that, whether sign-in is needed, or where prompts are sent | A short note in the Chat tab or the Inspector docs: who pays, what the limit is, and where the data goes |

## Minor

| # | Step | Trying to do | What happened | Expected |
| - | - | - | - | - |
| 21 | 5 | Score 100 on Manufact's MCP App scorer | It flagged two ChatGPT items: the View had no `ui.domain`, and `list_applications` had no `openai/toolInvocation` labels. `view.domain` exists in the SDK types, but the toolInvocation labels have no typed field, so they go in raw tool `_meta`. The scaffold sets neither, so a fresh template app loses points straight away | The template to set both, or a typed `view` field for the invoking/invoked labels |
| 16 | 4 | Use `<ModelContext>` in a View and preview it locally | The dev log prints `[ModelContext] Host does not declare the updateModelContext capability` twice per render under the screenshot host. Fine as a warning, but nothing in the Views docs says which hosts support it | A support note per host (Inspector, Claude, ChatGPT) next to `ModelContext` in the docs |
| 4 | 0 | Find out how long a free-tier server stays up before scaling to zero | Not stated; only "Prevent Scale to Zero" on paid plans is described | The idle timeout, since it decides whether in-memory demo state is usable |
| 18 | 5 | Deploy a private GitHub repo (the open question from #3) | It worked first time once the GitHub App was installed on that one repo. Good result; the docs still never say private repos are supported | The sentence in the docs |
| 3 | 0 | Find out whether a private GitHub repo can be deployed | Not stated on the deploy or integrations pages | One sentence saying private repos are (or are not) supported |
| 13 | 1 | Read the dev server log while the local Inspector is connected | Every Inspector connect logs `skills/list /mcp 404 ... ERROR Method not found`, although nothing is wrong: the Inspector probes for a feature this server does not use | No `ERROR` line for an optional capability the server never advertised |
| 19 | 5 | Deploy with `mcp-use deploy --name application-tracker` and get a recognisable address | The server is named `application-tracker` in the dashboard, but the public URL is a random slug: `https://fast-steel-8vnyl.run.mcp-use.com/mcp` | The name to shape the URL, or the help text for `--name` to say it does not |
| 6 | 1 | Scaffold into an existing repo root (the repo already had `CLAUDE.md` and `.git`) | The scaffolder only creates a new named subfolder, so I scaffolded in a temp folder and moved the files | A `.` target, or a documented way to scaffold into the current directory |
| 7 | 1 | Scaffold with the default agent skill | The same `mcp-apps-builder` skill (9 files) was written three times: `.agents/`, `.claude/` and `.cursor/`, 27 files in a fresh repo | One copy, or a prompt/flag to pick which agents to install for |
| 5 | 0 | Find which Claude and ChatGPT plans can connect a custom MCP server | Not in the mcp-use docs; had to read Anthropic's help centre | A link out to each vendor's requirements from the "connect clients" page |
| 11 | 1 | Set scripts with `pnpm pkg set scripts.test:watch=...` | Not an mcp-use issue: pnpm 12 rejects `:` in a property path. Edited `package.json` by hand | n/a (pnpm) |
