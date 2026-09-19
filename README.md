<div align="center">

<img src="public/logo.svg" alt="AeroCode" width="110" />

# AeroCode

**A full development environment in your browser, with an AI assistant that knows what you are working on.**

Spin up a React, Next.js, Vue, Angular, Express or Hono project — or import a GitHub repo — and edit, install, and run it entirely in a browser tab.

[Architecture](docs/architecture.md) · [Setup](docs/setup.md) · [Deployment](docs/deployment.md) · [AI](docs/ai-integration.md) · [Database](docs/database.md) · [API](docs/api-reference.md)

</div>

---

![AeroCode home page](docs/images/home.png)

## What it does

| | |
|---|---|
| **Real runtime, no server** | Projects boot in-browser via [WebContainers](https://webcontainers.io/). `npm install` and dev servers run in a tab. |
| **AI autocomplete** | `Ctrl+Space` for an inline suggestion, `Tab` to accept, `Esc` to dismiss. |
| **AI chat with file context** | A side panel that reads your open file and can insert its answers straight into the editor. |
| **Monaco editor** | The editor behind VS Code, with custom light and dark themes that follow the app. |
| **GitHub import** | Paste a public repo URL; it becomes a playground. |
| **Templates** | Six starters, scanned from disk into the editor's file tree. |
| **Persistent chat** | Conversations are stored per playground and survive reloads and devices. |

## Screenshots

### Landing page and built-in guide
![Guide section](docs/images/guide.png)

### Sign in
![Sign in page](docs/images/sign-in.png)

> [!NOTE]
> Screenshots of the dashboard and the editor are not included because those pages sit behind OAuth and cannot be captured without a signed-in session. To add them, sign in locally and capture `/dashboard` and `/playground/<id>` into `docs/images/`.

## Quick start

```bash
git clone <your-repo-url>
cd aerocode
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the values
npx prisma db push          # create collections + indexes
npm run dev
```

Open <http://localhost:3000>.

You need a MongoDB connection string, Google and GitHub OAuth credentials, and a free [Groq API key](https://console.groq.com/keys). Full walkthrough in **[docs/setup.md](docs/setup.md)**.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React Compiler) |
| UI | React 19, Tailwind CSS v4, shadcn/ui, next-themes |
| Editor | Monaco via `@monaco-editor/react` |
| Runtime | WebContainers + xterm.js |
| Auth | Auth.js (NextAuth v5) — Google + GitHub OAuth, JWT sessions |
| Data | MongoDB Atlas via Prisma |
| AI | Groq (`openai/gpt-oss-120b`), OpenAI-compatible API |
| State | Zustand |

## Documentation

| Doc | What's in it |
|---|---|
| **[Architecture](docs/architecture.md)** | How the pieces fit, request flows, why WebContainers need special headers |
| **[Setup](docs/setup.md)** | Local install, every environment variable, OAuth app configuration |
| **[Deployment](docs/deployment.md)** | Deploying free on Vercel, and the gotchas that break the build |
| **[AI integration](docs/ai-integration.md)** | The Groq client, both AI routes, and the code-fence normalizer |
| **[Database](docs/database.md)** | Prisma schema, every model, and how template files are stored |
| **[API reference](docs/api-reference.md)** | Every route, its payload, and its failure modes |

## Scripts

```bash
npm run dev     # dev server (Turbopack)
npm run build   # production build — type-checks the whole project
npm start       # serve the production build
npm run lint    # eslint

node --test app/api/**/*.test.ts   # unit tests
```

## Project layout

```
app/                    routes and API handlers
  api/chat/             AI chat + code-fence normalizer
  api/code-suggestion/  inline editor completions
  api/github-import/    repo → playground conversion
  api/template/[id]/    reads a starter template off disk
features/               feature-scoped UI, hooks, server actions
  ai-chat/              chat panel, code blocks, chat persistence
  playground/           editor, file tree, playground actions
  webContainers/        in-browser runtime + terminal
lib/                    prisma client, groq client, utils
prisma/                 schema
Aerocode-starters/      project templates copied into new playgrounds
docs/                   this documentation
```

## License

Not currently licensed for redistribution. Add a `LICENSE` file before publishing.
