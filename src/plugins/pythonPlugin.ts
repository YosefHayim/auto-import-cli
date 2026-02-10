import type { LanguagePlugin } from './languagePlugin.js';
import type { ImportStatement, UsedIdentifier } from '@/parser/astParser.js';
import type { ExportInfo } from '@/resolver/importResolver.js';

export class PythonPlugin implements LanguagePlugin {
  readonly name = 'python';
  readonly extensions = ['.py'];

  parseImports(content: string, _filePath: string): ImportStatement[] {
    const imports: ImportStatement[] = [];
    let match;

    const normalized = content.replace(/from\s+([\w.]+)\s+import\s*\(([^)]*)\)/gs, (_m, mod: string, names: string) => {
      const joined = names.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      return `from ${mod} import ${joined}`;
    });

    const fromImportRegex = /^from\s+([\w.]+)\s+import\s+(.+)$/gm;
    while ((match = fromImportRegex.exec(normalized)) !== null) {
      const names = match[2]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s !== '\\');
      imports.push({ source: match[1], imports: names, isDefault: false });
    }

    const importRegex = /^import\s+([\w.]+)(?:\s+as\s+(\w+))?$/gm;
    while ((match = importRegex.exec(normalized)) !== null) {
      const name = match[2] || match[1].split('.').pop()!;
      imports.push({ source: match[1], imports: [name], isDefault: true });
    }

    return imports;
  }

  findUsedIdentifiers(content: string, _filePath: string): UsedIdentifier[] {
    const identifiers: UsedIdentifier[] = [];
    const stripped = content.replace(/"""[\s\S]*?"""/g, '').replace(/'''[\s\S]*?'''/g, '');
    const lines = stripped.split('\n');

    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      if (
        trimmed.startsWith('#') ||
        trimmed.startsWith('import ') ||
        trimmed.startsWith('from ') ||
        trimmed === '' ||
        trimmed.startsWith('class ') ||
        trimmed.startsWith('def ')
      ) {
        return;
      }

      // PascalCase class usage: MyClass(...)
      const classCallRegex = /(?<![.\w])([A-Z][a-zA-Z0-9_]*)\s*\(/g;
      let match;
      while ((match = classCallRegex.exec(line)) !== null) {
        if (!this.isBuiltInOrKeyword(match[1])) {
          identifiers.push({ name: match[1], line: lineIndex + 1, column: match.index });
        }
      }

      // snake_case function calls: my_func(...)
      const funcCallRegex = /(?<![.\w])([a-z_][a-z0-9_]*)\s*\(/g;
      while ((match = funcCallRegex.exec(line)) !== null) {
        const name = match[1];
        if (!this.isBuiltInOrKeyword(name) && !PYTHON_COMMON_METHODS.has(name)) {
          identifiers.push({ name, line: lineIndex + 1, column: match.index });
        }
      }

      // Type annotations: variable: TypeName
      const typeAnnotationRegex = /:\s*([A-Z][a-zA-Z0-9_]*)\b/g;
      while ((match = typeAnnotationRegex.exec(line)) !== null) {
        if (!this.isBuiltInOrKeyword(match[1])) {
          identifiers.push({ name: match[1], line: lineIndex + 1, column: match.index });
        }
      }
    });

    return identifiers;
  }

  parseExports(content: string, filePath: string): ExportInfo[] {
    const allNames = this.parseDunderAll(content);
    const exports: ExportInfo[] = [];
    let match;

    // Top-level def (not indented)
    const defRegex = /^def\s+(\w+)\s*\(/gm;
    while ((match = defRegex.exec(content)) !== null) {
      if (!match[1].startsWith('_')) {
        exports.push({ name: match[1], source: filePath, isDefault: false });
      }
    }

    // Top-level class (not indented)
    const classRegex = /^class\s+(\w+)[\s:(]/gm;
    while ((match = classRegex.exec(content)) !== null) {
      if (!match[1].startsWith('_')) {
        exports.push({ name: match[1], source: filePath, isDefault: false });
      }
    }

    // Top-level CONSTANT_ASSIGNMENT
    const constRegex = /^([A-Z][A-Z_0-9]+)\s*=/gm;
    while ((match = constRegex.exec(content)) !== null) {
      exports.push({ name: match[1], source: filePath, isDefault: false });
    }

    if (allNames) {
      return exports.filter(e => allNames.has(e.name));
    }

    return exports;
  }

  private parseDunderAll(content: string): Set<string> | null {
    // Match __all__ = [...] or __all__ = (...) including multi-line
    const allRegex = /^__all__\s*=\s*[\[(]([\s\S]*?)[\])]/m;
    const match = allRegex.exec(content);
    if (!match) {
      return null;
    }

    const names = new Set<string>();
    // Extract quoted strings (single or double quotes)
    const nameRegex = /["'](\w+)["']/g;
    let nameMatch;
    while ((nameMatch = nameRegex.exec(match[1])) !== null) {
      names.add(nameMatch[1]);
    }

    return names;
  }

  isBuiltInOrKeyword(name: string): boolean {
    return PYTHON_BUILTINS.has(name) || PYTHON_KEYWORDS.has(name);
  }

  generateImportStatement(identifier: string, source: string, _isDefault: boolean): string {
    const moduleName = this.filePathToModule(source);
    return `from ${moduleName} import ${identifier}`;
  }

  getImportInsertPosition(content: string, _filePath: string): number {
    const lines = content.split('\n');
    let lastImportLine = -1;
    let afterDocstring = 0;
    let inDocstring = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
        const quotes = trimmed.startsWith('"""') ? '"""' : "'''";
        if (inDocstring) {
          inDocstring = false;
          afterDocstring = i + 1;
          continue;
        }
        const rest = trimmed.slice(3);
        if (!rest.includes(quotes)) {
          inDocstring = true;
          continue;
        }
        afterDocstring = i + 1;
        continue;
      }

      if (inDocstring) continue;

      if (trimmed.startsWith('#') || trimmed === '') {
        if (lastImportLine === -1) afterDocstring = i + 1;
        continue;
      }

      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        lastImportLine = i;
      } else if (trimmed.length > 0 && lastImportLine === -1) {
        break;
      }
    }

    return lastImportLine >= 0 ? lastImportLine + 1 : afterDocstring;
  }

  insertImports(content: string, imports: string[], _filePath: string): string {
    const lines = content.split('\n');
    const insertIndex = this.getImportInsertPosition(content, _filePath);
    lines.splice(insertIndex, 0, ...imports);
    return lines.join('\n');
  }

  private filePathToModule(filePath: string): string {
    let modulePath = filePath.replace(/\.py$/, '');
    modulePath = modulePath.replace(/\\/g, '/');

    const parts = modulePath.split('/');
    const srcIdx = parts.indexOf('src');
    const libIdx = parts.indexOf('lib');
    const startIdx = srcIdx >= 0 ? srcIdx + 1 : libIdx >= 0 ? libIdx + 1 : -1;

    if (startIdx > 0) {
      const result = parts.slice(startIdx);
      if (result[result.length - 1] === '__init__') result.pop();
      return result.join('.');
    }

    const initIdx = parts.lastIndexOf('__init__');
    if (initIdx >= 0) {
      return parts.slice(0, initIdx).join('.');
    }

    const fileName = parts[parts.length - 1];
    const dirName = parts.length >= 2 ? parts[parts.length - 2] : '';
    return dirName ? `${dirName}.${fileName}` : fileName;
  }
}

const PYTHON_BUILTINS = new Set([
  'int',
  'float',
  'str',
  'bool',
  'list',
  'dict',
  'set',
  'tuple',
  'bytes',
  'bytearray',
  'memoryview',
  'range',
  'slice',
  'frozenset',
  'complex',
  'type',
  'object',
  'None',
  'True',
  'False',
  'Ellipsis',
  'NotImplemented',
  'Exception',
  'BaseException',
  'ValueError',
  'TypeError',
  'KeyError',
  'IndexError',
  'AttributeError',
  'ImportError',
  'FileNotFoundError',
  'RuntimeError',
  'StopIteration',
  'OSError',
  'IOError',
  'NameError',
  'ZeroDivisionError',
  'OverflowError',
  'AssertionError',
]);

const PYTHON_KEYWORDS = new Set([
  'print',
  'len',
  'range',
  'enumerate',
  'zip',
  'map',
  'filter',
  'sorted',
  'reversed',
  'any',
  'all',
  'min',
  'max',
  'sum',
  'abs',
  'round',
  'isinstance',
  'issubclass',
  'hasattr',
  'getattr',
  'setattr',
  'delattr',
  'super',
  'property',
  'staticmethod',
  'classmethod',
  'id',
  'hash',
  'repr',
  'iter',
  'next',
  'open',
  'input',
  'vars',
  'dir',
  'globals',
  'locals',
  'eval',
  'exec',
  'compile',
  'format',
  'chr',
  'ord',
  'hex',
  'oct',
  'bin',
]);

const PYTHON_COMMON_METHODS = new Set([
  'self',
  'cls',
  'if',
  'else',
  'elif',
  'for',
  'while',
  'return',
  'yield',
  'with',
  'as',
  'try',
  'except',
  'finally',
  'raise',
  'assert',
  'pass',
  'break',
  'continue',
  'del',
  'in',
  'not',
  'and',
  'or',
  'is',
  'lambda',
  'global',
  'nonlocal',
  'async',
  'await',
]);
