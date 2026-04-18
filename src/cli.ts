import type { CliArgs } from './types.js'

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg) continue

    if (arg.startsWith('--')) {
      const [rawKey, inlineValue] = arg.slice(2).split('=') as [string, string | undefined]
      const key = rawKey
      const value = inlineValue ?? argv[++i]

      switch (key) {
        case 'name':
          args.name = value
          break
        case 'pat':
          args.pat = value
          break
        case 'ghToken':
        case 'gh-token':
          args.ghToken = value
          break
        case 'region':
          args.region = value
          break
        case 'organizationId':
        case 'organization-id':
          args.organizationId = value
          break
        case 'existingProjectRef':
        case 'existing-project-ref':
          args.existingProjectRef = value
          break
        case 'openrouterKey':
        case 'openrouter-key':
          args.openrouterKey = value
          break
        case 'skipInstall':
        case 'skip-install':
          args.skipInstall = true
          i--
          break
        case 'skipMigration':
        case 'skip-migration':
          args.skipMigration = true
          i--
          break
        case 'skipAuthConfig':
        case 'skip-auth-config':
          args.skipAuthConfig = true
          i--
          break
      }
    } else if (!args.name) {
      args.name = arg
    }
  }

  return args
}

export function printHelp(): void {
  console.log(`
create-vue-starter — scaffold a VueStarter app

Usage:
  npx create-vue-starter <project-name> [options]

Options:
  --name <name>              Project folder + Supabase project name
  --pat <token>              Supabase Personal Access Token (1hr expiry recommended)
  --gh-token <token>         GitHub access token with 'repo' scope (skips device-flow auth)
  --region <region>          Supabase region (e.g. us-east-1, eu-west-2)
  --organization-id <id>     Supabase organization ID (skips interactive picker)
  --existing-project-ref <r> Use an existing Supabase project by ref (skips create + migration)
  --openrouter-key <key>     OpenRouter API key for AI Assistant (optional)
  --skip-install             Don't run 'npm install'
  --skip-migration           Don't apply the initial schema migration
  --skip-auth-config         Don't auto-disable email confirmation

Environment:
  VUESTARTER_GH_CLIENT_ID    GitHub OAuth App client ID (for device-flow auth)
  VUESTARTER_PAT             Supabase PAT (read if --pat omitted)
  VUESTARTER_GH_TOKEN        GitHub token (read if --gh-token omitted)
  VUESTARTER_OPENROUTER_KEY  OpenRouter API key (read if --openrouter-key omitted)

Examples:
  npx create-vue-starter my-app
  npx create-vue-starter my-app --pat=sbp_xxx --region=us-east-1
`)
}
