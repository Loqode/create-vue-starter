import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface EnvValues {
  supabaseUrl: string
  supabaseKey: string
  supabaseSecretKey: string
  openrouterKey?: string
}

export async function writeEnv(projectDir: string, values: EnvValues): Promise<void> {
  const contents =
    `SUPABASE_URL=${values.supabaseUrl}\n` +
    `SUPABASE_KEY=${values.supabaseKey}\n` +
    `SUPABASE_SECRET_KEY=${values.supabaseSecretKey}\n` +
    `\n# Optional — enables the AI Assistant feature. Leave blank to hide the chat UI.\n` +
    `OPENROUTER_API_KEY=${values.openrouterKey ?? ''}\n`

  await writeFile(join(projectDir, '.env'), contents, 'utf-8')
}

export function generateDbPassword(length = 32): string {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i]! % chars.length]
  }
  return out
}
