# Issue draft for mcp-use/mcp-use

Not posted. Use the **Bug report** template at https://github.com/mcp-use/mcp-use/issues/new/choose and paste the body below over the template text. The headings match the template's.

---

**Title:** landing: "Open in Inspector" on a local dev server opens the hosted Inspector, which fails with "403: Version negotiation failed"

---

**Describe the bug**

On a freshly scaffolded project, the landing page at `http://localhost:3000/mcp` has an "Open in Inspector" button. It opens the hosted Inspector with the local server as the target:

```
https://inspector.manufact.com/inspector?autoConnect=http%3A%2F%2Flocalhost%3A3000%2Fmcp&tab=chat
```

The hosted Inspector then fails to connect and shows:

```
Could not connect via streamable HTTP: Server returned 403: Version negotiation failed: the server denied access (HTTP 403)
```

The local Inspector at `http://localhost:3000/mcp/inspector` connects to the same server without any problem, so the server itself is fine. For someone new to mcp-use this is the first button on the first page of a new project, and the error points at a protocol or auth problem rather than "this page cannot reach your machine".

**To Reproduce**

1. Scaffold and start the starter:
   ```sh
   pnpm dlx create-mcp-use-app@latest repro --template mcp-apps --install
   cd repro
   pnpm dev
   ```
2. Open `http://localhost:3000/mcp` in a browser.
3. Click **Open in Inspector**.
4. See the 403 error above in the hosted Inspector.

The dev server log for that attempt shows the page load followed by two rejected preflights:

```
[server] GET /mcp 200 37ms
[server] OPTIONS /mcp 405 3ms
[server] OPTIONS /mcp 405 0ms
```

The preflight can be reproduced without a browser:

```sh
curl -i -X OPTIONS http://localhost:3000/mcp \
  -H "Origin: https://inspector.manufact.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

```
HTTP/1.1 405 Method Not Allowed
content-type: application/json

{"jsonrpc":"2.0","error":{"code":-32000,"message":"Method not allowed."},"id":null}
```

A plain `POST` of `tools/list` to the same endpoint returns 200 whatever `Origin` header is sent, so only the preflight is refused.

**Expected behavior**

Either of these would fix the first run:

- When the server URL is a loopback address (`localhost`, `127.0.0.1`, `[::1]`), point the landing page's Inspector link at the server's own Inspector (`<mcp url>/inspector`), which `mcp-use dev` already serves.
- Or keep the link, and have the hosted Inspector detect a loopback `autoConnect` target and say so plainly, for example: "This Inspector runs on the internet and cannot reach localhost. Open http://localhost:3000/mcp/inspector instead, or start a tunnel with `mcp-use dev --tunnel`."

**Screenshots**

[Attach a screenshot of the hosted Inspector showing the 403 error.]

**Desktop (please complete the following information):**
 - OS: Windows 11
 - Browser: [the browser you used]
 - Version: `mcp-use` 2.12.3, `create-mcp-use-app` 2.1.1, Inspector 20.3.28, Node 26.13.0, pnpm 12.18.0

**Additional context**

What I think is going on. I confirmed the first two points and am guessing at the third:

- `getInstallTargets` builds the Inspector link from a fixed origin (`MANUFACT_INSPECTOR_ORIGIN = "https://inspector.manufact.com"` in `src/install-targets.ts`), whatever the server's own URL is.
- The dev server answers the cross-origin preflight with 405 and no CORS headers, so the browser blocks the hosted page from calling `localhost` directly.
- My guess is that the Inspector then falls back to its server-side proxy, which refuses loopback targets (#2134), and that this refusal is where the 403 and the "Version negotiation failed" wording come from. I have not verified this part.

I searched open and closed issues and pull requests for "Open in Inspector", "Version negotiation failed", "inspector localhost 403" and `getManufactInspectorUrl` and did not find this reported or being worked on.

I'd like to work on a fix for the first option if that's the direction you want. Could you assign it to me?
