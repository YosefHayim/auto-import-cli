import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

export interface ExportInfo {
  name: string;
  source: string;
  isDefault: boolean;
  isType?: boolean;
}

export interface ResolverOptions {
  projectRoot: string;
  extensions?: string[];
}

export class ImportResolver {
  private exportCache: Map<string, ExportInfo[]> = new Map();
  private options: ResolverOptions;

  constructor(options: ResolverOptions) {
    this.options = {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      ...options,
    };
  }

  async buildExportCache(): Promise<void> {
    const pattern = `**/*{${this.options.extensions!.join(',')}}`;
    const files = await glob(pattern, {
      cwd: this.options.projectRoot,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
      ],
      absolute: true,
      nodir: true,
    });

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const exports = this.parseExports(content, filePath);
        
        if (exports.length > 0) {
          this.exportCache.set(filePath, exports);
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  resolveImport(identifier: string, currentFile: string): ExportInfo | null {
    // First, try to find in the cache
    for (const [filePath, exports] of this.exportCache.entries()) {
      // Skip the current file
      if (filePath === currentFile) continue;

      const matchingExport = exports.find(exp => exp.name === identifier);
      if (matchingExport) {
        // Calculate relative import path
        const relativePath = this.getRelativeImportPath(currentFile, filePath);
        return {
          ...matchingExport,
          source: relativePath,
        };
      }
    }

    return null;
  }

  private parseExports(content: string, filePath: string): ExportInfo[] {
    const exports: ExportInfo[] = [];

    // Match: export function name
    const exportFunctionRegex = /export\s+(async\s+)?function\s+(\w+)/g;
    let match;
    while ((match = exportFunctionRegex.exec(content)) !== null) {
      exports.push({
        name: match[2],
        source: filePath,
        isDefault: false,
      });
    }

    // Match: export const/let/var name
    const exportVarRegex = /export\s+(const|let|var)\s+(\w+)/g;
    while ((match = exportVarRegex.exec(content)) !== null) {
      exports.push({
        name: match[2],
        source: filePath,
        isDefault: false,
      });
    }

    // Match: export class name
    const exportClassRegex = /export\s+class\s+(\w+)/g;
    while ((match = exportClassRegex.exec(content)) !== null) {
      exports.push({
        name: match[1],
        source: filePath,
        isDefault: false,
      });
    }

    // Match: export interface name (TypeScript)
    const exportInterfaceRegex = /export\s+interface\s+(\w+)/g;
    while ((match = exportInterfaceRegex.exec(content)) !== null) {
      exports.push({
        name: match[1],
        source: filePath,
        isDefault: false,
        isType: true,
      });
    }

    // Match: export type name (TypeScript)
    const exportTypeRegex = /export\s+type\s+(\w+)/g;
    while ((match = exportTypeRegex.exec(content)) !== null) {
      exports.push({
        name: match[1],
        source: filePath,
        isDefault: false,
        isType: true,
      });
    }

    // Match: export default
    const exportDefaultNameRegex = /export\s+default\s+(class|function)\s+(\w+)/g;
    while ((match = exportDefaultNameRegex.exec(content)) !== null) {
      exports.push({
        name: match[2],
        source: filePath,
        isDefault: true,
      });
    }

    // Match: export { x, y }
    const exportNamedRegex = /export\s+\{([^}]+)\}/g;
    while ((match = exportNamedRegex.exec(content)) !== null) {
      const names = match[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      names.forEach(name => {
      // Handle "as" syntax: export { x as y }
        const parts = name.split(/\s*as\s*/i);
        exports.push({
          name: parts[parts.length - 1],
          source: filePath,
          isDefault: false,
        });
      });
    }

    return exports;
  }

  private getRelativeImportPath(fromFile: string, toFile: string): string {
    const fromDir = path.dirname(fromFile);
    let relativePath = path.relative(fromDir, toFile);
    
    // Remove extension
    relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
    
    // Ensure path starts with ./ or ../
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    
    return relativePath;
  }

  getExportCache(): Map<string, ExportInfo[]> {
    return this.exportCache;
  }
}
