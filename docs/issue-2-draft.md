# Issue draft 2 for mcp-use/mcp-use

Not posted. Use the **Bug report** template and paste the body below over the template text.

---

**Title:** cli: `mcp-use client <server> tools call` hides the tool's error text unless `--json` is passed

---

**Describe the bug**

When a tool call fails, the default (text) output of `mcp-use client` prints only:

```
Tool add_application returned an error.
```

The tool's own explanation, for example the input validation message, is dropped. It's only visible with `--json`, inside `error.details.content`. While building my first MCP App I couldn't tell why a call failed until I re-ran it with `--json` and read the raw result.

**To Reproduce**

Any tool call that returns `isError: true` shows it. Against the `say-hello` tool from the `mcp-apps` template:

1. `pnpm dlx create-mcp-use-app@latest repro --template mcp-apps --install`, then `cd repro` and `pnpm dev`
2. `npx mcp-use client connect dev http://localhost:3000/mcp`
3. `npx mcp-use client dev tools call say-hello` (missing the required `name` argument)
4. See only `Tool say-hello returned an error.`

With `--json` the reason is there:

```json
{"error":{"code":"tool_error","message":"Tool say-hello returned an error.","details":{"content":[{"type":"text","text":"Input validation error: Invalid arguments for tool say-hello: name: Invalid input: expected string, received undefined"}],"isError":true}}}
```

**Expected behavior**

The text output includes the tool's error text, for example:

```
Tool say-hello returned an error:
Input validation error: Invalid arguments for tool say-hello: name: Invalid input: expected string, received undefined
```

JSON output can stay exactly as it is, since scripts already get the full result in `details`.

**Desktop (please complete the following information):**
 - OS: Windows 11
 - Version: `mcp-use` 2.12.3, `@mcp-use/cli` 5.0.0, `@mcp-use/client` 2.4.5, Node 26.13.0

**Additional context**

The cause is in `packages/cli/src/client/client.ts`: `callTool` throws `CommandError("tool_error", "Tool ${tool} returned an error.", result)`, and `reportError` in `core/output.ts` prints only the message (plus `nextSteps`) in text mode, so the result in `details` never reaches the terminal. This is unchanged on `main` (6c650f8).

I have a fix with tests ready and will open a PR shortly.
