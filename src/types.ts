export interface CliArgs {
  name?: string
  pat?: string
  ghToken?: string
  region?: string
  organizationId?: string
  existingProjectRef?: string
  openrouterKey?: string
  skipInstall?: boolean
  skipMigration?: boolean
  skipAuthConfig?: boolean
}

export type ProjectMode = 'create' | 'existing'

export interface SupabaseOrganization {
  id: string
  name: string
}

export interface SupabaseProject {
  id: string
  ref: string
  name: string
  status: string
  region: string
  created_at: string
  database?: {
    host: string
    version: string
    postgres_engine: string
    release_channel: string
  }
}

export interface SupabaseApiKey {
  name: string
  api_key: string
  type?: string
}

export interface CreateProjectInput {
  name: string
  organization_id: string
  region: string
  db_pass: string
  plan?: 'free' | 'pro'
}

export interface GithubDeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface GithubAccessTokenResponse {
  access_token?: string
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
  interval?: number
}
