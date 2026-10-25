import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { onTestFinished,describe,expect,it } from 'vitest';

const repo = path.resolve(import.meta.dirname, '..');

const workspace = async function workspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'react-boilerplate-supabase-'));
  onTestFinished( async () => await rm(root, { force: true, recursive: true }));
  await mkdir(path.join(root, 'supabase', 'migrations'), { recursive: true });
  await mkdir(path.join(root, 'src', 'lib', 'supabase'), { recursive: true });

  return root;
}

const executable = async function executable(file: string, body: string): Promise<void> {
  await writeFile(file, `#!/usr/bin/env bash\nset -euo pipefail\n${body}\n`);
  await chmod(file, 0o755);
}

const run = function run(
  script: string,
  root: string,
  bin: string,
  extraEnvironment = {},
  args: Array<string> = [],
) {
  return spawnSync(path.join(repo, 'scripts', script), args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...extraEnvironment,
      PATH: `${bin}:${process.env['PATH'] ?? ''}`,
      SUPABASE_REPO_ROOT: root,
    },
  });
}

const writeProjectConfig = async function writeProjectConfig(root: string, schema = 'workout_log'): Promise<void> {
  await writeFile(
    path.join(root, 'supabase', 'project.env'),
    `SUPABASE_SCHEMA=${schema}\nSUPABASE_TYPES_SOURCE=self_hosted\n`,
  );
  await writeFile(
    path.join(root, 'src', 'lib', 'supabase', 'database-schema.generated.ts'),
    `export const databaseSchema = '${schema}';\n`,
  );
}

describe('Supabase setup scripts', () => {
  it('refuses database work while the starter still has its placeholder schema', async () => {
    const root = await workspace();
    const bin = path.join(root, 'bin');
    const migration = path.join(root, 'supabase', 'migrations', '001.sql');
    await mkdir(bin);
    await writeProjectConfig(root, 'replace_me');
    await writeFile(migration, 'select 42;\n');
    await executable(path.join(bin, 'docker'), 'exit 1');
    await executable(path.join(bin, 'sudo'), 'exit 1');
    await executable(
      path.join(bin, 'getent'),
      'if [[ $# -gt 0 && $1 == ahosts ]]; then echo "127.0.1.1 STREAM alex"; fi',
    );
    await executable(path.join(bin, 'ssh'), 'exit 97');

    const result = run('apply-migrations.sh', root, bin, {}, [migration]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('supabase:configure');
  });

  it('configures one dedicated app schema from the neutral starter', async () => {
    const root = await workspace();
    const bin = path.join(root, 'bin');
    await mkdir(bin);

    const result = run('configure-supabase.sh', root, bin, {}, ['workout_log']);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(await readFile(path.join(root, 'supabase', 'project.env'), 'utf8')).toContain(
      'SUPABASE_SCHEMA=workout_log',
    );
    expect(await readFile(path.join(root, 'supabase', 'config.toml'), 'utf8')).toContain(
      'schemas = ["workout_log", "graphql_public"]',
    );
    expect(
      await readFile(path.join(root, 'src', 'lib', 'supabase', 'database-schema.generated.ts'), 'utf8'),
    ).toContain("databaseSchema = 'workout_log'");
  });

  it('never truncates the tracked types when postgres-meta returns an error page', async () => {
    const root = await workspace();
    const bin = path.join(root, 'bin');
    const output = path.join(root, 'src', 'lib', 'supabase', 'database-generated.types.ts');
    await mkdir(bin);
    await writeProjectConfig(root);
    await writeFile(output, '// known-good types\nexport type Database = { safe: true };\n');
    await executable(
      path.join(bin, 'docker'),
      `if [[ "\${1:-}" == ps ]]; then echo test-meta; exit 0; fi\necho '<html>bad gateway</html>'`,
    );

    const result = run('gen-types.sh', root, bin, {
      SUPABASE_META_CONTAINER: 'test-meta',
      SUPABASE_TYPES_OUT: output,
    });

    expect(result.status).not.toBe(0);
    expect(await readFile(output, 'utf8')).toBe(
      '// known-good types\nexport type Database = { safe: true };\n',
    );
  });

  it('uses the Docker-group fallback and atomically installs valid generated types', async () => {
    const root = await workspace();
    const bin = path.join(root, 'bin');
    const output = path.join(root, 'src', 'lib', 'supabase', 'database-generated.types.ts');
    await mkdir(bin);
    await writeProjectConfig(root);
    await writeFile(output, '// old types\n');
    await executable(path.join(bin, 'docker'), 'exit 1');
    await executable(
      path.join(bin, 'sudo'),
      `if [[ "$*" == *"docker ps"* ]]; then echo test-meta; exit 0; fi
if [[ "$*" == *"docker exec"* ]]; then
  printf 'export type Database = {\\n  workout_log: {\\n    Tables: {};\\n    Views: {};\\n    Functions: {};\\n    Enums: {};\\n    CompositeTypes: {};\\n  };\\n};\\n'
fi`,
    );

    const result = run('gen-types.sh', root, bin, {
      SUPABASE_META_CONTAINER: 'test-meta',
      SUPABASE_TYPES_OUT: output,
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(await readFile(output, 'utf8')).toContain('workout_log:');
    const { mode } = await stat(output);
    expect(mode.toString(8).slice(-3)).toBe('644');
  });

  it('verifies the configured schema after applying an explicit migration', async () => {
    const root = await workspace();
    const bin = path.join(root, 'bin');
    const sqlLog = path.join(root, 'sql.log');
    const migration = path.join(root, 'supabase', 'migrations', '001.sql');
    await mkdir(bin);
    await writeProjectConfig(root);
    await writeFile(migration, 'select 42;\n');
    await executable(
      path.join(bin, 'docker'),
      `if [[ "\${1:-}" == ps ]]; then echo test-db; exit 0; fi
input=$(cat)
printf '%s\\n' "$input" >> '${sqlLog}'
if [[ "$input" == *pg_namespace* ]]; then echo 1; fi
exit 0`,
    );

    const result = run('apply-migrations.sh', root, bin, { SUPABASE_DB_CONTAINER: 'test-db' }, [
      migration,
    ]);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(await readFile(sqlLog, 'utf8')).toContain('select 42;');
    expect(await readFile(sqlLog, 'utf8')).toContain('pg_namespace');
  });

  it('runs the local Supabase CLI with the current user and Docker group fallback', async () => {
    const root = await workspace();
    const bin = path.join(root, 'bin');
    const calls = path.join(root, 'calls.log');
    const cli = path.join(bin, 'supabase');
    await mkdir(bin);
    await writeProjectConfig(root);
    await executable(path.join(bin, 'docker'), 'exit 1');
    await executable(cli, `printf 'direct cli\\n' >> '${calls}'`);
    await executable(
      path.join(bin, 'sudo'),
      `if [[ "$*" == *"docker ps"* ]]; then exit 0; fi
printf '%s\\n' "$*" >> '${calls}'`,
    );

    const result = run('local-supabase.sh', root, bin, { SUPABASE_CLI: cli }, ['status']);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(await readFile(calls, 'utf8')).toMatch(/-u \S+ -g docker env .*supabase status/u);
    expect(await readFile(calls, 'utf8')).not.toContain('direct cli');
  });

  it('bootstraps migrations when the configured schema is missing on first start', async () => {
    const root = await workspace();
    const bin = path.join(root, 'bin');
    const calls = path.join(root, 'calls.log');
    const marker = path.join(root, 'started-once');
    const cli = path.join(bin, 'supabase');
    await mkdir(bin);
    await writeProjectConfig(root);
    await executable(path.join(bin, 'docker'), 'exit 0');
    await executable(
      cli,
      `printf '%s\n' "$*" >> '${calls}'
if [[ "$*" == start && ! -f '${marker}' ]]; then
  touch '${marker}'
  echo '{"message":"schema \\"workout_log\\" does not exist"}' >&2
  exit 1
fi`,
    );

    const result = run('local-supabase.sh', root, bin, { SUPABASE_CLI: cli }, ['start']);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    const invoked = await readFile(calls, 'utf8');
    expect(invoked.trim().split('\n')).toEqual([
      'start',
      'db start',
      'db reset --local --no-seed',
      'stop',
      'start',
    ]);
  });
});
