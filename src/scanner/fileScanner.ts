import { glob } from 'glob';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ScanOptions {
  extensions?: string[];
  ignore?: string[];
  cwd?: string;
}

export interface ScannedFile {
  path: string;
  content: string;
  ext: string;
}

export class FileScanner {
  private defaultExtensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.astro'];
  private defaultIgnore = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/.git/**',
    '**/coverage/**',
  ];

  async scan(options: ScanOptions = {}): Promise<ScannedFile[]> {
    const extensions = options.extensions || this.defaultExtensions;
    const ignore = [...this.defaultIgnore, ...(options.ignore || [])];
    const cwd = options.cwd || process.cwd();

    // Create glob pattern for all extensions
    const pattern = extensions.length === 1 
      ? `**/*${extensions[0]}`
      : `**/*{${extensions.join(',')}}`;

    // Find all matching files
    const files = await glob(pattern, {
      cwd,
      ignore,
      absolute: true,
      nodir: true,
    });

    // Read file contents
    const scannedFiles: ScannedFile[] = [];
    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath);
        scannedFiles.push({
          path: filePath,
          content,
          ext,
        });
      } catch (error) {
        console.warn(`Failed to read file ${filePath}:`, error);
      }
    }

    return scannedFiles;
  }

  async scanFile(filePath: string): Promise<ScannedFile | null> {
    try {
      const absolutePath = path.resolve(filePath);
      const content = await fs.readFile(absolutePath, 'utf-8');
      const ext = path.extname(absolutePath);
      return {
        path: absolutePath,
        content,
        ext,
      };
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
      return null;
    }
  }
}
