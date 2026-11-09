# MVX FOS PM — Paperclip local static UI port 3112

This adapter is a minimal, MIT-compatible static UI frontend serving the existing
`ui/dist` from the Paperclip repository. It is not the Paperclip agent backend.

## Commands

From the Paperclip repository root, after the UI has been built:

```powershell
$env:PAPERCLIP_UI_PORT = '3112'
node .\serve-real-ui.cjs
```

Check `GET http://127.0.0.1:3112/api/status`: it returns
`service=Paperclip Real Production UI`, `product=MVX FOS PM`,
`port=3112`, `backendAuthorized=false`.

The static UI title is rewritten to `MVX FOS PM | Paperclip` only on the
approved default port 3112. Original upstream MIT/license attribution remains.

## Security and runtime invariants

- Listener binds **only 127.0.0.1**.
- No wildcard CORS; only GET/HEAD supported.
- Strict dist-root file path and symlink checks, unknown assets return HTTP 404.
- `/api/status` is UI liveness only. All other `/api/*` routes return 404.
- Agent execution and enterprise backend readiness must be verified separately
  by the upstream Paperclip /api/health endpoint.
- The existing 3100 process is not changed by starting this service on 3112.
- The Founder OS Port Manager reads its own namespaced registry. Changing the
  assigned port requires controlled restart of this listener and Vite proxy.

## Test

`node --test scripts/mvx-fos-ui-port.test.cjs`

The test allocates transient port 3114 and verifies isolation, identity,
traversal rejection, API non-availability and allowed HTTP methods.

## Operational blocker

On mini-pc1 on 2026-11-10, the attempted full Paperclip backend on 3113 failed
because the `tsx` executable is not installed in the local Paperclip checkout.
Do not infer agent-backend availability from the static UI's healthy response.
