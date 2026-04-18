import * as p from '@clack/prompts'
import { SUPABASE_REGIONS } from './regions.js'
import type { ProjectMode, SupabaseOrganization, SupabaseProject } from './types.js'

export async function promptProjectName(defaultName?: string): Promise<string> {
  const value = await p.text({
    message: 'What should we call your app?',
    placeholder: defaultName ?? 'my-app',
    defaultValue: defaultName,
    validate: (v) => {
      if (!v) return 'Please enter a name.'
      if (!/^[a-z0-9][a-z0-9-_]*$/i.test(v))
        return 'Letters, numbers, dashes, underscores only. Must start with a letter or number.'
      return undefined
    },
  })
  if (p.isCancel(value)) cancelExit()
  return value as string
}

export async function promptSupabasePat(): Promise<string> {
  p.note(
    [
      'Your Supabase Personal Access Token lets us create and set up a database for your app.',
      '',
      'Create one here (set Expires in: 1 hour for safety):',
      'https://supabase.com/dashboard/account/tokens',
      '',
      'Your token is used once and never saved to disk.',
    ].join('\n'),
    'Supabase token',
  )

  const value = await p.password({
    message: 'Paste your Supabase Personal Access Token here',
    mask: '•',
    validate: (v) => {
      if (!v) return 'Please paste your token.'
      if (!v.startsWith('sbp_')) return 'That does not look right — tokens start with "sbp_".'
      return undefined
    },
  })
  if (p.isCancel(value)) cancelExit()
  return value as string
}

export async function promptProjectMode(): Promise<ProjectMode> {
  const value = await p.select({
    message: 'Supabase project — create a new one, or use an existing one?',
    options: [
      { value: 'create', label: 'Create new (automatic)', hint: 'Recommended — we set everything up for you' },
      { value: 'existing', label: 'Use an existing project', hint: 'Skips database setup' },
    ],
    initialValue: 'create',
  })
  if (p.isCancel(value)) cancelExit()
  return value as ProjectMode
}

export async function promptOrganization(
  orgs: SupabaseOrganization[],
): Promise<SupabaseOrganization> {
  if (orgs.length === 1) return orgs[0]!
  const id = await p.select({
    message: 'Which Supabase organization should this project go under?',
    options: orgs.map(o => ({ value: o.id, label: o.name })),
  })
  if (p.isCancel(id)) cancelExit()
  const match = orgs.find(o => o.id === id)
  if (!match) throw new Error('Selected organization not found')
  return match
}

export async function promptExistingProject(
  projects: SupabaseProject[],
): Promise<SupabaseProject> {
  if (projects.length === 0) {
    p.log.error('No existing Supabase projects found on this account.')
    process.exit(1)
  }
  const ref = await p.select({
    message: 'Which project should we connect to? (use arrow keys, then press Enter)',
    options: projects.map(pr => ({
      value: pr.ref,
      label: pr.name,
      hint: pr.region ? `region: ${pr.region}` : undefined,
    })),
  })
  if (p.isCancel(ref)) cancelExit()
  const match = projects.find(pr => pr.ref === ref)
  if (!match) throw new Error('Selected project not found')
  return match
}

export async function promptRegion(defaultRegion = 'us-east-1'): Promise<string> {
  const value = await p.select({
    message: 'Pick the region closest to you (use arrow keys, then press Enter)',
    options: SUPABASE_REGIONS.map(r => ({ value: r.value, label: r.label })),
    initialValue: defaultRegion,
  })
  if (p.isCancel(value)) cancelExit()
  return value as string
}

export async function promptOpenrouterKey(): Promise<string | undefined> {
  p.note(
    [
      'OpenRouter powers the built-in AI Assistant (chat with your app\'s data).',
      '',
      'Leave blank to skip — you can add it later by editing .env.',
      'Get a key: https://openrouter.ai/keys',
    ].join('\n'),
    'AI Assistant (optional)',
  )

  const value = await p.password({
    message: 'Paste your OpenRouter API key (or press Enter to skip)',
    mask: '•',
  })
  if (p.isCancel(value)) cancelExit()
  const str = (value as string).trim()
  return str.length > 0 ? str : undefined
}

export async function confirmContinue(message: string): Promise<boolean> {
  const value = await p.confirm({ message })
  if (p.isCancel(value)) cancelExit()
  return value as boolean
}

function cancelExit(): never {
  p.cancel('Setup cancelled.')
  process.exit(0)
}

export { p as clack }
