export const TEMPLATE_OWNER = 'Loqode'
export const TEMPLATE_REPO = 'vue-starter'
export const TEMPLATE_REF = 'master'

export const SUPABASE_API_BASE = 'https://api.supabase.com'

export const GITHUB_API_BASE = 'https://api.github.com'
export const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code'
export const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token'

export const GITHUB_OAUTH_CLIENT_ID =
  process.env.VUESTARTER_GH_CLIENT_ID ?? 'Ov23liMFCIQV4by3GS4O'

export const MIGRATION_PATH = 'supabase/migrations/00001_initial_schema.sql'

export const POLL_INTERVAL_MS = 4000
export const POLL_TIMEOUT_MS = 5 * 60 * 1000
