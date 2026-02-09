# auto-import-cli

<div align="center">

**Stop adding imports by hand. Let the CLI do it.**

[![CI](https://github.com/YosefHayim/auto-import-cli/workflows/CI%20-%20Test%20&%20Build/badge.svg)](https://github.com/YosefHayim/auto-import-cli/actions)
[![npm](https://img.shields.io/npm/v/auto-import-cli.svg?style=flat-square)](https://www.npmjs.com/package/auto-import-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

</div>

---

## The Problem

You write `<Card>` or `formatName()` in your code, but the import is missing. Your editor might catch it — or it might not. In large codebases with hundreds of components, this becomes a constant friction point.

**auto-import-cli** scans your project, finds every missing import, resolves where it lives, and inserts the correct `import` statement. It works across frameworks (React, Vue, Angular, Svelte, Astro) and languages (TypeScript, JavaScript, Python), respects your `tsconfig.json` path aliases, and runs in under a second.

---

## Install

Pick your package manager:

```bash
# npm
npm install -g auto-import-cli

# yarn
yarn global add auto-import-cli

# pnpm
pnpm add -g auto-import-cli

# bun
bun add -g auto-import-cli
```

Or install locally as a dev dependency:

```bash
npm install --save-dev auto-import-cli
```

**Requires Node.js >= 18**

---

## Quick Start

```bash
# Fix missing imports in current directory
auto-import

# Preview what would change (no file modifications)
auto-import --dry-run

# Scan a specific directory with verbose output
auto-import ./src --verbose
```

### Interactive Setup

Run the setup wizard to configure auto-import for your project. It detects your file types, creates a `.auto-import.json` config, adds npm scripts, and optionally sets up husky pre-commit hooks — all interactively.

```bash
auto-import init
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

## CLI Options

```
auto-import [directory] [options]
```

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--dry-run` | `-d` | Preview changes without writing files | `false` |
| `--verbose` | `-v` | Detailed output | `false` |
| `--extensions` | `-e` | File extensions to scan (comma-separated) | `.ts,.tsx,.js,.jsx,.vue,.svelte,.astro,.py` |
| `--ignore` | `-i` | Glob patterns to ignore (comma-separated) | — |
| `--config` | `-c` | Path to config file | `.auto-import.json` |
| `--no-alias` | — | Disable tsconfig path alias resolution | `false` |

### Subcommands

| Command | Description |
|---------|-------------|
| `auto-import init` | Interactive setup wizard |

---

## Configuration

Create `.auto-import.json` in your project root (or run `auto-import init`):

```json
{
  "extensions": [".ts", ".tsx", ".vue", ".py"],
  "ignore": ["**/node_modules/**", "**/dist/**", "**/*.test.ts"],
  "useAliases": true,
  "verbose": false,
  "dryRun": false
}
```

CLI flags override config file values.

---

## Integration

### npm scripts

```json
{
  "scripts": {
    "auto-import": "auto-import",
    "auto-import:check": "auto-import --dry-run --verbose",
    "auto-import:fix": "auto-import"
  }
}
```

### Pre-commit hook (husky)

```bash
npx husky add .husky/pre-commit "npx auto-import --dry-run"
```

Or let `auto-import init` set this up for you.

### CI

```yaml
- name: Check imports
  run: npx auto-import --dry-run --verbose
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
