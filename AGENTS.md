# PROJECT KNOWLEDGE BASE

**Updated:** 2026-02-09 · **Branch:** main

## OVERVIEW

Multi-language CLI tool that scans projects for missing imports and auto-inserts them. Regex-based parsing (no heavy AST deps). Plugin architecture supports JS/TS (with Vue/Svelte/Astro), Python, and future languages. Reads tsconfig.json path aliases for smart import paths. Pipeline: scan → parse → resolve → fix.

## STRUCTURE

```
auto-import-cli/
├── bin/import-pilot.js          # CLI entry (shebang → dist/cli/autoImportCli.js)
├── src/
│   ├── index.ts                 # Barrel exports (public API for npm consumers)
│   ├── cli/autoImportCli.ts     # Orchestrator — coordinates full pipeline via plugins
│   ├── scanner/fileScanner.ts   # Glob-based file discovery + content reading
│   ├── parser/
│   │   ├── astParser.ts         # Regex-based import/identifier detection (JS/TS)
│   │   └── frameworkParser.ts   # Vue/Svelte/Astro script extraction
│   ├── plugins/
│   │   ├── languagePlugin.ts    # LanguagePlugin interface (contract for all languages)
│   │   ├── index.ts             # Plugin registry — getPluginForExtension(), defaults
│   │   ├── jsTsPlugin.ts        # JS/TS plugin (wraps AstParser + FrameworkParser)
│   │   └── pythonPlugin.ts      # Python plugin (from/import, def/class exports)
│   └── resolver/importResolver.ts  # Export cache + import path resolution + alias support
├── src/__tests__/               # Unit tests (Jest + ts-jest) — 101 tests
├── tests/                       # Integration fixtures & sample projects
│   ├── sample-project/          # TSX component fixtures
│   ├── framework-samples/       # Vue/Svelte/Astro test files
│   ├── function-support/        # Function call detection fixtures
│   └── python-samples/          # Python test files
└── .import-pilot.json           # Dogfooding — project uses its own tool
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new CLI flag | `src/cli/autoImportCli.ts` | Commander.js `.option()` chain in `createCli()` |
| Add new language | `src/plugins/` | Implement `LanguagePlugin` interface, register in `index.ts` |
| Add framework support | `src/plugins/jsTsPlugin.ts` | Extend `extractScript()` + FrameworkParser |
| Fix false positive (JS/TS) | `src/plugins/jsTsPlugin.ts` | Check `JSTS_BUILTINS`, `JSTS_KEYWORDS` sets |
| Fix false positive (Python) | `src/plugins/pythonPlugin.ts` | Check `PYTHON_BUILTINS`, `PYTHON_KEYWORDS` |
| Fix import resolution | `src/resolver/importResolver.ts` | Check `parseExportsLegacy()` or plugin `parseExports()` |
| Fix alias resolution | `src/resolver/importResolver.ts` | Check `loadPathAliases()`, `getAliasImportPath()` |
| Add test | `src/__tests__/*.test.ts` | One test file per module |
| Add test fixture | `tests/` | Subdirs by category |
| CI/CD | `.github/workflows/ci.yml` | Node 18/20/22 matrix |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `LanguagePlugin` | interface | plugins/languagePlugin.ts | Contract all language plugins implement |
| `JsTsPlugin` | class | plugins/jsTsPlugin.ts | JS/TS/Vue/Svelte/Astro language support |
| `PythonPlugin` | class | plugins/pythonPlugin.ts | Python language support |
| `getPluginForExtension()` | function | plugins/index.ts | Registry — maps file extension to plugin |
| `AutoImportCli` | class | cli/autoImportCli.ts | **Orchestrator** — runs full pipeline via plugins |
| `createCli()` | function | cli/autoImportCli.ts | Factory — builds Commander program |
| `FileScanner` | class | scanner/fileScanner.ts | Glob discovery + file reading |
| `AstParser` | class | parser/astParser.ts | Legacy regex parser (used internally by JsTsPlugin) |
| `FrameworkParser` | class | parser/frameworkParser.ts | Vue/Svelte/Astro script extraction |
| `ImportResolver` | class | resolver/importResolver.ts | Export cache + resolution + alias support |
| `PathAlias` | interface | resolver/importResolver.ts | Alias mapping from tsconfig.json paths |

### Execution Flow

```
bin/import-pilot.js
  → createCli() → Commander parses argv
    → AutoImportCli.run(directory, options)
      1. ImportResolver.buildExportCache()  — scan all files, cache exports (uses plugins)
         └── loadPathAliases()             — read tsconfig.json paths
      2. FileScanner.scan()                 — find target files
      3. For each file:
         a. getPluginForExtension(ext)      — select language plugin
         b. plugin.parseImports()           — find existing imports
         c. plugin.findUsedIdentifiers()    — find used identifiers
         d. ImportResolver.resolveImport()  — match to cached exports (prefer alias paths)
         e. plugin.generateImportStatement() — format import string
      4. plugin.insertImports() or dry-run summary
```

## CONVENTIONS

- **ESM throughout** — `"type": "module"`, NodeNext module resolution
- **Path aliases** — `@/*` → `src/*` (tsconfig paths + `tsc-alias` post-compile)
- **Strict TypeScript** — `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`
- **Regex-based parsing** — intentional: speed + zero AST deps over full accuracy
- **Plugin architecture** — each language implements `LanguagePlugin` interface
- **Chalk semantic colors** — blue=info, green=success, yellow=warn, red=error, gray=neutral
- **Console logging only** — no logger library; verbose gated by `options.verbose`
- **Interfaces co-located** — exported interfaces live in same file as their class
- **No linter/formatter** — no ESLint, no Prettier, no pre-commit hooks

## ANTI-PATTERNS (THIS PROJECT)

- **DO NOT** use full AST libraries (Babel, TS compiler API) — regex approach is intentional
- **DO NOT** add `console.log` without chalk coloring — all output is styled
- **DO NOT** mix framework parsing with AST parsing — FrameworkParser extracts script, AstParser parses it
- **DO NOT** store absolute paths in import statements — `getRelativeImportPath()` normalizes
- **DO NOT** test private methods without `(instance as any)` — existing convention
- **DO NOT** add language-specific logic to CLI — put it in the language plugin

## COMMANDS

```bash
npm run build          # tsc && tsc-alias → dist/
npm run dev            # tsc --watch
npm test               # jest (101 tests)
npm run test:watch     # jest --watch
npm run test:coverage  # jest --coverage
node bin/import-pilot.js [dir] [--dry-run] [--verbose] [--extensions .ts,.tsx,.py]
node bin/import-pilot.js [dir] [--no-alias]  # disable tsconfig alias resolution
```

## NOTES

- `--config` CLI flag exists but config file loading is **not implemented**
- `--no-alias` disables tsconfig.json path alias resolution
- ImportResolver delegates to plugins for `parseExports()`, falls back to legacy regex
- Python ignore patterns: `__pycache__`, `.venv`, `venv`
- No persistence — export cache rebuilt every run
