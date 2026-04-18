import { resolve } from 'node:path'
import * as p from '@clack/prompts'
import { parseArgs, printHelp } from './cli.js'
import {
  GITHUB_OAUTH_CLIENT_ID,
  TEMPLATE_OWNER,
  TEMPLATE_REPO,
} from './constants.js'
import { writeEnv, generateDbPassword } from './env.js'
import { downloadTemplate, githubDeviceAuth } from './github.js'
import { runNpmInstall } from './install.js'
import { runInitialMigration } from './migration.js'
import {
  promptExistingProject,
  promptOpenrouterKey,
  promptOrganization,
  promptProjectMode,
  promptProjectName,
  promptRegion,
  promptSupabasePat,
} from './prompts.js'
import { findRegion } from './regions.js'
import {
  SupabaseManagementClient,
  findPublishableKey,
  findSecretKey,
} from './supabase.js'
import type { ProjectMode, SupabaseProject } from './types.js'
import { color, log } from './logger.js'

async function main() {
  const rawArgs = process.argv.slice(2)
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    printHelp()
    return
  }

  const args = parseArgs(rawArgs)

  // Intro banner
  console.log('')
  p.intro(color.bgCyan(color.black(' create-vue-starter ')))

  p.note(
    [
      'This tool will:',
      '  • Download the VueStarter template into a new folder',
      '  • Create (or connect to) a Supabase project',
      '  • Set up your database and .env file',
      '  • Install the dependencies',
      '',
      'You\'ll just need a Supabase token and a GitHub login. Takes ~3 minutes.',
    ].join('\n'),
    'Welcome',
  )

  // === PHASE 1 — Collect all input upfront ===

  // 1. Project name
  const name = args.name ?? (await promptProjectName())
  const projectDir = resolve(process.cwd(), name)

  // 2. Supabase PAT
  const pat = args.pat ?? process.env.VUESTARTER_PAT ?? (await promptSupabasePat())
  const sb = new SupabaseManagementClient(pat)

  // 3. New vs existing project
  let mode: ProjectMode
  let chosenProject: SupabaseProject | null = null
  let dbPassword: string | null = null
  let region: string | null = null

  if (args.existingProjectRef) {
    mode = 'existing'
  } else {
    mode = await promptProjectMode()
  }

  if (mode === 'existing') {
    const projectsSpinner = p.spinner()
    projectsSpinner.start('Loading your Supabase projects')
    const projects = await sb.listProjects()
    projectsSpinner.stop(`Found ${projects.length} project${projects.length === 1 ? '' : 's'}`)

    if (args.existingProjectRef) {
      const match = projects.find(pr => pr.ref === args.existingProjectRef)
      if (!match) throw new Error(`Project ref '${args.existingProjectRef}' not found on this account.`)
      chosenProject = match
    } else {
      chosenProject = await promptExistingProject(projects)
    }

    region = chosenProject.region
  } else {
    // New project — need org + region
    const orgsSpinner = p.spinner()
    orgsSpinner.start('Loading your Supabase organizations')
    const orgs = await sb.listOrganizations()
    orgsSpinner.stop(`Found ${orgs.length} organization${orgs.length === 1 ? '' : 's'}`)

    if (orgs.length === 0) {
      log.error('No organizations on this Supabase account. Create one at supabase.com and try again.')
      process.exit(1)
    }

    const org = args.organizationId
      ? orgs.find(o => o.id === args.organizationId) ?? orgs[0]!
      : await promptOrganization(orgs)

    region = args.region && findRegion(args.region) ? args.region : await promptRegion()
    dbPassword = generateDbPassword()

    // Will create project in Phase 2 (after all prompts collected)
    // Save org for later
    ;(args as { organizationId?: string }).organizationId = org.id
  }

  // 4. OpenRouter key (optional)
  const openrouterKey =
    args.openrouterKey ??
    process.env.VUESTARTER_OPENROUTER_KEY ??
    (await promptOpenrouterKey())

  // === PHASE 2 — Execute ===

  // 5. Create project (if new)
  if (mode === 'create') {
    const createSpinner = p.spinner()
    createSpinner.start('Creating your Supabase project (this is the slow part)')
    const project = await sb.createProject({
      name,
      organization_id: args.organizationId!,
      region: region!,
      db_pass: dbPassword!,
    })
    createSpinner.stop(`Project created (${project.ref})`)

    const readySpinner = p.spinner()
    readySpinner.start('Waiting for your database to come online (2-3 min)')
    await sb.waitForProjectReady(project.ref, status => {
      readySpinner.message(`Database status: ${status}`)
    })
    readySpinner.stop('Database is online')

    chosenProject = project
  }

  // 6. Fetch API keys
  const keysSpinner = p.spinner()
  keysSpinner.start('Fetching your API keys')
  const keys = await sb.listApiKeys(chosenProject!.ref)
  const supabaseUrl = `https://${chosenProject!.ref}.supabase.co`
  const publishableKey = findPublishableKey(keys)
  const secretKey = findSecretKey(keys)
  keysSpinner.stop('API keys retrieved')

  // 7. Disable email confirmation (only for new projects)
  if (mode === 'create' && !args.skipAuthConfig) {
    const authSpinner = p.spinner()
    authSpinner.start('Disabling email confirmation for development')
    try {
      await sb.disableEmailConfirmations(chosenProject!.ref)
      authSpinner.stop('Email confirmation disabled (you can turn it back on later)')
    } catch (err) {
      authSpinner.stop('Could not update auth config — do it manually from the dashboard')
      log.warn((err as Error).message)
    }
  }

  // 8. GitHub auth (device flow)
  const ghToken = args.ghToken ?? process.env.VUESTARTER_GH_TOKEN ?? (await githubDeviceAuth(GITHUB_OAUTH_CLIENT_ID))

  // 9. Download template
  const dlSpinner = p.spinner()
  dlSpinner.start(`Downloading ${TEMPLATE_OWNER}/${TEMPLATE_REPO}`)
  await downloadTemplate(ghToken, projectDir)
  dlSpinner.stop('Template downloaded')

  // 10. Write .env
  await writeEnv(projectDir, {
    supabaseUrl,
    supabaseKey: publishableKey,
    supabaseSecretKey: secretKey,
    openrouterKey,
  })
  log.success('.env created with your credentials')

  // 11. Run migration (only for new projects)
  if (mode === 'create' && !args.skipMigration) {
    const migSpinner = p.spinner()
    migSpinner.start('Setting up your database tables')
    try {
      await runInitialMigration({
        sb,
        projectDir,
        projectRef: chosenProject!.ref,
      })
      migSpinner.stop('Database is ready')
    } catch (err) {
      migSpinner.stop('Could not apply migration — run it manually from SQL Editor')
      log.warn((err as Error).message)
    }
  }

  // 12. npm install
  if (!args.skipInstall) {
    console.log('')
    log.step('Installing dependencies — this can take a minute')
    await runNpmInstall(projectDir)
  }

  // === DONE ===
  console.log('')
  p.outro(color.green('All set — your app is ready to run.'))

  console.log(color.bold('To start your app:'))
  console.log('')
  console.log(color.dim('Type each command below into this terminal, pressing Enter after each.'))
  console.log('')
  let step = 1
  console.log(`  ${color.bold(`${step++}.`)} ${color.cyan(`cd ${name}`)}`)
  console.log(color.dim(`     Moves into your new project folder.`))
  console.log('')
  if (args.skipInstall) {
    console.log(`  ${color.bold(`${step++}.`)} ${color.cyan('npm install')}`)
    console.log(color.dim(`     Installs the dependencies.`))
    console.log('')
  }
  console.log(`  ${color.bold(`${step++}.`)} ${color.cyan('npm run dev')}`)
  console.log(color.dim(`     Starts the app on your computer.`))
  console.log('')
  console.log(`  ${color.bold(`${step++}.`)} Open ${color.cyan('http://localhost:3000')} in your browser and click ${color.bold('Sign up')}.`)
  console.log('')
  console.log(color.dim('To stop the app later: come back to this terminal and press Ctrl+C.'))
  console.log('')
  console.log(color.dim('One more thing — you can now delete or let your Supabase token expire:'))
  console.log(color.dim('  https://supabase.com/dashboard/account/tokens'))
  console.log('')
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  log.error(message)
  if (err instanceof Error && err.stack && process.env.DEBUG) {
    console.error(err.stack)
  }
  process.exit(1)
})
