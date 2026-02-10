const NODE_BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster',
  'console', 'constants', 'crypto', 'dgram', 'diagnostics_channel',
  'dns', 'domain', 'events', 'fs', 'http', 'http2', 'https',
  'inspector', 'module', 'net', 'os', 'path', 'perf_hooks',
  'process', 'punycode', 'querystring', 'readline', 'repl',
  'stream', 'string_decoder', 'sys', 'timers', 'tls', 'trace_events',
  'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib',
]);

const PYTHON_STDLIB = new Set([
  'abc', 'aifc', 'argparse', 'array', 'ast', 'asynchat', 'asyncio',
  'asyncore', 'atexit', 'base64', 'bdb', 'binascii', 'binhex',
  'bisect', 'builtins', 'bz2', 'calendar', 'cgi', 'cgitb', 'chunk',
  'cmath', 'cmd', 'code', 'codecs', 'codeop', 'collections',
  'colorsys', 'compileall', 'concurrent', 'configparser', 'contextlib',
  'contextvars', 'copy', 'copyreg', 'cProfile', 'crypt', 'csv',
  'ctypes', 'curses', 'dataclasses', 'datetime', 'dbm', 'decimal',
  'difflib', 'dis', 'distutils', 'doctest', 'email', 'encodings',
  'enum', 'errno', 'faulthandler', 'fcntl', 'filecmp', 'fileinput',
  'fnmatch', 'fractions', 'ftplib', 'functools', 'gc', 'getopt',
  'getpass', 'gettext', 'glob', 'grp', 'gzip', 'hashlib', 'heapq',
  'hmac', 'html', 'http', 'idlelib', 'imaplib', 'imghdr', 'imp',
  'importlib', 'inspect', 'io', 'ipaddress', 'itertools', 'json',
  'keyword', 'lib2to3', 'linecache', 'locale', 'logging', 'lzma',
  'mailbox', 'mailcap', 'marshal', 'math', 'mimetypes', 'mmap',
  'modulefinder', 'multiprocessing', 'netrc', 'nis', 'nntplib',
  'numbers', 'operator', 'optparse', 'os', 'ossaudiodev',
  'pathlib', 'pdb', 'pickle', 'pickletools', 'pipes', 'pkgutil',
  'platform', 'plistlib', 'poplib', 'posix', 'posixpath', 'pprint',
  'profile', 'pstats', 'pty', 'pwd', 'py_compile', 'pyclbr',
  'pydoc', 'queue', 'quopri', 'random', 're', 'readline', 'reprlib',
  'resource', 'rlcompleter', 'runpy', 'sched', 'secrets', 'select',
  'selectors', 'shelve', 'shlex', 'shutil', 'signal', 'site',
  'smtpd', 'smtplib', 'sndhdr', 'socket', 'socketserver', 'sqlite3',
  'ssl', 'stat', 'statistics', 'string', 'stringprep', 'struct',
  'subprocess', 'sunau', 'symtable', 'sys', 'sysconfig', 'syslog',
  'tabnanny', 'tarfile', 'telnetlib', 'tempfile', 'termios', 'test',
  'textwrap', 'threading', 'time', 'timeit', 'tkinter', 'token',
  'tokenize', 'tomllib', 'trace', 'traceback', 'tracemalloc',
  'tty', 'turtle', 'turtledemo', 'types', 'typing', 'unicodedata',
  'unittest', 'urllib', 'uu', 'uuid', 'venv', 'warnings', 'wave',
  'weakref', 'webbrowser', 'winreg', 'winsound', 'wsgiref',
  'xdrlib', 'xml', 'xmlrpc', 'zipapp', 'zipfile', 'zipimport', 'zlib',
]);

export type ImportGroup = 'builtin' | 'external' | 'alias' | 'relative';
export type PythonImportGroup = 'stdlib' | 'thirdparty' | 'local';

export function classifyJsTsImport(importStatement: string): ImportGroup {
  const sourceMatch = importStatement.match(/from\s+['"]([^'"]+)['"]/);
  if (!sourceMatch) {
    const sideEffectMatch = importStatement.match(/import\s+['"]([^'"]+)['"]/);
    if (sideEffectMatch) {
      return classifyJsTsSource(sideEffectMatch[1]);
    }
    return 'external';
  }
  return classifyJsTsSource(sourceMatch[1]);
}

function classifyJsTsSource(source: string): ImportGroup {
  if (source.startsWith('node:')) {
    return 'builtin';
  }

  const topLevel = source.split('/')[0];
  if (NODE_BUILTINS.has(topLevel)) {
    return 'builtin';
  }

  if (source.startsWith('@/') || source.startsWith('~/') || source.startsWith('#')) {
    return 'alias';
  }

  if (source.startsWith('./') || source.startsWith('../') || source === '.') {
    return 'relative';
  }

  return 'external';
}

export function classifyPythonImport(importStatement: string): PythonImportGroup {
  const fromMatch = importStatement.match(/^\s*from\s+(\S+)\s+import/);
  const importMatch = importStatement.match(/^\s*import\s+(\S+)/);
  const moduleName = fromMatch ? fromMatch[1] : importMatch ? importMatch[1] : '';

  if (!moduleName) {
    return 'thirdparty';
  }

  if (moduleName.startsWith('.')) {
    return 'local';
  }

  const topLevel = moduleName.split('.')[0];
  if (PYTHON_STDLIB.has(topLevel)) {
    return 'stdlib';
  }

  return 'thirdparty';
}

export function sortImports(imports: string[], language: string): string[] {
  if (imports.length === 0) {
    return [];
  }

  const isPython = language === 'python';

  if (isPython) {
    return sortPythonImports(imports);
  }
  return sortJsTsImports(imports);
}

function sortJsTsImports(imports: string[]): string[] {
  const groups: Record<ImportGroup, string[]> = {
    builtin: [],
    external: [],
    alias: [],
    relative: [],
  };

  for (const imp of imports) {
    const group = classifyJsTsImport(imp);
    groups[group].push(imp);
  }

  const sortBySource = (a: string, b: string): number => {
    const sourceA = extractSource(a).toLowerCase();
    const sourceB = extractSource(b).toLowerCase();
    return sourceA.localeCompare(sourceB);
  };

  for (const key of Object.keys(groups) as ImportGroup[]) {
    groups[key].sort(sortBySource);
  }

  return assembleGroups([groups.builtin, groups.external, groups.alias, groups.relative]);
}

function sortPythonImports(imports: string[]): string[] {
  const groups: Record<PythonImportGroup, string[]> = {
    stdlib: [],
    thirdparty: [],
    local: [],
  };

  for (const imp of imports) {
    const group = classifyPythonImport(imp);
    groups[group].push(imp);
  }

  const sortAlpha = (a: string, b: string): number => a.localeCompare(b);

  for (const key of Object.keys(groups) as PythonImportGroup[]) {
    groups[key].sort(sortAlpha);
  }

  return assembleGroups([groups.stdlib, groups.thirdparty, groups.local]);
}

function assembleGroups(groups: string[][]): string[] {
  const result: string[] = [];
  let addedGroup = false;

  for (const group of groups) {
    if (group.length === 0) continue;

    if (addedGroup) {
      result.push('');
    }
    result.push(...group);
    addedGroup = true;
  }

  return result;
}

function extractSource(importStatement: string): string {
  const jsMatch = importStatement.match(/from\s+['"]([^'"]+)['"]/);
  if (jsMatch) return jsMatch[1];

  const sideEffectMatch = importStatement.match(/import\s+['"]([^'"]+)['"]/);
  if (sideEffectMatch) return sideEffectMatch[1];

  const pyFromMatch = importStatement.match(/^\s*from\s+(\S+)\s+import/);
  if (pyFromMatch) return pyFromMatch[1];

  const pyImportMatch = importStatement.match(/^\s*import\s+(\S+)/);
  if (pyImportMatch) return pyImportMatch[1];

  return importStatement;
}

export function groupImportStatements(
  existingContent: string,
  newImports: string[],
  language: string
): string[] {
  const isPython = language === 'python';
  const existingImports = extractExistingImports(existingContent, isPython);

  const seen = new Set<string>();
  const allImports: string[] = [];

  for (const imp of [...existingImports, ...newImports]) {
    const normalized = imp.trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      allImports.push(normalized);
    }
  }

  return sortImports(allImports, language);
}

function extractExistingImports(content: string, isPython: boolean): string[] {
  const lines = content.split('\n');
  const imports: string[] = [];

  if (isPython) {
    let inMultiLine = false;
    let currentImport = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (inMultiLine) {
        currentImport += ' ' + trimmed;
        if (trimmed.includes(')')) {
          imports.push(currentImport.replace(/\s+/g, ' ').trim());
          inMultiLine = false;
          currentImport = '';
        }
        continue;
      }
      if ((trimmed.startsWith('from ') || trimmed.startsWith('import ')) && trimmed.includes('(') && !trimmed.includes(')')) {
        inMultiLine = true;
        currentImport = trimmed;
        continue;
      }
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        imports.push(trimmed);
      }
    }
  } else {
    let inMultiLineImport = false;
    let currentImport = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (inMultiLineImport) {
        currentImport += ' ' + trimmed;
        if (trimmed.includes('}') || trimmed.match(/from\s+['"]/)) {
          imports.push(currentImport.replace(/\s+/g, ' ').trim());
          inMultiLineImport = false;
          currentImport = '';
        }
        continue;
      }

      if (trimmed.startsWith('import ')) {
        if (trimmed.match(/from\s+['"]/) || trimmed.match(/import\s+['"]/)) {
          imports.push(trimmed);
        } else {
          inMultiLineImport = true;
          currentImport = trimmed;
        }
      }
    }
  }

  return imports;
}
