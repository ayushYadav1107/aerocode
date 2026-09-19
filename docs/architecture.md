# Architecture

[← Back to README](../README.md)

How AeroCode is put together, and why a few unusual choices exist.

---

## The shape of it

AeroCode is a single Next.js App Router application. There is no separate backend — API routes and server actions do the server work, MongoDB stores state, and the actual *running* of user code happens in the browser rather than on a server.

```
┌──────────────────────────── Browser ────────────────────────────┐
│                                                                 │
│  React 19 UI                                                    │
│  ├── Monaco editor ──────── file contents ──┐                   │
│  ├── AI chat panel                          │                   │
│  ├── File explorer (Zustand)                │                   │
│  └── WebContainer + xterm ◄─── boots project files              │
│        │  runs npm install, dev servers, serves a preview URL   │
└────────┼────────────────────────────────────┼───────────────────┘
         │                                    │
    (no server involved)          fetch / server actions
                                              │
┌─────────────────────────── Next.js ─────────┼───────────────────┐
│  middleware.ts ── auth gate on every request │                  │
│                                              ▼                  │
│  /api/chat              ──► Groq API (hosted model)             │
│  /api/code-suggestion   ──► Groq API                            │
│  /api/github-import     ──► GitHub REST API                     │
│  /api/template/[id]     ──► reads Aerocode-starters/ from disk  │
│  server actions         ──► Prisma ──► MongoDB Atlas            │
└─────────────────────────────────────────────────────────────────┘
```

The important idea: **user code never executes on the server.** WebContainers run a Node-compatible runtime compiled to WebAssembly inside the browser tab. The server only ever stores and retrieves *text*.

---

## Layout convention

Code is grouped by feature, not by type:

```
features/<feature>/
  components/   UI for this feature
  hooks/        client state
  actions/      "use server" server actions
  libs/         pure helpers
```

`app/` holds only routing and API handlers, and delegates into `features/`. Shared primitives live in `components/ui` (shadcn) and `lib/`.

---

## Authentication

Auth.js (NextAuth v5 beta) with Google and GitHub OAuth, a **JWT session strategy**, and the Prisma adapter for user/account persistence.

`middleware.ts` runs on every request and is the single gate:

```
/api/auth/*      → always allowed (OAuth callbacks)
/auth/sign-in    → allowed; redirects to / if already signed in
publicRoutes     → allowed  (currently just "/")
everything else  → redirect to /auth/sign-in when signed out
```

The model is **deny by default**. Adding a page protects it automatically; making something public means adding it to `publicRoutes` in [`routes.ts`](../routes.ts).

`trustHost: true` is set in [`auth.ts`](../auth.ts). Without it Auth.js rejects requests whose `Host` header it does not recognise, which breaks every deployment that is not localhost.

---

## The playground

### Files

A playground's files live as a single JSON blob — a `TemplateFolder` tree — in the `TemplateFile` collection:

```ts
type TemplateFolder = {
  folderName: string
  items: (TemplateFile | TemplateFolder)[]
}
```

This denormalised shape means opening a playground is one query rather than a tree of joins, and the whole tree can be handed to a WebContainer in one go. The trade-off is that a single file edit rewrites the whole document — fine at playground scale, wrong for a real filesystem.

Client-side, [`useFileExplorer`](../features/playground/hooks/useFileExplorer.tsx) (Zustand) owns open tabs, the active file, and unsaved-change flags.

### Where a playground's files come from

1. **A template** — `/api/template/[id]` maps the playground's `template` enum to a path under `Aerocode-starters/` and scans that directory into the JSON tree.
2. **A GitHub repo** — `/api/github-import` fetches the repo tree and builds the same structure.

Both produce an identical `TemplateFolder`, so everything downstream is unaware of the origin.

### Running the code

[`useWebContainer`](../features/webContainers/hooks/useWebContainer.ts) boots a WebContainer, mounts the file tree, and exposes a `writeFileSync` used to keep the container in sync as you edit. A terminal (xterm.js) is attached to the container's shell, and the dev server it starts is displayed in the preview pane.

> [!IMPORTANT]
> WebContainers require **cross-origin isolation**. [`next.config.ts`](../next.config.ts) sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy` on every route. The COEP value lives in [`features/webContainers/coep.ts`](../features/webContainers/coep.ts) so the header and the client agree on one value. It is `require-corp` — `credentialless` is Chromium-only and breaks Firefox and Safari. Removing these headers breaks the preview entirely.

---

## AI

Two routes, one shared client. See **[AI integration](ai-integration.md)** for detail.

- [`lib/groq.ts`](../lib/groq.ts) — a plain `fetch` against Groq's OpenAI-compatible endpoint. No SDK dependency.
- `/api/chat` — conversational, with the open file as context.
- `/api/code-suggestion` — inline completions; analyses cursor context before prompting.

Chat history is persisted per playground and scoped by user, so it survives reloads and follows you across devices.

---

## Theming

`next-themes` with the `class` strategy drives both the UI and the editor:

- UI components use semantic Tailwind tokens (`bg-background`, `text-muted-foreground`) that flip automatically.
- Monaco has two registered themes, `modern-dark` and `modern-light`, in [`editor-config.ts`](../features/playground/libs/editor-config.ts). `setEditorTheme` switches them live when the app theme changes.

---

## A note on file tracing

`/api/template/[id]` reads `Aerocode-starters/` with a path built at runtime. Build-time tracers cannot see dynamic `fs` access, so the directory would be missing from a serverless bundle. `outputFileTracingIncludes` in [`next.config.ts`](../next.config.ts) forces it to be included. See [Deployment](deployment.md#the-gotchas).

---

## Related

- [Database schema](database.md)
- [API reference](api-reference.md)
- [Deployment](deployment.md)
