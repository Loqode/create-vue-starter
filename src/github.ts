import { createWriteStream } from 'node:fs'
import { mkdir, rename, rm, readdir } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { Readable } from 'node:stream'
import { extract as tarExtract } from 'tar'
import open from 'open'
import {
  GITHUB_ACCESS_TOKEN_URL,
  GITHUB_API_BASE,
  GITHUB_DEVICE_CODE_URL,
  TEMPLATE_OWNER,
  TEMPLATE_REF,
  TEMPLATE_REPO,
} from './constants.js'
import { log, color } from './logger.js'
import type {
  GithubAccessTokenResponse,
  GithubDeviceCodeResponse,
} from './types.js'

export async function githubDeviceAuth(clientId: string): Promise<string> {
  if (!clientId) {
    throw new Error(
      'GitHub OAuth client ID not set. Register a GitHub OAuth app for Loqode and pass VUESTARTER_GH_CLIENT_ID, or use --gh-token.'
    )
  }

  const deviceCodeRes = await fetch(GITHUB_DEVICE_CODE_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, scope: 'repo' }),
  })

  if (!deviceCodeRes.ok) {
    throw new Error(`GitHub device code request failed: ${deviceCodeRes.status}`)
  }

  const deviceCode = (await deviceCodeRes.json()) as GithubDeviceCodeResponse

  console.log('')
  log.info('GitHub authorization required')
  console.log(`  ${color.bold('1.')} Visit ${color.cyan(deviceCode.verification_uri)}`)
  console.log(`  ${color.bold('2.')} Enter code: ${color.bold(color.yellow(deviceCode.user_code))}`)
  console.log('')

  try {
    await open(deviceCode.verification_uri)
  } catch {
    // Browser open is best-effort — user can visit URL manually
  }

  return pollForAccessToken(clientId, deviceCode)
}

async function pollForAccessToken(
  clientId: string,
  deviceCode: GithubDeviceCodeResponse
): Promise<string> {
  const expiresAt = Date.now() + deviceCode.expires_in * 1000
  let interval = deviceCode.interval * 1000

  while (Date.now() < expiresAt) {
    await sleep(interval)

    const res = await fetch(GITHUB_ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    })

    const body = (await res.json()) as GithubAccessTokenResponse

    if (body.access_token) return body.access_token

    if (body.error === 'authorization_pending') continue
    if (body.error === 'slow_down') {
      interval += 5000
      continue
    }
    if (body.error === 'expired_token' || body.error === 'access_denied') {
      throw new Error(`GitHub auth: ${body.error_description ?? body.error}`)
    }
  }

  throw new Error('GitHub device code expired before authorization.')
}

export async function downloadTemplate(
  token: string,
  destDir: string
): Promise<void> {
  const tarballUrl = `${GITHUB_API_BASE}/repos/${TEMPLATE_OWNER}/${TEMPLATE_REPO}/tarball/${TEMPLATE_REF}`

  const res = await fetch(tarballUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'create-vue-starter',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    redirect: 'follow',
  })

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        `Template repo not accessible. Make sure your GitHub account has been granted access to ${TEMPLATE_OWNER}/${TEMPLATE_REPO} (check your email for the invite).`
      )
    }
    throw new Error(`Tarball download failed: ${res.status} ${res.statusText}`)
  }

  if (!res.body) throw new Error('Empty tarball response')

  const tmpFile = join(tmpdir(), `vue-starter-${randomBytes(6).toString('hex')}.tar.gz`)

  await pipeline(
    Readable.fromWeb(res.body as unknown as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(tmpFile)
  )

  const extractDir = join(tmpdir(), `vue-starter-extract-${randomBytes(6).toString('hex')}`)
  await mkdir(extractDir, { recursive: true })

  await tarExtract({ file: tmpFile, cwd: extractDir, strip: 1 })

  await rm(tmpFile, { force: true })

  const entries = await readdir(extractDir)
  if (entries.length === 0) throw new Error('Tarball extracted empty')

  await mkdir(destDir, { recursive: true })
  await rename(extractDir, destDir).catch(async (err) => {
    if ((err as NodeJS.ErrnoException).code === 'ENOTEMPTY' || (err as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`Target folder '${destDir}' already exists and is not empty.`)
    }
    throw err
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
