import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import type { LanguagePlugin } from '@/plugins/languagePlugin.js';
import { getPluginForExtension } from '@/plugins/index.js';

export interface ExportInfo {
  name: string;
  source: string;
  isDefault: boolean;
  isType?: boolean;
}

export interface ResolverOptions {
  projectRoot: string;
  extensions?: string[];
  useAliases?: boolean;
  plugins?: LanguagePlugin[];
}

export interface PathAlias {
  pattern: string; // e.g. "@/*"
  prefix: string; // e.g. "@/"
  targetPrefix: string; // e.g. "src/"
}

export class ImportResolver {
  private exportCache: Map<string, ExportInfo[]> = new Map();
  private options: ResolverOptions;
  private pathAliases: PathAlias[] = [];

  constructor(options: ResolverOptions) {
    this.options = {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      useAliases: true,
      ...options,
    };
  }

  async buildExportCache(): Promise<void> {
    if (this.options.useAliases) {
      await this.loadPathAliases();
    }

    const pattern = `**/*{${this.options.extensions!.join(',')}}`;
    const files = await glob(pattern, {
      cwd: this.options.projectRoot,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/__pycache__/**',
        '**/.venv/**',
        '**/venv/**',
      ],
      absolute: true,
      nodir: true,
    });

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath);
        const plugin = getPluginForExtension(ext, this.options.plugins);
        const exports = plugin ? plugin.parseExports(content, filePath) : this.parseExportsLegacy(content, filePath);

        if (exports.length > 0) {
          this.exportCache.set(filePath, exports);
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  resolveImport(identifier: string, currentFile: string): ExportInfo | null {
    for (const [filePath, exports] of this.exportCache.entries()) {
      if (filePath === currentFile) continue;

      const matchingExport = exports.find((exp) => exp.name === identifier);
      if (matchingExport) {
        const relativePath = this.getRelativeImportPath(currentFile, filePath);
        return {
          ...matchingExport,
          source: relativePath,
        };
      }
    }

    return null;
  }

  private parseExportsLegacy(content: string, filePath: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    let match;

    const exportFunctionRegex = /export\s+(async\s+)?function\s+(\w+)/g;
    while ((match = exportFunctionRegex.exec(content)) !== null) {
      exports.push({ name: match[2], source: filePath, isDefault: false });
    }

    const exportVarRegex = /export\s+(const|let|var)\s+(\w+)/g;
    while ((match = exportVarRegex.exec(content)) !== null) {
      exports.push({ name: match[2], source: filePath, isDefault: false });
    }

    const exportClassRegex = /export\s+class\s+(\w+)/g;
    while ((match = exportClassRegex.exec(content)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    const exportInterfaceRegex = /export\s+interface\s+(\w+)/g;
    while ((match = exportInterfaceRegex.exec(content)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false, isType: true });
    }

    const exportTypeRegex = /export\s+type\s+(\w+)/g;
    while ((match = exportTypeRegex.exec(content)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false, isType: true });
    }

    const exportDefaultNameRegex = /export\s+default\s+(async\s+)?(class|function)\s+(\w+)/g;
    while ((match = exportDefaultNameRegex.exec(content)) !== null) {
      exports.push({ name: match[3], source: filePath, isDefault: true });
    }

    const exportNamedRegex = /export\s+\{([^}]+)\}/g;
    while ((match = exportNamedRegex.exec(content)) !== null) {
      const names = match[1]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      names.forEach((name) => {
        const stripped = name.replace(/^type\s+/, '');
        const parts = stripped.split(/\s+as\s+/);
        const exportedName = parts[parts.length - 1].replace(/^type\s+/, '');
        exports.push({ name: exportedName, source: filePath, isDefault: false });
      });
    }

    return exports;
  }

  private async loadPathAliases(): Promise<void> {
    try {
      const tsconfigPath = path.join(this.options.projectRoot, 'tsconfig.json');
      const content = await fs.readFile(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(stripJsonComments(content));

      const baseUrl = tsconfig.compilerOptions?.baseUrl || '.';
      const paths: Record<string, string[]> = tsconfig.compilerOptions?.paths || {};
      const resolvedBaseUrl = path.resolve(this.options.projectRoot, baseUrl);

      for (const [aliasPattern, targets] of Object.entries(paths)) {
        if (!Array.isArray(targets) || targets.length === 0) continue;

        const target = targets[0];
        const hasWildcard = aliasPattern.includes('*');

        if (hasWildcard) {
          this.pathAliases.push({
            pattern: aliasPattern,
            prefix: aliasPattern.replace('*', ''),
            targetPrefix: path.resolve(resolvedBaseUrl, target.replace('*', '')) + path.sep,
          });
        } else {
          this.pathAliases.push({
            pattern: aliasPattern,
            prefix: aliasPattern,
            targetPrefix: path.resolve(resolvedBaseUrl, target),
          });
        }
      }

      this.pathAliases.sort((a, b) => b.prefix.length - a.prefix.length);
    } catch {
      this.pathAliases = [];
    }
  }

  private getAliasImportPath(toFile: string): string | null {
    const normalizedToFile = path.resolve(toFile);

    for (const alias of this.pathAliases) {
      const normalizedTarget = path.normalize(alias.targetPrefix);

      if (normalizedToFile.startsWith(normalizedTarget)) {
        const remainder = normalizedToFile.slice(normalizedTarget.length);
        const withoutExt = remainder.replace(/\\/g, '/').replace(/\.(ts|tsx|js|jsx|py)$/, '');
        return alias.prefix + withoutExt;
      }
    }

    return null;
  }

  private getRelativeImportPath(fromFile: string, toFile: string): string {
    if (this.pathAliases.length > 0) {
      const aliasPath = this.getAliasImportPath(toFile);
      if (aliasPath) return aliasPath;
    }

    const fromDir = path.dirname(fromFile);
    let relativePath = path.relative(fromDir, toFile).replace(/\\/g, '/');

    relativePath = relativePath.replace(/\.(ts|tsx|js|jsx|py)$/, '');

    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }

    return relativePath;
  }

  getExportCache(): Map<string, ExportInfo[]> {
    return this.exportCache;
  }

  getPathAliases(): PathAlias[] {
    return this.pathAliases;
  }
}

function stripJsonComments(text: string): string {
  let result = text.replace(/\/\*[\s\S]*?\*\//g, '');
  result = result.replace(/\/\/.*$/gm, '');
  result = result.replace(/,\s*([}\]])/g, '$1');
  return result;
}
