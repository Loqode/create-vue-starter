import {
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
  SUPABASE_API_BASE,
} from './constants.js'
import type {
  CreateProjectInput,
  SupabaseApiKey,
  SupabaseOrganization,
  SupabaseProject,
} from './types.js'

export class SupabaseManagementClient {
  constructor(private readonly pat: string) {
    if (!pat) throw new Error('Supabase PAT is required')
  }

  private async request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${SUPABASE_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.pat}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      let detail = text
      try {
        const parsed = JSON.parse(text)
        detail = parsed.message ?? parsed.error ?? text
      } catch {
        // fall through, use raw text
      }
      throw new SupabaseApiError(
        `Supabase API ${init.method ?? 'GET'} ${path} → ${res.status}: ${detail}`,
        res.status
      )
    }

    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  listOrganizations(): Promise<SupabaseOrganization[]> {
    return this.request<SupabaseOrganization[]>('/v1/organizations')
  }

  listProjects(): Promise<SupabaseProject[]> {
    return this.request<SupabaseProject[]>('/v1/projects')
  }

  createProject(input: CreateProjectInput): Promise<SupabaseProject> {
    return this.request<SupabaseProject>('/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ plan: 'free', ...input }),
    })
  }

  getProject(ref: string): Promise<SupabaseProject> {
    return this.request<SupabaseProject>(`/v1/projects/${ref}`)
  }

  async waitForProjectReady(
    ref: string,
    onTick?: (status: string) => void
  ): Promise<SupabaseProject> {
    const start = Date.now()
    while (Date.now() - start < POLL_TIMEOUT_MS) {
      const project = await this.getProject(ref)
      onTick?.(project.status)
      if (project.status === 'ACTIVE_HEALTHY') return project
      if (
        project.status === 'INACTIVE' ||
        project.status === 'REMOVED' ||
        project.status === 'UNKNOWN'
      ) {
        throw new Error(`Project stuck in state: ${project.status}`)
      }
      await sleep(POLL_INTERVAL_MS)
    }
    throw new Error(
      `Project did not become ready within ${POLL_TIMEOUT_MS / 1000}s. Check dashboard.`
    )
  }

  listApiKeys(ref: string): Promise<SupabaseApiKey[]> {
    return this.request<SupabaseApiKey[]>(`/v1/projects/${ref}/api-keys`)
  }

  /**
   * Sets `mailer_autoconfirm = true` which auto-confirms signups, equivalent
   * to disabling the "Confirm email" toggle in the dashboard.
   */
  disableEmailConfirmations(ref: string): Promise<unknown> {
    return this.request(`/v1/projects/${ref}/config/auth`, {
      method: 'PATCH',
      body: JSON.stringify({ mailer_autoconfirm: true }),
    })
  }

  /**
   * Executes arbitrary SQL against the project's database using admin
   * privileges. Same endpoint the dashboard's SQL Editor uses.
   */
  runQuery(ref: string, query: string): Promise<unknown> {
    return this.request(`/v1/projects/${ref}/database/query`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    })
  }
}

export class SupabaseApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'SupabaseApiError'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function pickKey(
  keys: SupabaseApiKey[],
  match: (k: SupabaseApiKey) => boolean
): string {
  const hit = keys.find(match)
  if (!hit) throw new Error('Expected API key not found in response')
  return hit.api_key
}

export function findPublishableKey(keys: SupabaseApiKey[]): string {
  return pickKey(keys, k =>
    /publishable/i.test(k.name) || k.type === 'publishable' || /anon/i.test(k.name)
  )
}

export function findSecretKey(keys: SupabaseApiKey[]): string {
  return pickKey(keys, k =>
    /secret/i.test(k.name) || k.type === 'secret' || /service[_-]?role/i.test(k.name)
  )
}
