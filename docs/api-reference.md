# API reference

[← Back to README](../README.md)

Every HTTP route, plus the server actions that back most data access.

---

## Authentication

All routes except `/api/auth/*` sit behind [`middleware.ts`](../middleware.ts). An unauthenticated request is **302-redirected to `/auth/sign-in`** rather than given a 401 — worth knowing when testing with `curl`, because you will see a redirect, not JSON.

```bash
# expect 302 without a session
curl -i http://localhost:3000/api/chat
```

---

## `POST /api/chat`

AI chat, used by the side panel.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | `string` | yes | The user's message |
| `history` | `{role, content}[]` | no | Last 10 are used; invalid entries filtered |
| `language` | `string` | no | Language of the open file; used by the fence normalizer |
| `action` | `"enhance"` | no | Switches to prompt-enhancement mode |

**200**
```json
{ "response": "markdown", "timestamp": "2026-01-01T00:00:00.000Z" }
```

**Errors** — `400` missing/invalid `message`; `500` with a specific `details` string (no API key, invalid key, rate limited, timeout).

```json
{ "error": "Failed to generate AI response", "details": "GROQ_API_KEY is not set…" }
```

`GET /api/chat` returns a health/status object.

---

## `POST /api/code-suggestion`

Inline editor completion.

**Body**

| Field | Type | Required |
|---|---|---|
| `fileContent` | `string` | yes |
| `cursorLine` | `number` | yes |
| `cursorColumn` | `number` | yes |
| `suggestionType` | `string` | yes |
| `fileName` | `string` | no |

**200**
```jsonc
{
  "suggestion": "code to insert at the cursor",
  "context": { "language": "TypeScript", "framework": "React", "isInFunction": true, /* … */ },
  "metadata": { "language": "…", "framework": "…", "position": {}, "generatedAt": "ISO" }
}
```

**400** on invalid input. AI failures do **not** error — they return `"// AI suggestion unavailable"` so typing is never interrupted.

---

## `POST /api/github-import`

Converts a public GitHub repository into a playground file tree.

**Body**
```json
{ "url": "https://github.com/owner/repo" }
```

Accepted forms: full URL, `www.` prefix, `.git` suffix, trailing path, bare `owner/repo`. Non-GitHub hosts are rejected.

**200**
```jsonc
{
  "name": "repo",
  "description": "…",
  "branch": "main",           // the repo's real default branch
  "fileCount": 42,
  "truncated": false,         // true if the file cap was hit
  "templateData": { "folderName": "repo", "items": [] }
}
```

**Limits and filtering**

| | |
|---|---|
| Max files | 300 |
| Max file size | 150 KB |
| Skipped directories | `.git`, `node_modules`, `dist`, `build`, `.next`, `.turbo`, `vendor` |
| Skipped files | Images, fonts, archives, media, binaries, lockfiles |
| Also skipped | Anything containing a NUL byte (binary the extension filter missed) |

**Errors** — `400` malformed URL or nothing importable; `401` signed out; `404` repo missing or private; `429` GitHub rate limit (set `GITHUB_TOKEN`); `502` GitHub unreachable.

> Private repositories are not supported. The OAuth app requests no `repo` scope.

---

## `GET /api/template/[id]`

Returns the starter file tree for a playground's template. Reads from `Aerocode-starters/` in memory — it never writes to disk.

**200**
```json
{ "success": true, "templateJson": { "folderName": "…", "items": [] } }
```

**Errors** — `400` missing id; `404` playground or template not found; `500` unreadable or unserialisable tree.

> This route depends on `outputFileTracingIncludes`. See [Deployment](deployment.md#the-gotchas).

---

## `/api/auth/[...nextauth]`

Auth.js handler — sign-in, callbacks, sign-out, session. Publicly reachable by necessity. Callback URLs:

```
<origin>/api/auth/callback/github
<origin>/api/auth/callback/google
```

---

## Server actions

Most data access uses server actions rather than HTTP. All resolve the session server-side and scope by `userId`.

### Playgrounds — [`features/playground/actions`](../features/playground/actions/index.ts)

| Action | Purpose |
|---|---|
| `createPlayground({title, template, description?})` | New playground from a template |
| `createPlaygroundFromRepo({title, description?, templateData})` | New playground from an import |
| `getAllPlaygroundForUser()` | List, newest first, with star state |
| `getPlaygroundById(id)` | Title, description and file tree |
| `SaveUpdatedCode(playgroundId, data)` | Upsert the file tree |
| `deleteProjectById(id)` / `editProjectById(id, data)` / `duplicateProjectById(id)` | Manage |
| `toggleStarMarked(playgroundId, isChecked)` | Star / unstar |

### Chat — [`features/ai-chat/actions`](../features/ai-chat/actions/index.ts)

| Action | Purpose |
|---|---|
| `getChatHistory(playgroundId)` | Last 10 messages, oldest first |
| `saveChatMessage(playgroundId, role, content)` | Append and trim |
| `clearChatHistory(playgroundId)` | Delete the thread |

---

## Related

- [AI integration](ai-integration.md)
- [Database](database.md)
- [Architecture](architecture.md)
