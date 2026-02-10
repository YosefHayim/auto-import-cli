# import-pilot

<div align="center">

**Stop adding imports by hand. Let the CLI do it.**

[![CI](https://github.com/YosefHayim/auto-import-cli/workflows/CI%20-%20Test%20&%20Build/badge.svg)](https://github.com/YosefHayim/auto-import-cli/actions)
[![npm](https://img.shields.io/npm/v/import-pilot.svg?style=flat-square)](https://www.npmjs.com/package/import-pilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

</div>

---

## The Problem

You write `<Card>` or `formatName()` in your code, but the import is missing. Your editor might catch it — or it might not. In large codebases with hundreds of components, this becomes a constant friction point.

**import-pilot** scans your project, finds every missing import, resolves where it lives, and inserts the correct `import` statement. It works across frameworks (React, Vue, Angular, Svelte, Astro) and languages (TypeScript, JavaScript, Python), respects your `tsconfig.json` path aliases, and runs in under a second.

---

## Install

Pick your package manager:

```bash
# npm
npm install -g import-pilot

# yarn
yarn global add import-pilot

# pnpm
pnpm add -g import-pilot

# bun
bun add -g import-pilot
```

Or install locally as a dev dependency:

```bash
npm install --save-dev import-pilot
```

**Requires Node.js >= 18**

---

## Quick Start

```bash
# Fix missing imports in current directory
import-pilot

# Preview what would change (no file modifications)
import-pilot --dry-run

# Scan a specific directory with verbose output
import-pilot ./src --verbose
```

### Interactive Setup

Run the setup wizard to configure import-pilot for your project. It detects your file types, creates a `.import-pilot.json` config, adds npm scripts, and optionally sets up husky pre-commit hooks — all interactively.

```bash
import-pilot init
```

---

## How It Works

```
scan files → find used identifiers → check what's imported → resolve the rest → insert imports
```

1. **Scan** — Discovers all files matching your configured extensions
2. **Parse** — Extracts existing imports and used identifiers (regex-based, no heavy AST deps)
3. **Resolve** — Matches unimported identifiers against an export cache built from your project
4. **Fix** — Generates and inserts the correct import statements

Path aliases from `tsconfig.json` (e.g. `@/components/Card`) are used automatically when available. Disable with `--no-alias`.

---

## Supported Languages & Frameworks

| Language | Extensions | Frameworks |
|----------|-----------|------------|
| TypeScript / JavaScript | `.ts` `.tsx` `.js` `.jsx` | React, Angular, Next.js, Nuxt |
| Vue | `.vue` | Vue 2 & 3 (SFC `<script>` / `<script setup>`) |
| Svelte | `.svelte` | SvelteKit |
| Astro | `.astro` | Astro frontmatter |
| Python | `.py` | `from`/`import` statements, `def`/`class` exports |

More languages coming — see [open issues](https://github.com/YosefHayim/auto-import-cli/issues) for Elixir, Go, Rust, and others.

---

## Reports

After each run, import-pilot can generate a report file at your project root. Configure via `.import-pilot.json` or the setup wizard.

| Format | Flag | Output file |
|--------|------|-------------|
| Markdown | `--report md` | `import-pilot-report.md` |
| JSON | `--report json` | `import-pilot-report.json` |
| Text | `--report txt` | `import-pilot-report.txt` |
| Off | `--report none` | *(no file)* |

Reports include: time taken, files scanned, files changed, each import added (before → after), and any unresolved identifiers.

---

## CLI Options

```
import-pilot [directory] [options]
```

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--dry-run` | `-d` | Preview changes without writing files | `false` |
| `--verbose` | `-v` | Detailed output | `false` |
| `--extensions` | `-e` | File extensions to scan (comma-separated) | `.ts,.tsx,.js,.jsx,.vue,.svelte,.astro,.py` |
| `--ignore` | `-i` | Glob patterns to ignore (comma-separated) | — |
| `--config` | `-c` | Path to config file | `.import-pilot.json` |
| `--no-alias` | — | Disable tsconfig path alias resolution | `false` |
| `--report` | `-r` | Report format: `md`, `json`, `txt`, or `none` | `none` |

### Subcommands

| Command | Description |
|---------|-------------|
| `import-pilot init` | Interactive setup wizard |

---

## Configuration

Create `.import-pilot.json` in your project root (or run `import-pilot init`):

```json
{
  "extensions": [".ts", ".tsx", ".vue", ".py"],
  "ignore": ["**/node_modules/**", "**/dist/**", "**/*.test.ts"],
  "useAliases": true,
  "verbose": false,
  "dryRun": false,
  "report": "md"
}
```

CLI flags override config file values.

---

## Integration

### npm scripts

```json
{
  "scripts": {
    "import-pilot": "import-pilot",
    "import-pilot:check": "import-pilot --dry-run --verbose",
    "import-pilot:fix": "import-pilot"
  }
}
```

### Pre-commit hook (husky)

```bash
npx husky add .husky/pre-commit "npx import-pilot --dry-run"
```

Or let `import-pilot init` set this up for you.

### CI

```yaml
- name: Check imports
  run: npx import-pilot --dry-run --verbose
```

---

## Contributing

```bash
git clone https://github.com/YosefHayim/auto-import-cli.git
cd auto-import-cli
npm install
npm run build
npm test
```

See [open issues](https://github.com/YosefHayim/auto-import-cli/issues) for planned features and language support.

---

## License

MIT

---

<div align="center">

Built by [**Yosef Hayim Sabag**](https://github.com/YosefHayim)

[Bug Reports](https://github.com/YosefHayim/auto-import-cli/issues) · [Buy Me a Coffee](https://buymeacoffee.com/yosefhayim)

</div>
