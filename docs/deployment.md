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

Deploy once to get your domain (`your-app.vercel.app`; this project's is `aerocode-ebon.vercel.app`), then register the production callbacks — **sign-in fails until you do**:

**GitHub** → OAuth app settings → Authorization callback URL:
```
https://your-app.vercel.app/api/auth/callback/github
```

**Google** → Credentials → Authorized redirect URIs:
```
https://your-app.vercel.app/api/auth/callback/google
```

Keep the `localhost:3000` entries so local development keeps working.

> [!IMPORTANT]
> Callbacks are matched **character for character**: use `https` (not `http`), no trailing slash, and remember to click **Update application** on GitHub — editing the field alone does not save it.
>
> Register the **stable** domain, and sign in from it. This project's live domain is `aerocode-ebon.vercel.app`. See [Sign-in fails with `redirect_uri_mismatch`](#sign-in-fails-with-redirect_uri_mismatch).

### 6. Redeploy

Environment variables are baked in at build time, so redeploy after adding them.

---

## The gotchas

Six things in this project will break a deployment if they are changed or removed. They are all handled already — this is so you know why the config looks the way it does.

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

### `trustHost` must be set on **both** NextAuth instances

Auth.js rejects requests whose `Host` header it cannot verify, so `trustHost: true` is required off localhost.

There are two `NextAuth()` instances: the main one in [`auth.ts`](../auth.ts), and a second one that [`middleware.ts`](../middleware.ts) builds from [`auth.config.ts`](../auth.config.ts). `auth.ts` spreads `authConfig`, so putting `trustHost` in `auth.config.ts` covers both.

> [!WARNING]
> If the middleware's instance lacks it, it throws `UntrustedHost`, aborts before its redirect logic runs, and Next.js lets the request through. **Every protected page becomes public** — it fails open, silently. Verify with `next start` and a signed-out `curl` to `/dashboard`: it must return a `302` to `/auth/sign-in`.

### The middleware must not run on `/api/auth/*`

The matcher in [`middleware.ts`](../middleware.ts) excludes `/api/auth`. If it is included, Auth.js's own routes are processed by two engines per request and OAuth callbacks fail in production with `UnknownAction: Only GET and POST requests are supported`. Middleware already treated those routes as pass-through, so it never needed to see them.

### Sign-in fails with `redirect_uri_mismatch`

Every Vercel build has its own unique URL (`aerocode-<hash>-<team>.vercel.app`) in addition to the stable production domain. Because `trustHost` accepts any host, the app builds the OAuth redirect from whichever one you are on — and only the stable one is registered with Google and GitHub.

Always sign in from the stable domain (`https://aerocode-ebon.vercel.app`), not from the link Vercel's dashboard gives you for a specific deployment. For a domain that can never change, add a custom domain under **Settings → Domains** and register that instead.

You can see what the app sends by reading the `redirect_uri` parameter in the URL of the provider's error page.

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
