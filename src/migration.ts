import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { MIGRATION_PATH } from './constants.js'
import type { SupabaseManagementClient } from './supabase.js'

export interface MigrationArgs {
  sb: SupabaseManagementClient
  projectDir: string
  projectRef: string
}

export async function runInitialMigration(args: MigrationArgs): Promise<void> {
  const migrationFile = join(args.projectDir, MIGRATION_PATH)
  const sql = await readFile(migrationFile, 'utf-8')

  await args.sb.runQuery(args.projectRef, sql)
}
