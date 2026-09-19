# Deployment

[← Back to README](../README.md)

Deploying AeroCode free on Vercel, plus the things that will break your build if you don't know about them.

---

## Why Vercel

The app uses server actions, middleware and dynamic API routes, so a static export won't work. Vercel's free Hobby tier runs the real Next.js runtime and is enough for this app. Netlify and Cloudflare Pages can work but need extra adapter configuration.

Your database is already hosted (MongoDB Atlas), and AI now runs on Groq's hosted API, so nothing depends on your local machine.

---

## Before you start

Make sure `npm run build` passes locally. It type-checks the entire project and will fail the deploy for a type error anywhere — not only in code the app imports.

```bash
npm run build
```

---

## Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Import the project

At [vercel.com/new](https://vercel.com/new), pick the repository. Vercel detects Next.js; leave the build settings alone. `postinstall` runs `prisma generate` automatically.

### 3. Environment variables

Add every variable from your `.env` in **Settings → Environment Variables**:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Same Atlas string as local |
| `AUTH_SECRET` | Can reuse local, or generate a fresh one |
| `GITHUB_ID` / `GITHUB_SECRET` | Same app, new callback added below |
| `GOOGLE_ID` / `GOOGLE_SECRET` | Same |
| `GROQ_API_KEY` | Same free key |

### 4. Let Atlas accept Vercel

Vercel's serverless functions do not have static IPs. In Atlas → **Network Access**, allow `0.0.0.0/0`, or connections will time out.

### 5. Deploy, then fix the OAuth callbacks

Deploy once to get your domain (`your-app.vercel.app`), then register the production callbacks — **sign-in fails until you do**:

**GitHub** → OAuth app settings → Authorization callback URL:
```
https://your-app.vercel.app/api/auth/callback/github
```

**Google** → Credentials → Authorized redirect URIs:
```
https://your-app.vercel.app/api/auth/callback/google
```

Keep the `localhost:3000` entries so local development keeps working.

### 6. Redeploy

Environment variables are baked in at build time, so redeploy after adding them.

---

## The gotchas

Four things in this project will break a deployment if they are changed or removed. They are all handled already — this is so you know why the config looks the way it does.

### Templates must be force-included in the bundle

`/api/template/[id]` reads `Aerocode-starters/` with a path built at runtime (`path.join(process.cwd(), templatePath)`). Vercel's file tracer only bundles files it can see statically, so it would ship the function without the templates and "Create playground" would fail in production while everything else worked.

[`next.config.ts`](../next.config.ts) fixes this:

```ts
outputFileTracingIncludes: {
  "/api/template/[id]": ["./Aerocode-starters/**/*"],
}
```

The directory is ~11 MB with no `node_modules`, well under Vercel's 250 MB function limit.

> The build prints an "Encountered unexpected file in NFT list" warning about this route. That warning is the tracer telling you it saw dynamic `fs` access — it is expected here, and the include above is the answer to it.

### `trustHost` is required off localhost

Auth.js rejects requests whose `Host` header it cannot verify. [`auth.ts`](../auth.ts) sets `trustHost: true`; without it every sign-in on a deployed domain fails.

### The whole repo is type-checked

`next build` runs TypeScript across everything matched by `tsconfig.json`. `Aerocode-starters/` contains standalone projects with their own dependencies that aren't installed here, so it is listed in `exclude`. Removing that exclusion fails the build on `Cannot find module '@angular/core'`.

### `prisma generate` must run on the build machine

The Prisma client is generated into `lib/generated/prisma`, which is not committed. The `postinstall` script covers this. Without it the build fails on a missing client.

---

## Free-tier limits worth knowing

| | Limit |
|---|---|
| Vercel Hobby function duration | 60s (Groq responds in ~1–2s, so this is comfortable) |
| Groq free tier | Generous daily request/token caps; the app surfaces a clear message on 429 |
| MongoDB Atlas M0 | 512 MB storage |
| GitHub API (unauthenticated) | 60 req/hr — set `GITHUB_TOKEN` to raise it |

---

## Verifying a deploy

1. Landing page loads and the guide renders.
2. `/dashboard` redirects to sign-in when signed out.
3. Sign in with both providers.
4. Create a playground from a template — this exercises the file-tracing fix.
5. Open the AI chat and send a message — this exercises `GROQ_API_KEY`.
6. Check the preview pane boots — this exercises the COOP/COEP headers.

---

## Related

- [Setup](setup.md) — environment variables in detail
- [Architecture](architecture.md) — why the headers and tracing config exist
