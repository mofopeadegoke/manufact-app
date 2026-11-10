# PR draft for mcp-use/mcp-use

Not posted. Branch `fix/typescript/cli-tool-error-text` in the local clone at `D:\mcp-use` (commit c36015a1). Replace `#ISSUE` with the issue number once the issue is posted.

---

**Title:** fix(cli): print a failed tool's error text in client tools call

---

# Pull Request Description

## Where did you find this issue?

While building an MCP App with the `mcp-apps` template, a failed `mcp-use client <server> tools call` printed only "Tool <name> returned an error." I had to re-run with `--json` to see why. Reported in #ISSUE.

## Language / Project Scope

- [x] TypeScript
- [ ] Python
- [ ] Documentation only
- [ ] CI/CD or tooling

## Changes

In text mode, a failed tool call now prints the tool's text content under the error line. JSON output is unchanged.

## Implementation Details

1. `callTool` in `packages/cli/src/client/client.ts` collects the `text` blocks from the failed result and adds them to the `CommandError` message, in text mode only.
2. If the result has no text content (for example only an image), the message stays "Tool <name> returned an error." as before.
3. In JSON mode the message and `details` are exactly as before, so scripts that branch on `error.code` or read `details` are unaffected.
4. No dependencies added or changed.

---

## TypeScript Checklist

### Packages Modified

- [ ] `docs`
- [x] `tests`
- [x] `cli`
- [ ] `create-mcp-use-app`
- [ ] `mcp-use` (server)
- [ ] `mcp-use` (client)
- [ ] `inspector`

### Pre-commit Checklist

- [x] Ran ESLint on the changed files (clean)
- [x] Ran Prettier on the changed files (clean)
- [x] Ran `pnpm build` and build succeeds without errors
- [x] Added a changeset (`@mcp-use/cli` patch)
- [x] Added or updated tests if needed
- [ ] Updated documentation in `docs/` folder if needed (not needed: the docs don't describe this output)

---

## Example Usage (Before)

```
$ mcp-use client demo tools call add_application company=X role=Y appliedOn=10/11/2026
Tool add_application returned an error.
```

## Example Usage (After)

```
$ mcp-use client demo tools call add_application company=X role=Y appliedOn=10/11/2026
Tool add_application returned an error:
Input validation error: Invalid arguments for tool add_application: appliedOn: Must be a real calendar date in YYYY-MM-DD format
```

`--json` output, before and after:

```
{"error":{"code":"tool_error","message":"Tool add_application returned an error.","details":{...}}}
```

## Before / After Video or Screenshots

Not an Inspector change; the terminal output above is from a real run against a deployed mcp-use server, first with the published CLI 5.0.0 and then with this branch's build.

## Documentation Updates

* None.

## Testing

- Added two tests in `tests/client/client.test.ts` under "client human-readable output":
  - a failed tool with two text blocks prints both texts to stderr, nothing to stdout, and exits 1 (fails before the fix, passes after);
  - a failed tool with no text content still prints exactly "Tool echo returned an error." (the unchanged case).
- The existing JSON test ("retains a failed tool result in JSON error details") passes unchanged, confirming the JSON contract.
- `@mcp-use/cli` suite: 558 of 559 pass. The one failure, `deploy > registers an HTTPS MCP endpoint after a real handshake…`, fails with `spawn openssl ENOENT` because my Windows machine has no `openssl`; it fails the same way on `main` without this change.
- `pnpm --filter @mcp-use/cli typecheck` is clean.
- Manual check against a deployed server, shown above.

## Backwards Compatibility

Compatible. Only the human-readable stderr text changes, and only when a tool fails with text content. Exit codes, the `tool_error` code and the JSON output are unchanged.

## Related Issues

Closes #ISSUE
