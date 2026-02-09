import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileScanner } from '@/scanner/fileScanner.js';
import { ImportResolver } from '@/resolver/importResolver.js';
import type { LanguagePlugin } from '@/plugins/languagePlugin.js';
import { getPluginForExtension, getDefaultPlugins, getAllExtensions } from '@/plugins/index.js';

export interface CliOptions {
  dryRun?: boolean;
  verbose?: boolean;
  config?: string;
  extensions?: string;
  ignore?: string;
  noAlias?: boolean;
}

export interface MissingImport {
  identifier: string;
  file: string;
  suggestion?: {
    source: string;
    isDefault: boolean;
  };
}

export class AutoImportCli {
  private scanner: FileScanner;
  private plugins: LanguagePlugin[];
  private resolver?: ImportResolver;

  constructor(plugins?: LanguagePlugin[]) {
    this.scanner = new FileScanner();
    this.plugins = plugins ?? getDefaultPlugins();
  }

  async run(directory: string, options: CliOptions = {}): Promise<void> {
    console.log(chalk.blue('🔍 Auto Import CLI'));
    console.log(chalk.gray(`Scanning directory: ${directory}\n`));

    const projectRoot = path.resolve(directory);

    const extensions = options.extensions
      ? options.extensions.split(',').map(ext => ext.trim().startsWith('.') ? ext.trim() : '.' + ext.trim())
      : getAllExtensions(this.plugins);

    console.log(chalk.yellow('Building export cache...'));
    this.resolver = new ImportResolver({
      projectRoot,
      extensions,
      useAliases: !options.noAlias,
      plugins: this.plugins,
    });
    await this.resolver.buildExportCache();
    console.log(chalk.green('✓ Export cache built\n'));

    const ignore = options.ignore
      ? options.ignore.split(',').map(pattern => pattern.trim())
      : undefined;

    const files = await this.scanner.scan({
      cwd: projectRoot,
      extensions,
      ignore,
    });

    console.log(chalk.gray(`Found ${files.length} files to analyze\n`));

    const allMissingImports: MissingImport[] = [];
    let filesWithIssues = 0;

    for (const file of files) {
      const plugin = getPluginForExtension(file.ext, this.plugins);
      if (!plugin) continue;

      const existingImports = plugin.parseImports(file.content, file.path);
      const usedIdentifiers = plugin.findUsedIdentifiers(file.content, file.path);

      const importedNames = new Set<string>();
      existingImports.forEach(imp => imp.imports.forEach(name => importedNames.add(name)));

      const missingIdentifiers = usedIdentifiers
        .map(id => id.name)
        .filter((name, idx, self) => self.indexOf(name) === idx)
        .filter(name => !importedNames.has(name))
        .filter(name => !plugin.isBuiltInOrKeyword(name));

      if (missingIdentifiers.length > 0) {
        filesWithIssues++;

        if (options.verbose) {
          console.log(chalk.yellow(`\n📄 ${path.relative(projectRoot, file.path)}`));
          console.log(chalk.gray(`   (${plugin.name})`));
        }

        for (const identifier of missingIdentifiers) {
          const resolution = this.resolver!.resolveImport(identifier, file.path);

          const missingImport: MissingImport = { identifier, file: file.path };

          if (resolution) {
            missingImport.suggestion = {
              source: resolution.source,
              isDefault: resolution.isDefault,
            };

            if (options.verbose) {
              const stmt = plugin.generateImportStatement(identifier, resolution.source, resolution.isDefault);
              console.log(chalk.gray(`  - ${identifier}`) + chalk.green(` → ${stmt}`));
            }
          } else {
            if (options.verbose) {
              console.log(chalk.gray(`  - ${identifier}`) + chalk.red(' → not found in project'));
            }
          }

          allMissingImports.push(missingImport);
        }
      }
    }

    console.log(chalk.blue('\n\n📊 Summary:'));
    console.log(chalk.gray(`  Total files scanned: ${files.length}`));
    console.log(chalk.gray(`  Files with missing imports: ${filesWithIssues}`));
    console.log(chalk.gray(`  Total missing imports: ${allMissingImports.length}`));
    console.log(chalk.gray(`  Resolvable imports: ${allMissingImports.filter(m => m.suggestion).length}`));

    if (options.dryRun) {
      console.log(chalk.yellow('\n⚠️  Dry run mode - no files were modified'));
    } else {
      const fixable = allMissingImports.filter(m => m.suggestion);
      if (fixable.length > 0) {
        console.log(chalk.blue(`\n✨ Applying ${fixable.length} fixes...`));
        await this.applyFixes(fixable);
        console.log(chalk.green('✓ Fixes applied successfully'));
      } else {
        console.log(chalk.yellow('\n⚠️  No resolvable imports found'));
      }
    }
  }

  private async applyFixes(missingImports: MissingImport[]): Promise<void> {
    const fileMap = new Map<string, MissingImport[]>();
    for (const item of missingImports) {
      if (!fileMap.has(item.file)) {
        fileMap.set(item.file, []);
      }
      fileMap.get(item.file)!.push(item);
    }

    for (const [filePath, imports] of fileMap.entries()) {
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath);
      const plugin = getPluginForExtension(ext, this.plugins);
      if (!plugin) continue;

      const newImports: string[] = [];
      for (const item of imports) {
        if (item.suggestion) {
          newImports.push(
            plugin.generateImportStatement(item.identifier, item.suggestion.source, item.suggestion.isDefault)
          );
        }
      }

      if (newImports.length === 0) continue;

      const newContent = plugin.insertImports(content, newImports, filePath);
      await fs.writeFile(filePath, newContent, 'utf-8');
    }
  }
}

export function createCli(): Command {
  const program = new Command();

  program
    .name('auto-import')
    .description('Automatically scan and fix missing imports in your project')
    .version('1.0.0')
    .argument('[directory]', 'Directory to scan', '.')
    .option('-d, --dry-run', 'Show what would be changed without making changes')
    .option('-v, --verbose', 'Show detailed output')
    .option('-e, --extensions <extensions>', 'File extensions to scan (comma-separated)', '.ts,.tsx,.js,.jsx,.vue,.svelte,.astro,.py')
    .option('-i, --ignore <patterns>', 'Patterns to ignore (comma-separated)')
    .option('-c, --config <path>', 'Path to config file')
    .option('--no-alias', 'Disable tsconfig path alias resolution')
    .action(async (directory: string, options: CliOptions) => {
      try {
        const cli = new AutoImportCli();
        await cli.run(directory, options);
      } catch (error) {
        console.error(chalk.red('\n❌ Error:'), error);
        process.exit(1);
      }
    });

  return program;
}
