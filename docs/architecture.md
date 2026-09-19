# Architecture

[← Back to README](../README.md)

How AeroCode is put together, and why a few unusual choices exist.

---

## System overview

AeroCode is a single Next.js App Router application. There is no separate backend — API routes and server actions do the server work, MongoDB stores state, and user code *runs in the browser* rather than on a server.

```mermaid
flowchart TB
    subgraph browser["🌐 Browser"]
        direction TB
        UI["React 19 UI<br/>Tailwind · shadcn/ui"]
        Monaco["Monaco Editor<br/>light + dark themes"]
        Chat["AI Chat Panel"]
        Store["Zustand<br/>file explorer state"]
        WC["WebContainer + xterm.js<br/><i>runs npm install & dev servers</i>"]
    end

    subgraph next["▲ Next.js Server"]
        direction TB
        MW["middleware.ts<br/><i>auth gate, deny by default</i>"]
        API["API Routes"]
        SA["Server Actions"]
    end

    subgraph external["☁️ External Services"]
        direction TB
        Groq["Groq API<br/>openai/gpt-oss-120b"]
        GH["GitHub REST API"]
        Mongo[("MongoDB Atlas")]
    end

    Disk[/"Aerocode-starters/<br/>template files on disk"/]

    UI --> Monaco & Chat & Store
    Store -- "file tree" --> WC
    WC -. "preview URL<br/>(never touches server)" .-> UI

    Monaco -- "Ctrl+Space" --> MW
    Chat -- "messages" --> MW
    UI -- "save · create · import" --> MW

    MW --> API & SA
    API --> Groq & GH
    API --> Disk
    SA --> Mongo

    classDef browserBox fill:#1e1b4b,stroke:#6366f1,color:#e0e7ff
    classDef serverBox fill:#111827,stroke:#6b7280,color:#f3f4f6
    classDef extBox fill:#422006,stroke:#f59e0b,color:#fef3c7
    classDef diskBox fill:#064e3b,stroke:#10b981,color:#d1fae5

    class UI,Monaco,Chat,Store,WC browserBox
    class MW,API,SA serverBox
    class Groq,GH,Mongo extBox
    class Disk diskBox
```

The important idea: **user code never executes on the server.** WebContainers run a Node-compatible runtime compiled to WebAssembly inside the tab. The server only ever stores and retrieves *text*.

---

## Layout convention

Code is grouped by feature, not by type:

```
features/<feature>/
├── components/   UI for this feature
├── hooks/        client state
├── actions/      "use server" server actions
└── libs/         pure helpers
```

`app/` holds only routing and API handlers and delegates into `features/`. Shared primitives live in `components/ui` (shadcn) and `lib/`.

---

## Authentication

Auth.js (NextAuth v5) with Google and GitHub OAuth, a **JWT session strategy**, and the Prisma adapter for user/account persistence.

```mermaid
flowchart TD
    Req(["Incoming request"]) --> ApiAuth{"path starts with<br/>/api/auth ?"}
    ApiAuth -- yes --> Allow1["✅ allow<br/><i>OAuth callbacks</i>"]
    ApiAuth -- no --> AuthRoute{"is /auth/sign-in ?"}

    AuthRoute -- yes --> LoggedIn1{"signed in?"}
    LoggedIn1 -- yes --> Home["↪️ redirect to /"]
    LoggedIn1 -- no --> Allow2["✅ show sign-in"]

    AuthRoute -- no --> Public{"in publicRoutes?"}
    Public -- yes --> Allow3["✅ allow"]
    Public -- no --> LoggedIn2{"signed in?"}
    LoggedIn2 -- yes --> Allow4["✅ allow"]
    LoggedIn2 -- no --> SignIn["🔒 redirect to<br/>/auth/sign-in"]

    classDef ok fill:#052e16,stroke:#22c55e,color:#dcfce7
    classDef block fill:#450a0a,stroke:#ef4444,color:#fee2e2
    classDef q fill:#1e1b4b,stroke:#6366f1,color:#e0e7ff
    class Allow1,Allow2,Allow3,Allow4 ok
    class SignIn,Home block
    class ApiAuth,AuthRoute,Public,LoggedIn1,LoggedIn2 q
```

The model is **deny by default**. Adding a page protects it automatically; making something public means adding it to `publicRoutes` in [`routes.ts`](../routes.ts).

> [!IMPORTANT]
> `trustHost: true` is set in [`auth.ts`](../auth.ts). Without it Auth.js rejects requests whose `Host` header it cannot verify, which breaks every deployment that is not localhost.

---

## The playground

### How files are stored

A playground's files live as a single JSON blob — a `TemplateFolder` tree — in the `TemplateFile` collection:

```ts
type TemplateFile   = { filename: string; fileExtension: string; content: string }
type TemplateFolder = { folderName: string; items: (TemplateFile | TemplateFolder)[] }
```

This denormalised shape means opening a playground is one query rather than a tree of joins, and the whole tree can be handed to a WebContainer in one go.

> [!NOTE]
> The trade-off: a single file edit rewrites the whole document. Fine at playground scale, wrong for a real filesystem.

### Where the files come from

Two sources produce an identical tree, so everything downstream is unaware of the origin:

```mermaid
flowchart LR
    subgraph sources["Origin"]
        T["📁 Template<br/>REACT · NEXTJS · VUE<br/>ANGULAR · EXPRESS · HONO"]
        G["🐙 GitHub repo URL"]
    end

    T --> TR["/api/template/[id]<br/><i>scans disk</i>"]
    G --> GR["/api/github-import<br/><i>fetches tree + blobs</i>"]

    TR --> Tree["TemplateFolder JSON"]
    GR --> Tree

    Tree --> DB[("TemplateFile<br/>in MongoDB")]
    Tree --> Mount["Mounted into<br/>WebContainer"]
    Tree --> Explorer["File explorer<br/>+ Monaco tabs"]

    classDef src fill:#422006,stroke:#f59e0b,color:#fef3c7
    classDef mid fill:#111827,stroke:#6b7280,color:#f3f4f6
    classDef out fill:#1e1b4b,stroke:#6366f1,color:#e0e7ff
    class T,G src
    class TR,GR,Tree mid
    class DB,Mount,Explorer out
```

Client-side, [`useFileExplorer`](../features/playground/hooks/useFileExplorer.tsx) (Zustand) owns open tabs, the active file, and unsaved-change flags.

### Editing and running

```mermaid
sequenceDiagram
    actor You
    participant M as Monaco
    participant Z as Zustand store
    participant W as WebContainer
    participant S as Server Action
    participant DB as MongoDB

    You->>M: type
    M->>Z: updateFileContent()
    Z-->>M: tab marked unsaved ●

    You->>M: Ctrl+S
    M->>S: SaveUpdatedCode()
    S->>DB: upsert TemplateFile
    S->>W: writeFileSync(path, content)
    W-->>You: dev server hot-reloads preview

    Note over W: npm install and dev servers<br/>run inside the browser tab
```

> [!IMPORTANT]
> WebContainers require **cross-origin isolation**. [`next.config.ts`](../next.config.ts) sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy` on every route. The COEP value lives in [`coep.ts`](../features/webContainers/coep.ts) so the header and client agree on one value — it is `require-corp`, because `credentialless` is Chromium-only and breaks Firefox and Safari. Remove these headers and the preview stops working entirely.

---

## AI

Two routes, one shared client. Detail in **[AI integration](ai-integration.md)**.

```mermaid
sequenceDiagram
    actor You
    participant E as Editor / Chat
    participant R as API Route
    participant N as Fence normalizer
    participant G as Groq
    participant DB as MongoDB

    rect rgba(99,102,241,0.12)
    Note over You,DB: Chat
    You->>E: ask a question
    E->>R: POST /api/chat
    R->>DB: saveChatMessage(user)
    R->>G: messages + system prompt
    G-->>R: markdown
    R->>N: repair missing code fences
    N-->>E: render + "Insert into editor"
    R->>DB: saveChatMessage(assistant)
    end

    rect rgba(245,158,11,0.12)
    Note over You,G: Inline completion
    You->>E: Ctrl+Space
    E->>R: POST /api/code-suggestion
    R->>R: analyse cursor context
    R->>G: context-aware prompt
    G-->>E: ghost text · Tab accepts
    end
```

[`lib/groq.ts`](../lib/groq.ts) is a plain `fetch` against Groq's OpenAI-compatible endpoint — no SDK dependency. Chat history is persisted per playground and scoped by user, so it survives reloads and follows you across devices.

---

## Theming

`next-themes` with the `class` strategy drives both the UI and the editor:

| Surface | Mechanism |
|---|---|
| UI components | Semantic Tailwind tokens (`bg-background`, `text-muted-foreground`) flip automatically |
| Monaco | Two registered themes, `modern-dark` / `modern-light`, swapped live by `setEditorTheme` |
| Chat code blocks | `react-syntax-highlighter` style switched on the same signal |

---

## A note on file tracing

`/api/template/[id]` reads `Aerocode-starters/` with a path built at runtime. Build-time tracers cannot see dynamic `fs` access, so the directory would be missing from a serverless bundle. `outputFileTracingIncludes` in [`next.config.ts`](../next.config.ts) forces it in. See [Deployment → The gotchas](deployment.md#the-gotchas).

---

## Related

- [Database schema](database.md)
- [API reference](api-reference.md)
- [Deployment](deployment.md)
