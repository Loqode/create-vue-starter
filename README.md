# create-vue-starter

One-command bootstrap for the [VueStarter](https://vuestarter.com) template.

Downloads the template, creates (or connects to) a Supabase project via the
Management API, fetches API keys, writes `.env`, applies the initial schema
migration, disables email confirmation for development, and runs `npm install`.
All in one shot.

## Usage

```bash
npx create-vue-starter
```

You will be prompted for:

1. **App name** — folder + Supabase project name
2. **Supabase Personal Access Token** — create at [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens). **Set `Expires in: 1 hour`** for best security.
3. **Create new or use existing Supabase project**
4. **Organization** (new project only, skipped if you only have one)
5. **Region** (new project only) — pick the one closest to you
6. **OpenRouter API key** (optional) — enables the AI Assistant feature
7. **GitHub authorization** — opens a browser so you can authorize the CLI to download the private template

## Flags (non-interactive / Claude Code integration)

```bash
npx create-vue-starter my-app \
  --pat=sbp_xxxxxxxxxxxxxxxx \
  --region=us-east-1 \
  --gh-token=ghp_xxxxxxxxxxxxxxxx
```

| Flag | Purpose |
|---|---|
| `<name>` or `--name` | Folder + Supabase project name |
| `--pat` | Supabase PAT (recommended: 1hr expiry) |
| `--gh-token` | GitHub token with `repo` scope (skips device flow) |
| `--region` | Supabase region (e.g. `us-east-1`) |
| `--organization-id` | Skip org picker |
| `--existing-project-ref` | Use an existing Supabase project (skips create + migration) |
| `--openrouter-key` | OpenRouter API key for the AI Assistant feature |
| `--skip-install` | Don't run `npm install` |
| `--skip-migration` | Don't apply initial schema |
| `--skip-auth-config` | Don't auto-disable email confirmation |

## Environment variables

| Var | Purpose |
|---|---|
| `VUESTARTER_PAT` | Read if `--pat` omitted |
| `VUESTARTER_GH_TOKEN` | Read if `--gh-token` omitted |
| `VUESTARTER_OPENROUTER_KEY` | Read if `--openrouter-key` omitted |
| `VUESTARTER_GH_CLIENT_ID` | GitHub OAuth App client ID (used for device-flow auth; has a default) |
| `DEBUG=1` | Print full stack traces on error |

## Architecture

```
src/
  index.ts        — main flow orchestration (two-phase: prompt, then execute)
  cli.ts          — arg parsing + --help
  prompts.ts      — @clack/prompts wrappers
  github.ts       — OAuth device flow + tarball download
  supabase.ts     — Management API client
  migration.ts    — initial schema runner (uses Management API /database/query)
  env.ts          — .env writer + DB password generator
  install.ts      — npm install runner
  regions.ts      — Supabase region list
  logger.ts       — coloured output
  constants.ts    — template coords, endpoints, polling config
  types.ts        — shared types
```

## Prerequisites for end users

Only **Node.js ≥ 20** is required on the user's machine. Git and `gh` are not
needed — the CLI downloads the template tarball directly via the GitHub API
using OAuth device flow (or a user-supplied GitHub token).

## Local development

```bash
npm install
npm run build
npm link
create-vue-starter test-app
```

Or in watch mode:

```bash
npm run dev
```

## GitHub OAuth app setup (one-time, maintainers)

The device-flow auth needs a GitHub OAuth app registered under the Loqode org:

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. Application name: `create-vue-starter`
3. Homepage URL: https://vuestarter.com
4. Authorization callback URL: anything valid (e.g. `https://vuestarter.com`) — unused for device flow
5. After creating, enable **Device flow** in the app settings
6. Copy the Client ID and publish it in the CLI via `VUESTARTER_GH_CLIENT_ID` (or hardcode in `src/constants.ts`)

The Client ID is **not** a secret — safe to hardcode and publish.

## Security notes

- **Supabase PAT** — held in memory only, never written to disk. Recommend 1hr expiry so it auto-revokes.
- **GitHub token** — held in memory only, never written to disk. Device-flow tokens can be revoked at [github.com/settings/applications](https://github.com/settings/applications).
- **DB password** — generated for new projects, sent to Supabase for project creation, then discarded. Not stored on disk or in `.env`. If you need it later, reset via the Supabase dashboard.
- **`.env`** — contains Supabase URL, publishable key, secret key, and (optional) OpenRouter key. Listed in the template's `.gitignore` — never committed.

## License

UNLICENSED — not for redistribution.
