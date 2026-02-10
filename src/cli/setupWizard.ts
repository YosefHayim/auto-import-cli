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
  reportFormat: 'md' | 'json' | 'txt' | 'none';
}

/* ------------------------------------------------------------------ */
/*  Step definitions                                                   */
/* ------------------------------------------------------------------ */

/** Step 1: Select file extensions */
async function stepExtensions(state: WizardState): Promise<StepResult> {
  if (state.detected.length === 0 && state.supportedExts.length > 0) {
    p.log.warn('No supported file types detected — showing all available types.');
  }

  if (state.supportedExts.length === 0) {
    p.log.warn('No supported file extensions available.');
    state.selectedExtensions = [];
    return;
  }

  const extensions = await p.multiselect({
    message: 'Which file types should import-pilot scan?',
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

/** Step 3: Report format */
async function stepReportFormat(state: WizardState): Promise<StepResult> {
  if (await backGate('Report format')) return BACK;

  const format = await p.select({
    message: 'Generate a report after each run?',
    options: [
      { value: 'none', label: 'No report', hint: 'default' },
      { value: 'md', label: 'Markdown (.md)' },
      { value: 'json', label: 'JSON (.json)' },
      { value: 'txt', label: 'Plain text (.txt)' },
    ],
    initialValue: state.reportFormat,
  });
  cancelled(format);
  state.reportFormat = format as WizardState['reportFormat'];
}

/** Step 4: Write config + optional dry-run scan */
async function stepConfigAndScan(state: WizardState): Promise<StepResult> {
  if (await backGate('Config & scan')) return BACK;

  const config = generateConfig({
    extensions: state.selectedExtensions,
    ignore: [],
    useAliases: state.useAliases,
    report: state.reportFormat,
  });

  const configPath = path.join(state.projectRoot, '.import-pilot.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  p.log.success('Created ' + chalk.cyan('.import-pilot.json'));

  const runScan = await p.confirm({
    message: 'Run an import scan now? (dry-run preview)',
    initialValue: true,
  });
  cancelled(runScan);

  if (runScan) {
    p.log.info('Running scan...');
    try {
      const { AutoImportCli } = await import('./autoImportCli.js');
      const cli = new AutoImportCli();
      await cli.run(state.projectRoot, {
        dryRun: true,
        verbose: true,
        extensions: state.selectedExtensions.join(','),
        noAlias: !state.useAliases,
      });
      p.log.success('Scan complete');
    } catch (err) {
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
      message: 'Add import-pilot scripts to package.json?',
      initialValue: true,
    });
    cancelled(addScripts);

    if (addScripts) {
      pkg.scripts = pkg.scripts || {};
      if (pkg.scripts['import-pilot']) {
        const overwrite = await p.confirm({ message: 'import-pilot scripts already exist. Overwrite?' });
        if (p.isCancel(overwrite) || !overwrite) return;
      }
      pkg.scripts['import-pilot'] = 'import-pilot';
      pkg.scripts['import-pilot:check'] = 'import-pilot --dry-run --verbose';
      pkg.scripts['import-pilot:fix'] = 'import-pilot';
      await fs.writeFile(
        path.join(state.projectRoot, 'package.json'),
        JSON.stringify(pkg, null, 2) + '\n',
        'utf-8',
      );
      p.log.success('Added scripts: ' + chalk.cyan('import-pilot, import-pilot:check, import-pilot:fix'));
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
      message: 'Husky pre-commit hook detected. Add import-pilot check?',
      initialValue: true,
    });
    if (!p.isCancel(addHook) && addHook) {
      const hookPath = path.join(state.projectRoot, '.husky', 'pre-commit');
      try {
        const existing = await fs.readFile(hookPath, 'utf-8');
        if (!existing.includes('import-pilot')) {
          await fs.writeFile(hookPath, existing.trimEnd() + '\nnpx import-pilot --dry-run\n', 'utf-8');
          p.log.success('Added import-pilot check to pre-commit hook');
        } else {
          p.log.info('import-pilot already present in pre-commit hook');
        }
      } catch {
        p.log.warn('Could not read pre-commit hook file');
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
      await fs.writeFile(hookPath, 'npx import-pilot --dry-run\n', 'utf-8');
      try { await fs.chmod(hookPath, 0o755); } catch { /* noop */ }
      p.log.success('Created pre-commit hook with import-pilot check');
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
        await fs.writeFile(hookPath, 'npx import-pilot --dry-run\n', 'utf-8');
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

  p.intro(chalk.blue.bold('import-pilot') + chalk.gray(' — Setup Wizard'));

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
    reportFormat: 'none',
  };

  // Step loop — back returns BACK, forward returns void
  const steps: Array<(s: WizardState) => Promise<StepResult>> = [
    stepExtensions,
    stepAliases,
    stepReportFormat,
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
      `${chalk.bold('Config:')}        .import-pilot.json`,
      `${chalk.bold('Extensions:')}    ${state.selectedExtensions.join(', ')}`,
      `${chalk.bold('Aliases:')}       ${state.useAliases ? 'enabled' : 'disabled'}`,
      `${chalk.bold('Report:')}        ${state.reportFormat === 'none' ? 'off' : state.reportFormat}`,
      '',
      `${chalk.gray('Run')} ${chalk.cyan('import-pilot')}            ${chalk.gray('to fix missing imports')}`,
      `${chalk.gray('Run')} ${chalk.cyan('import-pilot --dry-run')}  ${chalk.gray('to preview changes')}`,
      `${chalk.gray('Run')} ${chalk.cyan('import-pilot init')}       ${chalk.gray('to reconfigure')}`,
    ].join('\n'),
    'Setup Summary',
  );

  p.outro(chalk.green('Setup complete!'));
}
