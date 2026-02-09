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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const BACK = Symbol('BACK');
type StepResult = typeof BACK | void;

function cancelled(value: unknown): boolean {
  if (p.isCancel(value)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }
  return false;
}

/** Show a "← Go back / Continue →" gate. Returns true when user picks back. */
async function backGate(stepLabel: string): Promise<boolean> {
  const nav = await p.select({
    message: chalk.gray(`Step: ${stepLabel}`),
    options: [
      { value: 'next', label: 'Continue →' },
      { value: 'back', label: '← Go back', hint: 'redo previous step' },
    ],
  });
  cancelled(nav);
  return nav === 'back';
}

/* ------------------------------------------------------------------ */
/*  Wizard state — accumulated across steps                            */
/* ------------------------------------------------------------------ */

interface WizardState {
  projectRoot: string;
  detected: string[];
  unsupported: string[];
  supportedExts: string[];
  selectedExtensions: string[];
  hasTsconfig: boolean;
  useAliases: boolean;
}

/* ------------------------------------------------------------------ */
/*  Step definitions                                                   */
/* ------------------------------------------------------------------ */

/** Step 1: Select file extensions */
async function stepExtensions(state: WizardState): Promise<StepResult> {
  if (state.detected.length === 0 && state.supportedExts.length > 0) {
    p.log.warn('No supported file types detected — showing all available types.');
  }

  const extensions = await p.multiselect({
    message: 'Which file types should auto-import scan?',
    options: state.supportedExts.map(ext => ({
      value: ext,
      label: ext,
      hint: state.detected.includes(ext) ? 'detected in project' : undefined,
    })),
    initialValues: state.selectedExtensions.length > 0
      ? state.selectedExtensions
      : (state.detected.length > 0 ? state.detected : undefined),
    required: true,
  });
  cancelled(extensions);
  state.selectedExtensions = extensions as string[];
}

/** Step 2: Alias resolution */
async function stepAliases(state: WizardState): Promise<StepResult> {
  if (await backGate('Path aliases')) return BACK;

  const useAliases = await p.confirm({
    message: `Enable tsconfig path alias resolution?${state.hasTsconfig ? chalk.gray(' (tsconfig.json detected)') : ''}`,
    initialValue: state.useAliases ?? state.hasTsconfig,
  });
  cancelled(useAliases);
  state.useAliases = useAliases as boolean;
}

/** Step 3: Write config + optional dry-run scan */
async function stepConfigAndScan(state: WizardState): Promise<StepResult> {
  if (await backGate('Config & scan')) return BACK;

  const config = generateConfig({
    extensions: state.selectedExtensions,
    ignore: [],
    useAliases: state.useAliases,
  });

  const configPath = path.join(state.projectRoot, '.auto-import.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  p.log.success('Created ' + chalk.cyan('.auto-import.json'));

  const runScan = await p.confirm({
    message: 'Run an import scan now? (dry-run preview)',
    initialValue: true,
  });
  cancelled(runScan);

  if (runScan) {
    const spin = p.spinner();
    spin.start('Scanning for missing imports...');
    try {
      const { AutoImportCli } = await import('./autoImportCli.js');
      const cli = new AutoImportCli();
      await cli.run(state.projectRoot, {
        dryRun: true,
        verbose: true,
        extensions: state.selectedExtensions.join(','),
        noAlias: !state.useAliases,
      });
      spin.stop('Scan complete');
    } catch (err) {
      spin.stop('Scan encountered an error');
      p.log.error(String(err));
    }
  }
}

/** Step 4: npm scripts */
async function stepScripts(state: WizardState): Promise<StepResult> {
  if (await backGate('npm scripts')) return BACK;

  const pkg = await readPackageJson(state.projectRoot);

  if (pkg) {
    const addScripts = await p.confirm({
      message: 'Add auto-import scripts to package.json?',
      initialValue: true,
    });
    cancelled(addScripts);

    if (addScripts) {
      pkg.scripts = pkg.scripts || {};
      pkg.scripts['auto-import'] = 'auto-import';
      pkg.scripts['auto-import:check'] = 'auto-import --dry-run --verbose';
      pkg.scripts['auto-import:fix'] = 'auto-import';
      await fs.writeFile(
        path.join(state.projectRoot, 'package.json'),
        JSON.stringify(pkg, null, 2) + '\n',
        'utf-8',
      );
      p.log.success('Added scripts: ' + chalk.cyan('auto-import, auto-import:check, auto-import:fix'));
    }
  } else {
    p.log.info(chalk.gray('No package.json found — skipping script injection.'));
  }
}

/** Step 5: Husky integration */
async function stepHusky(state: WizardState): Promise<StepResult> {
  if (await backGate('Husky hooks')) return BACK;

  const husky = await detectHusky(state.projectRoot);

  if (husky.installed && husky.hasPreCommit) {
    const addHook = await p.confirm({
      message: 'Husky pre-commit hook detected. Add auto-import check?',
      initialValue: true,
    });
    if (!p.isCancel(addHook) && addHook) {
      const hookPath = path.join(state.projectRoot, '.husky', 'pre-commit');
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
      const hookPath = path.join(state.projectRoot, '.husky', 'pre-commit');
      await fs.mkdir(path.join(state.projectRoot, '.husky'), { recursive: true });
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
      const spin = p.spinner();
      spin.start('Installing husky...');
      try {
        execSync('npm install --save-dev husky', { cwd: state.projectRoot, stdio: 'pipe' });
        execSync('npx husky init', { cwd: state.projectRoot, stdio: 'pipe' });
        const hookPath = path.join(state.projectRoot, '.husky', 'pre-commit');
        await fs.writeFile(hookPath, 'npx auto-import --dry-run\n', 'utf-8');
        try { await fs.chmod(hookPath, 0o755); } catch { /* noop */ }
        spin.stop('Husky installed with pre-commit hook');
      } catch {
        spin.stop('Husky installation failed');
        p.log.warn('You can install manually: ' + chalk.cyan('npm install --save-dev husky && npx husky init'));
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Main wizard — step-index loop with back/forward navigation         */
/* ------------------------------------------------------------------ */

export async function runSetupWizard(directory: string): Promise<void> {
  const projectRoot = path.resolve(directory);

  p.intro(chalk.blue.bold('auto-import') + chalk.gray(' — Setup Wizard'));

  // Detection phase (not navigable — runs once)
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

  let hasTsconfig = false;
  try { await fs.access(path.join(projectRoot, 'tsconfig.json')); hasTsconfig = true; } catch { /* noop */ }

  // Wizard state — persists across back/forward navigation
  const state: WizardState = {
    projectRoot,
    detected,
    unsupported,
    supportedExts,
    selectedExtensions: [],
    hasTsconfig,
    useAliases: hasTsconfig,
  };

  // Step loop — back returns BACK, forward returns void
  const steps: Array<(s: WizardState) => Promise<StepResult>> = [
    stepExtensions,
    stepAliases,
    stepConfigAndScan,
    stepScripts,
    stepHusky,
  ];

  let stepIndex = 0;
  while (stepIndex < steps.length) {
    const result = await steps[stepIndex](state);
    if (result === BACK) {
      stepIndex = Math.max(0, stepIndex - 1);
    } else {
      stepIndex++;
    }
  }

  // Summary
  p.note(
    [
      `${chalk.bold('Config:')}        .auto-import.json`,
      `${chalk.bold('Extensions:')}    ${state.selectedExtensions.join(', ')}`,
      `${chalk.bold('Aliases:')}       ${state.useAliases ? 'enabled' : 'disabled'}`,
      '',
      `${chalk.gray('Run')} ${chalk.cyan('auto-import')}            ${chalk.gray('to fix missing imports')}`,
      `${chalk.gray('Run')} ${chalk.cyan('auto-import --dry-run')}  ${chalk.gray('to preview changes')}`,
      `${chalk.gray('Run')} ${chalk.cyan('auto-import init')}       ${chalk.gray('to reconfigure')}`,
    ].join('\n'),
    'Setup Summary',
  );

  p.outro(chalk.green('Setup complete!'));
}
