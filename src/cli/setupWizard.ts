import * as p from '@clack/prompts';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { getAllExtensions } from '@/plugins/index.js';
import {
  detectFileExtensions,
  readPackageJson,
  detectHusky,
  generateConfig,
} from './wizardUtils.js';

export {
  detectFileExtensions,
  readPackageJson,
  detectHusky,
  generateConfig,
  loadConfigFile,
} from './wizardUtils.js';
export type { AutoImportConfig } from './wizardUtils.js';

function handleCancel(value: unknown): void {
  if (p.isCancel(value)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }
}

export async function runSetupWizard(directory: string): Promise<void> {
  const projectRoot = path.resolve(directory);

  p.intro(chalk.blue.bold('auto-import') + chalk.gray(' — Setup Wizard'));

  const spin = p.spinner();
  spin.start('Detecting file types in your project...');

  const allDetected = await detectFileExtensions(projectRoot);
  const supportedExts = getAllExtensions();
  const detected = allDetected.filter(ext => supportedExts.includes(ext));
  const unsupported = allDetected.filter(ext => !supportedExts.includes(ext));

  spin.stop(`Found ${allDetected.length} file types (${detected.length} supported)`);

  if (unsupported.length > 0) {
    p.log.info(
      chalk.gray('Unsupported types (skipped): ') +
      chalk.gray(unsupported.slice(0, 12).join(', ')) +
      (unsupported.length > 12 ? chalk.gray('...') : ''),
    );
  }

  if (detected.length === 0 && supportedExts.length > 0) {
    p.log.warn('No supported file types detected — showing all available types.');
  }

  const extensions = await p.multiselect({
    message: 'Which file types should auto-import scan?',
    options: supportedExts.map(ext => ({
      value: ext,
      label: ext,
      hint: detected.includes(ext) ? 'detected in project' : undefined,
    })),
    initialValues: detected.length > 0 ? detected : undefined,
    required: true,
  });
  handleCancel(extensions);
  const selectedExtensions = extensions as string[];

  let hasTsconfig = false;
  try { await fs.access(path.join(projectRoot, 'tsconfig.json')); hasTsconfig = true; } catch { /* noop */ }

  const useAliases = await p.confirm({
    message: `Enable tsconfig path alias resolution?${hasTsconfig ? chalk.gray(' (tsconfig.json detected)') : ''}`,
    initialValue: hasTsconfig,
  });
  handleCancel(useAliases);

  const config = generateConfig({
    extensions: selectedExtensions,
    ignore: [],
    useAliases: useAliases as boolean,
  });

  const configPath = path.join(projectRoot, '.auto-import.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  p.log.success('Created ' + chalk.cyan('.auto-import.json'));

  const runScan = await p.confirm({
    message: 'Run an import scan now? (dry-run preview)',
    initialValue: true,
  });
  handleCancel(runScan);

  if (runScan) {
    spin.start('Scanning for missing imports...');
    try {
      const { AutoImportCli } = await import('./autoImportCli.js');
      const cli = new AutoImportCli();
      await cli.run(projectRoot, {
        dryRun: true,
        verbose: true,
        extensions: selectedExtensions.join(','),
        noAlias: !(useAliases as boolean),
      });
      spin.stop('Scan complete');
    } catch (err) {
      spin.stop('Scan encountered an error');
      p.log.error(String(err));
    }
  }

  const pkg = await readPackageJson(projectRoot);

  if (pkg) {
    const addScripts = await p.confirm({
      message: 'Add auto-import scripts to package.json?',
      initialValue: true,
    });
    handleCancel(addScripts);

    if (addScripts) {
      pkg.scripts = pkg.scripts || {};
      pkg.scripts['auto-import'] = 'auto-import';
      pkg.scripts['auto-import:check'] = 'auto-import --dry-run --verbose';
      pkg.scripts['auto-import:fix'] = 'auto-import';
      await fs.writeFile(
        path.join(projectRoot, 'package.json'),
        JSON.stringify(pkg, null, 2) + '\n',
        'utf-8',
      );
      p.log.success('Added scripts: ' + chalk.cyan('auto-import, auto-import:check, auto-import:fix'));
    }
  } else {
    p.log.info(chalk.gray('No package.json found — skipping script injection.'));
  }

  const husky = await detectHusky(projectRoot);

  if (husky.installed && husky.hasPreCommit) {
    const addHook = await p.confirm({
      message: 'Husky pre-commit hook detected. Add auto-import check?',
      initialValue: true,
    });
    if (!p.isCancel(addHook) && addHook) {
      const hookPath = path.join(projectRoot, '.husky', 'pre-commit');
      const existing = await fs.readFile(hookPath, 'utf-8');
      if (!existing.includes('auto-import')) {
        await fs.writeFile(hookPath, existing.trimEnd() + '\nnpx auto-import --dry-run\n', 'utf-8');
        p.log.success('Added auto-import check to pre-commit hook');
      } else {
        p.log.info('auto-import already present in pre-commit hook');
      }
    }
  } else if (husky.installed && !husky.hasPreCommit) {
    const createHook = await p.confirm({
      message: 'Husky installed but no pre-commit hook found. Create one?',
      initialValue: true,
    });
    if (!p.isCancel(createHook) && createHook) {
      const hookPath = path.join(projectRoot, '.husky', 'pre-commit');
      await fs.mkdir(path.join(projectRoot, '.husky'), { recursive: true });
      await fs.writeFile(hookPath, 'npx auto-import --dry-run\n', 'utf-8');
      try { await fs.chmod(hookPath, 0o755); } catch { /* noop */ }
      p.log.success('Created pre-commit hook with auto-import check');
    }
  } else {
    const installHusky = await p.confirm({
      message: 'Install husky for pre-commit import checks? (recommended)',
      initialValue: false,
    });
    if (!p.isCancel(installHusky) && installHusky) {
      spin.start('Installing husky...');
      try {
        execSync('npm install --save-dev husky', { cwd: projectRoot, stdio: 'pipe' });
        execSync('npx husky init', { cwd: projectRoot, stdio: 'pipe' });
        const hookPath = path.join(projectRoot, '.husky', 'pre-commit');
        await fs.writeFile(hookPath, 'npx auto-import --dry-run\n', 'utf-8');
        try { await fs.chmod(hookPath, 0o755); } catch { /* noop */ }
        spin.stop('Husky installed with pre-commit hook');
      } catch {
        spin.stop('Husky installation failed');
        p.log.warn('You can install manually: ' + chalk.cyan('npm install --save-dev husky && npx husky init'));
      }
    }
  }

  const huskyLabel = husky.installed ? 'configured' : 'skipped';

  p.note(
    [
      `${chalk.bold('Config:')}        .auto-import.json`,
      `${chalk.bold('Extensions:')}    ${selectedExtensions.join(', ')}`,
      `${chalk.bold('Aliases:')}       ${useAliases ? 'enabled' : 'disabled'}`,
      `${chalk.bold('Husky:')}         ${huskyLabel}`,
      '',
      `${chalk.gray('Run')} ${chalk.cyan('auto-import')}            ${chalk.gray('to fix missing imports')}`,
      `${chalk.gray('Run')} ${chalk.cyan('auto-import --dry-run')}  ${chalk.gray('to preview changes')}`,
      `${chalk.gray('Run')} ${chalk.cyan('auto-import init')}       ${chalk.gray('to reconfigure')}`,
    ].join('\n'),
    'Setup Summary',
  );

  p.outro(chalk.green('Setup complete!'));
}
