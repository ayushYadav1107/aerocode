# Local setup

[← Back to README](../README.md)

Getting AeroCode running on your machine.

---

## Requirements

| | |
|---|---|
| Node.js | 20+ (22+ recommended; the test files rely on native TypeScript stripping in 22.6+) |
| MongoDB | An Atlas cluster, or any MongoDB with a replica set — Prisma requires one |
| Browser | Chromium, Firefox or Safari. WebContainers need a modern engine |

---

## 1. Install

```bash
git clone <your-repo-url>
cd aerocode
npm install
```

`npm install` triggers a `postinstall` that runs `prisma generate`, writing the client to `lib/generated/prisma`. If you ever see *"@prisma/client did not initialize yet"*, run `npx prisma generate` by hand.

## 2. Environment variables

Create `.env` in the project root:

```bash
# Database — MongoDB connection string
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/aerocode?retryWrites=true&w=majority"

# Auth.js — any random 32+ byte string
AUTH_SECRET="..."

# OAuth
GITHUB_ID="..."
GITHUB_SECRET="..."
GOOGLE_ID="..."
GOOGLE_SECRET="..."

# AI — free key from https://console.groq.com/keys
GROQ_API_KEY="gsk_..."
```

### Optional

| Variable | Default | Purpose |
|---|---|---|
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Override the model. Must be one your key can access |
| `GROQ_TIMEOUT_MS` | `30000` | Request timeout |
| `GITHUB_TOKEN` | — | Lifts GitHub's 60 req/hr unauthenticated limit for repo imports |

Generate `AUTH_SECRET` with:

```bash
npx auth secret
# or
openssl rand -base64 32
```

## 3. Database

```bash
npx prisma db push
```

For MongoDB this creates collections and indexes; it does not use migration files. It refuses destructive changes unless you pass `--accept-data-loss`.

## 4. OAuth applications

Both providers need a redirect URI registered. For local development:

**GitHub** — [Developer settings → OAuth Apps](https://github.com/settings/developers)
```
Homepage URL:               http://localhost:3000
Authorization callback URL: http://localhost:3000/api/auth/callback/github
```

**Google** — [Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
```
Authorized JavaScript origins: http://localhost:3000
Authorized redirect URIs:      http://localhost:3000/api/auth/callback/google
```

Both providers accept multiple callback URLs, so you can keep localhost registered alongside production.

## 5. Run

```bash
npm run dev
```

<http://localhost:3000>. The landing page is public; everything else redirects to sign-in.

---

## Verifying the AI works

The Groq client has no Next.js imports, so you can exercise it directly:

```bash
node --env-file=.env -e "
  const { groqChat } = await import('./lib/groq.ts');
  console.log(await groqChat([{ role: 'user', content: 'say OK' }]));
"
```

To see which models your key can use:

```bash
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

> [!WARNING]
> Model availability differs per Groq account. If you get `model_not_found`, pick one from that list and set `GROQ_MODEL`.

---

## Tests

```bash
node --test app/api/chat/normalize-code-fences.test.ts
node --test app/api/github-import/repo-tree.test.ts
```

No test framework — these use Node's built-in runner and its native TypeScript support.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Preview pane blank / WebContainer fails | COOP/COEP headers missing. Check [`next.config.ts`](../next.config.ts); they must be present on every route |
| `EPERM ... query_engine-windows.dll.node` on `prisma generate` | A dev server is holding the file. Stop it and rerun |
| Redirected to sign-in unexpectedly | The route isn't in `publicRoutes` in [`routes.ts`](../routes.ts) — deny by default |
| `GROQ_API_KEY is not set` | Missing from `.env`, or the dev server was started before you added it |
| OAuth "redirect_uri_mismatch" | The callback URL registered with the provider doesn't match exactly, including scheme and port |

---

## Next

- [Architecture](architecture.md) — how it all fits together
- [Deployment](deployment.md) — putting it online
