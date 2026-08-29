import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { onTestFinished } from 'vitest';
import { describe, expect, it } from 'vitest';

const repo = resolve(import.meta.dirname, '..');

async function workspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'react-boilerplate-supabase-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'supabase', 'migrations'), { recursive: true });
  await mkdir(join(root, 'src', 'lib', 'supabase'), { recursive: true });
  return root;
}

async function executable(path: string, body: string): Promise<void> {
  await writeFile(path, `#!/usr/bin/env bash\nset -euo pipefail\n${body}\n`);
  await chmod(path, 0o755);
}

function run(
  script: string,
  root: string,
  bin: string,
  extraEnvironment = {},
  args: string[] = [],
) {
  return spawnSync('bash', [join(repo, 'scripts', script), ...args], {
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

async function writeProjectConfig(root: string, schema = 'workout_log'): Promise<void> {
  await writeFile(
    join(root, 'supabase', 'project.env'),
    `SUPABASE_SCHEMA=${schema}\nSUPABASE_TYPES_SOURCE=self_hosted\n`,
  );
  await writeFile(
    join(root, 'src', 'lib', 'supabase', 'database-schema.generated.ts'),
    `export const databaseSchema = '${schema}';\n`,
  );
}

describe('Supabase setup scripts', () => {
  it('refuses database work while the starter still has its placeholder schema', async () => {
    const root = await workspace();
    const bin = join(root, 'bin');
    const migration = join(root, 'supabase', 'migrations', '001.sql');
    await mkdir(bin);
    await writeProjectConfig(root, 'replace_me');
    await writeFile(migration, 'select 42;\n');
    await executable(join(bin, 'docker'), 'exit 1');
    await executable(join(bin, 'sudo'), 'exit 1');
    await executable(
      join(bin, 'getent'),
      'if [[ "${1:-}" == ahosts ]]; then echo "127.0.1.1 STREAM alex"; fi',
    );
    await executable(join(bin, 'ssh'), 'exit 97');

    const result = run('apply-migrations.sh', root, bin, {}, [migration]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('supabase:configure');
  });

  it('configures one dedicated app schema from the neutral starter', async () => {
    const root = await workspace();
    const bin = join(root, 'bin');
    await mkdir(bin);

    const result = run('configure-supabase.sh', root, bin, {}, ['workout_log']);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(await readFile(join(root, 'supabase', 'project.env'), 'utf8')).toContain(
      'SUPABASE_SCHEMA=workout_log',
    );
    expect(await readFile(join(root, 'supabase', 'config.toml'), 'utf8')).toContain(
      'schemas = ["workout_log", "graphql_public"]',
    );
    expect(
      await readFile(join(root, 'src', 'lib', 'supabase', 'database-schema.generated.ts'), 'utf8'),
    ).toContain("databaseSchema = 'workout_log'");
  });

  it('never truncates the tracked types when postgres-meta returns an error page', async () => {
    const root = await workspace();
    const bin = join(root, 'bin');
    const output = join(root, 'src', 'lib', 'supabase', 'database-generated.types.ts');
    await mkdir(bin);
    await writeProjectConfig(root);
    await writeFile(output, '// known-good types\nexport type Database = { safe: true };\n');
    await executable(
      join(bin, 'docker'),
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
    const bin = join(root, 'bin');
    const output = join(root, 'src', 'lib', 'supabase', 'database-generated.types.ts');
    await mkdir(bin);
    await writeProjectConfig(root);
    await writeFile(output, '// old types\n');
    await executable(join(bin, 'docker'), 'exit 1');
    await executable(
      join(bin, 'sudo'),
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
    expect((await stat(output)).mode & 0o777).toBe(0o644);
  });

  it('verifies the configured schema after applying an explicit migration', async () => {
    const root = await workspace();
    const bin = join(root, 'bin');
    const sqlLog = join(root, 'sql.log');
    const migration = join(root, 'supabase', 'migrations', '001.sql');
    await mkdir(bin);
    await writeProjectConfig(root);
    await writeFile(migration, 'select 42;\n');
    await executable(
      join(bin, 'docker'),
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
    const bin = join(root, 'bin');
    const calls = join(root, 'calls.log');
    const cli = join(bin, 'supabase');
    await mkdir(bin);
    await writeProjectConfig(root);
    await executable(join(bin, 'docker'), 'exit 1');
    await executable(cli, `printf 'direct cli\\n' >> '${calls}'`);
    await executable(
      join(bin, 'sudo'),
      `if [[ "$*" == *"docker ps"* ]]; then exit 0; fi
printf '%s\\n' "$*" >> '${calls}'`,
    );

    const result = run('local-supabase.sh', root, bin, { SUPABASE_CLI: cli }, ['status']);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(await readFile(calls, 'utf8')).toMatch(/-u \S+ -g docker env .*supabase status/u);
    expect(await readFile(calls, 'utf8')).not.toContain('direct cli');
  });
});
