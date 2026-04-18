import { execa } from 'execa'

export async function runNpmInstall(projectDir: string): Promise<void> {
  await execa('npm', ['install'], {
    cwd: projectDir,
    stdio: 'inherit',
  })
}
