import type { LanguagePlugin } from './languagePlugin.js';
import type { ImportStatement, UsedIdentifier } from '@/parser/astParser.js';
import type { ExportInfo } from '@/resolver/importResolver.js';

export class GoPlugin implements LanguagePlugin {
  readonly name = 'go';
  readonly extensions = ['.go'];

  parseImports(content: string, _filePath: string): ImportStatement[] {
    const imports: ImportStatement[] = [];
    const stripped = this.stripComments(content);

    // import (\n  "pkg1"\n  alias "pkg2"\n)
    const groupedRegex = /^import\s*\(([^)]*)\)/gm;
    let match;
    while ((match = groupedRegex.exec(stripped)) !== null) {
      const block = match[1];
      const lineRegex = /(?:(\w+)\s+)?"([^"]+)"/g;
      let lineMatch;
      while ((lineMatch = lineRegex.exec(block)) !== null) {
        const alias = lineMatch[1];
        const source = lineMatch[2];
        const pkgName = alias ?? this.packageName(source);
        imports.push({ source, imports: [pkgName], isDefault: true });
      }
    }

    // import "pkg" | import alias "pkg"
    const singleRegex = /^import\s+(?:(\w+)\s+)?"([^"]+)"\s*$/gm;
    while ((match = singleRegex.exec(stripped)) !== null) {
      const alias = match[1];
      const source = match[2];
      const pkgName = alias ?? this.packageName(source);
      imports.push({ source, imports: [pkgName], isDefault: true });
    }

    return imports;
  }

  findUsedIdentifiers(content: string, _filePath: string): UsedIdentifier[] {
    const identifiers: UsedIdentifier[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const trimmed = line.trim();

      if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*') ||
          trimmed.startsWith('*') || trimmed.startsWith('package ') ||
          trimmed.startsWith('import ') || trimmed === 'import (' ||
          trimmed === ')' || /^\s*"[^"]*"\s*$/.test(trimmed)) {
        continue;
      }

      // pkg.Identifier — package-qualified access
      const pkgCallRegex = /(?<![.\w])([a-z][a-zA-Z0-9]*)\.\s*([A-Z][a-zA-Z0-9]*)/g;
      let match;
      while ((match = pkgCallRegex.exec(line)) !== null) {
        const pkgName = match[1];
        if (!this.isBuiltInOrKeyword(pkgName)) {
          identifiers.push({ name: pkgName, line: lineIndex + 1, column: match.index });
        }
      }

      // PascalCase identifiers — Go exported symbols
      const pascalRegex = /(?<![.\w])([A-Z][a-zA-Z0-9]+)\b/g;
      while ((match = pascalRegex.exec(line)) !== null) {
        const name = match[1];
        const before = line.substring(0, match.index);
        if (before.endsWith('.')) continue;
        if (!this.isBuiltInOrKeyword(name) && !GO_TYPE_KEYWORDS.has(name)) {
          identifiers.push({ name, line: lineIndex + 1, column: match.index });
        }
      }
    }

    return identifiers;
  }

  parseExports(content: string, filePath: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const stripped = this.stripComments(content);
    let match;

    // func FunctionName(
    const funcRegex = /^func\s+([A-Z][a-zA-Z0-9]*)\s*\(/gm;
    while ((match = funcRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    // func (receiver) MethodName(
    const methodRegex = /^func\s+\([^)]*\)\s+([A-Z][a-zA-Z0-9]*)\s*\(/gm;
    while ((match = methodRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    // type TypeName struct/interface/...
    const typeRegex = /^type\s+([A-Z][a-zA-Z0-9]*)\s+/gm;
    while ((match = typeRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    // var VarName ...
    const varSingleRegex = /^var\s+([A-Z][a-zA-Z0-9]*)\s/gm;
    while ((match = varSingleRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    // var (\n  ExportedVar = ...\n)
    const varGroupRegex = /^var\s*\(([^)]*)\)/gm;
    while ((match = varGroupRegex.exec(stripped)) !== null) {
      const block = match[1];
      const varLineRegex = /^\s+([A-Z][a-zA-Z0-9]*)\s/gm;
      let varMatch;
      while ((varMatch = varLineRegex.exec(block)) !== null) {
        exports.push({ name: varMatch[1], source: filePath, isDefault: false });
      }
    }

    // const ConstName ...
    const constSingleRegex = /^const\s+([A-Z][a-zA-Z0-9]*)\s/gm;
    while ((match = constSingleRegex.exec(stripped)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    // const (\n  ExportedConst = ...\n)
    const constGroupRegex = /^const\s*\(([^)]*)\)/gm;
    while ((match = constGroupRegex.exec(stripped)) !== null) {
      const block = match[1];
      const constLineRegex = /^\s+([A-Z][a-zA-Z0-9]*)\s/gm;
      let constMatch;
      while ((constMatch = constLineRegex.exec(block)) !== null) {
        exports.push({ name: constMatch[1], source: filePath, isDefault: false });
      }
    }

    return exports;
  }

  isBuiltInOrKeyword(name: string): boolean {
    return GO_KEYWORDS.has(name) || GO_BUILTIN_FUNCTIONS.has(name) ||
           GO_BUILTIN_TYPES.has(name) || GO_STD_PACKAGES.has(name);
  }

  generateImportStatement(_identifier: string, source: string, _isDefault: boolean): string {
    const pkgPath = this.filePathToPackage(source);
    return `import "${pkgPath}"`;
  }

  getImportInsertPosition(content: string, _filePath: string): number {
    const lines = content.split('\n');
    let lastImportLine = -1;
    let afterPackage = 0;
    let inImportBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (trimmed.startsWith('//') || trimmed.startsWith('/*') ||
          trimmed.startsWith('*') || trimmed === '') {
        continue;
      }

      if (trimmed.startsWith('package ')) {
        afterPackage = i + 1;
        continue;
      }

      if (trimmed === 'import (' || trimmed.startsWith('import (')) {
        inImportBlock = true;
        continue;
      }

      if (inImportBlock) {
        if (trimmed === ')') {
          inImportBlock = false;
          lastImportLine = i;
        }
        continue;
      }

      if (trimmed.startsWith('import ')) {
        lastImportLine = i;
        continue;
      }

      if (trimmed.length > 0 && lastImportLine === -1) {
        break;
      }
    }

    return lastImportLine >= 0 ? lastImportLine + 1 : afterPackage;
  }

  insertImports(content: string, imports: string[], _filePath: string): string {
    const lines = content.split('\n');
    const insertIndex = this.getImportInsertPosition(content, _filePath);

    const prevLine = insertIndex > 0 ? lines[insertIndex - 1]?.trim() ?? '' : '';
    const prevIsImportRelated = prevLine === '' ||
      prevLine.startsWith('import') || prevLine === ')';
    const needsBlankLine = insertIndex > 0 && prevLine !== '' && !prevIsImportRelated;

    if (needsBlankLine) {
      lines.splice(insertIndex, 0, '', ...imports);
    } else {
      lines.splice(insertIndex, 0, ...imports);
    }

    return lines.join('\n');
  }

  private packageName(importPath: string): string {
    const parts = importPath.split('/');
    return parts[parts.length - 1];
  }

  private filePathToPackage(filePath: string): string {
    let pkgPath = filePath.replace(/\.go$/, '');
    pkgPath = pkgPath.replace(/\\/g, '/');

    if (!pkgPath.startsWith('/') && !pkgPath.startsWith('.')) {
      return pkgPath;
    }

    const parts = pkgPath.split('/');
    const srcIdx = parts.indexOf('src');
    if (srcIdx >= 0) {
      return parts.slice(srcIdx + 1).join('/');
    }

    if (parts.length >= 2) {
      return parts.slice(-2).join('/');
    }

    return parts[parts.length - 1];
  }

  private stripComments(content: string): string {
    return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  }
}

const GO_KEYWORDS = new Set([
  'break', 'case', 'chan', 'const', 'continue', 'default', 'defer',
  'else', 'fallthrough', 'for', 'func', 'go', 'goto', 'if',
  'import', 'interface', 'map', 'package', 'range', 'return',
  'select', 'struct', 'switch', 'type', 'var',
]);

const GO_BUILTIN_FUNCTIONS = new Set([
  'append', 'cap', 'clear', 'close', 'complex', 'copy', 'delete',
  'imag', 'len', 'make', 'max', 'min', 'new', 'panic', 'print',
  'println', 'real', 'recover',
]);

const GO_BUILTIN_TYPES = new Set([
  'bool', 'byte', 'comparable', 'complex64', 'complex128',
  'error', 'float32', 'float64',
  'int', 'int8', 'int16', 'int32', 'int64',
  'rune', 'string',
  'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'uintptr',
  'any',
]);

const GO_TYPE_KEYWORDS = new Set([
  'String', 'Error', 'Reader', 'Writer', 'Stringer',
]);

const GO_STD_PACKAGES = new Set([
  'fmt', 'os', 'io', 'log', 'net', 'http', 'strings', 'strconv',
  'errors', 'context', 'sync', 'time', 'math', 'sort', 'bytes',
  'bufio', 'regexp', 'path', 'filepath', 'encoding', 'json', 'xml',
  'csv', 'html', 'template', 'reflect', 'runtime', 'testing',
  'flag', 'crypto', 'hash', 'sql', 'database', 'embed', 'syscall',
  'unsafe', 'atomic', 'binary', 'unicode', 'utf8', 'utf16',
  'ioutil', 'exec', 'signal', 'rand', 'big', 'bits',
]);
