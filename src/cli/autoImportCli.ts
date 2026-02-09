import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileScanner } from '../scanner/fileScanner.js';
import { AstParser } from '../parser/astParser.js';
import { ImportResolver } from '../resolver/importResolver.js';

export interface CliOptions {
  dryRun?: boolean;
  verbose?: boolean;
  config?: string;
  extensions?: string;
  ignore?: string;
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
  private parser: AstParser;
  private resolver?: ImportResolver;

  constructor() {
    this.scanner = new FileScanner();
    this.parser = new AstParser();
  }

  async run(directory: string, options: CliOptions = {}): Promise<void> {
    console.log(chalk.blue('🔍 Auto Import CLI'));
    console.log(chalk.gray(`Scanning directory: ${directory}\n`));

    const projectRoot = path.resolve(directory);

    // Initialize resolver and build export cache
    console.log(chalk.yellow('Building export cache...'));
    this.resolver = new ImportResolver({ projectRoot });
    await this.resolver.buildExportCache();
    console.log(chalk.green('✓ Export cache built\n'));

    // Parse extensions and ignore patterns
    const extensions = options.extensions 
      ? options.extensions.split(',').map(ext => ext.trim().startsWith('.') ? ext.trim() : '.' + ext.trim())
      : undefined;
    
    const ignore = options.ignore 
      ? options.ignore.split(',').map(pattern => pattern.trim())
      : undefined;

    // Scan files
    const files = await this.scanner.scan({
      cwd: projectRoot,
      extensions,
      ignore,
    });

    console.log(chalk.gray(`Found ${files.length} files to analyze\n`));

    // Analyze each file
    const allMissingImports: MissingImport[] = [];
    let filesWithIssues = 0;

    for (const file of files) {
      const parseResult = this.parser.parse(file.content);
      
      if (parseResult.missingImports.length > 0) {
        filesWithIssues++;
        
        if (options.verbose) {
          console.log(chalk.yellow(`\n📄 ${path.relative(projectRoot, file.path)}`));
        }

        for (const identifier of parseResult.missingImports) {
          const resolution = this.resolver!.resolveImport(identifier, file.path);
          
          const missingImport: MissingImport = {
            identifier,
            file: file.path,
          };

          if (resolution) {
            missingImport.suggestion = {
              source: resolution.source,
              isDefault: resolution.isDefault,
            };
            
            if (options.verbose) {
              console.log(
                chalk.gray(`  - ${identifier}`) +
                chalk.green(` → import ${resolution.isDefault ? identifier : `{ ${identifier} }`} from '${resolution.source}'`)
              );
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

    // Summary
    console.log(chalk.blue('\n\n📊 Summary:'));
    console.log(chalk.gray(`  Total files scanned: ${files.length}`));
    console.log(chalk.gray(`  Files with missing imports: ${filesWithIssues}`));
    console.log(chalk.gray(`  Total missing imports: ${allMissingImports.length}`));
    console.log(chalk.gray(`  Resolvable imports: ${allMissingImports.filter(m => m.suggestion).length}`));

    if (options.dryRun) {
      console.log(chalk.yellow('\n⚠️  Dry run mode - no files were modified'));
    } else {
      // Apply fixes
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
    // Group by file
    const fileMap = new Map<string, MissingImport[]>();
    for (const item of missingImports) {
      if (!fileMap.has(item.file)) {
        fileMap.set(item.file, []);
      }
      fileMap.get(item.file)!.push(item);
    }

    // Apply fixes to each file
    for (const [filePath, imports] of fileMap.entries()) {
      let content = await fs.readFile(filePath, 'utf-8');
      
      // Find the position to insert imports (after existing imports)
      const lines = content.split('\n');
      let lastImportLine = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportLine = i;
        }
      }

      // Generate import statements
      const newImports: string[] = [];
      for (const item of imports) {
        if (item.suggestion) {
          const importStatement = item.suggestion.isDefault
            ? `import ${item.identifier} from '${item.suggestion.source}';`
            : `import { ${item.identifier} } from '${item.suggestion.source}';`;
          
          newImports.push(importStatement);
        }
      }

      // Insert imports
      if (newImports.length > 0) {
        const insertIndex = lastImportLine + 1;
        lines.splice(insertIndex, 0, ...newImports);
        
        const newContent = lines.join('\n');
        await fs.writeFile(filePath, newContent, 'utf-8');
      }
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
    .option('-e, --extensions <extensions>', 'File extensions to scan (comma-separated)', '.ts,.tsx,.js,.jsx')
    .option('-i, --ignore <patterns>', 'Patterns to ignore (comma-separated)')
    .option('-c, --config <path>', 'Path to config file')
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
