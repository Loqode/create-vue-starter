# create-vue-starter

One-command bootstrap for the [VueStarter](https://vuestarter.dev) template.

Clones the private template, creates a Supabase project via the Management API,
fetches API keys, writes `.env`, applies the initial migration, disables email
confirmation for development, and runs `npm install`. All in one shot.

## Usage

```bash
npx create-vue-starter my-app
```

You will be prompted for:

1. **Supabase Personal Access Token** — create at [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens). **Set `Expires in: 1 hour`** for best security.
2. **Organization** (skipped if you only have one)
3. **Region** — pick the one closest to you
4. **GitHub authorization** — opens a browser so you can authorize the CLI to clone the private template

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
| `--skip-install` | Don't run `npm install` |
| `--skip-migration` | Don't apply initial schema |
| `--skip-auth-config` | Don't auto-disable email confirmation |

## Environment variables

| Var | Purpose |
|---|---|
| `VUESTARTER_PAT` | Read if `--pat` omitted |
| `VUESTARTER_GH_TOKEN` | Read if `--gh-token` omitted |
| `VUESTARTER_GH_CLIENT_ID` | GitHub OAuth App client ID (used for device-flow auth) |
| `DEBUG=1` | Print full stack traces on error |

## Architecture

```
src/
  index.ts        — main flow orchestration
  cli.ts          — arg parsing + --help
  prompts.ts      — @clack/prompts wrappers
  github.ts       — OAuth device flow + tarball download
  supabase.ts     — Management API client
  migration.ts    — postgres.js + session-pooler migration
  env.ts          — .env writer + DB password generator
  install.ts      — npm install runner
  regions.ts      — Supabase region list
  logger.ts       — coloured output
  constants.ts    — template coords, endpoints, polling config
  types.ts        — shared types
```

## Prerequisites for setup

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

## Publishing

```bash
npm login
npm publish --access public
```

(Requires `create-vue-starter` to be available on npm.)

## GitHub OAuth app setup (one-time)

The device-flow auth needs a GitHub OAuth app registered under the Loqode org:

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. Application name: `create-vue-starter`
3. Homepage URL: https://vuestarter.dev
4. Authorization callback URL: anything valid (e.g. `https://vuestarter.dev`) — unused for device flow
5. After creating, enable **Device flow** in the app settings
6. Copy the Client ID and publish it in the CLI via `VUESTARTER_GH_CLIENT_ID` (or hardcode in `src/constants.ts`)

The Client ID is **not** a secret — safe to hardcode and publish.

## Security notes

- **Supabase PAT** — held in memory only, never written to disk. Recommend 1hr expiry so it auto-revokes.
- **GitHub token** — held in memory only, never written to disk. Device-flow tokens can be revoked at [github.com/settings/applications](https://github.com/settings/applications).
- **DB password** — written to `.env` (required for app runtime). Nowhere else.
- **`.env`** — in `.gitignore` of the template, never committed.

## License

UNLICENSED — not for redistribution.
