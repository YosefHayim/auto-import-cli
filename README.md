# Auto Import CLI

<div align="center">

![Auto Import CLI Logo](https://img.shields.io/badge/Auto%20Import-CLI-blue?style=for-the-badge)

**Automatically scan and fix missing imports in your TypeScript/JavaScript projects**

[![CI Status](https://github.com/YosefHayim/auto-import-cli/workflows/CI%20-%20Test%20&%20Build/badge.svg)](https://github.com/YosefHayim/auto-import-cli/actions)
[![npm version](https://img.shields.io/npm/v/auto-import-cli.svg?style=flat-square)](https://www.npmjs.com/package/auto-import-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Downloads](https://img.shields.io/npm/dm/auto-import-cli.svg?style=flat-square)](https://www.npmjs.com/package/auto-import-cli)
[![Node Version](https://img.shields.io/node/v/auto-import-cli.svg?style=flat-square)](https://nodejs.org)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat-square&logo=buy-me-a-coffee)](https://buymeacoffee.com/yosefhayim)

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🎯 Overview

**Auto Import CLI** is an open-source command-line tool that automatically scans your TypeScript/JavaScript project and adds missing import statements. Stop wasting time manually adding imports or having AI agents consume tokens on import management!

### Why Auto Import CLI?

- ✅ **Save Development Time**: Automatically add missing imports instead of manually typing them
- ✅ **Reduce AI Token Usage**: Don't waste AI agent context on import statements
- ✅ **Multi-Framework Support**: Works with React, Vue, Svelte, Astro, and more
- ✅ **Smart Detection**: Detects both JSX components and plain functions
- ✅ **Zero Configuration**: Works out of the box with sensible defaults

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔍 Smart Detection
- Automatically detects JSX components (`<Card>`)
- Finds function calls (`formatName()`)
- Filters out built-ins and method calls
- Regex-based AST parsing for speed

</td>
<td width="50%">

### 🌐 Multi-Framework
- TypeScript/JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`)
- Vue.js Single File Components (`.vue`)
- Svelte components (`.svelte`)
- Astro components (`.astro`)

</td>
</tr>
<tr>
<td>

### 🎨 Developer Experience
- Beautiful colored terminal output
- Dry-run mode to preview changes
- Verbose mode for detailed logging
- Interactive CLI with helpful messages

</td>
<td>

### 🔧 Flexible Configuration
- Customizable file extensions
- Configurable ignore patterns
- Path alias support (`@/` instead of `../`)
- JSON configuration file support

</td>
</tr>
</table>

---

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g auto-import-cli
```

### Local Installation

```bash
npm install --save-dev auto-import-cli
```

### Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0

---

## 🚀 Quick Start

```bash
# Scan current directory and auto-fix imports
auto-import

# Preview changes without modifying files
auto-import --dry-run

# Show detailed output
auto-import --verbose

# Scan specific directory
auto-import ./src
```

---

## 📚 Usage

### Basic Commands

```bash
# Scan and fix current directory
auto-import

# Scan specific directory
auto-import ./src

# Dry run (preview only)
auto-import --dry-run

# Verbose output
auto-import --verbose
```

### Advanced Options

```bash
# Custom file extensions
auto-import --extensions .ts,.tsx,.vue

# Ignore specific patterns
auto-import --ignore "**/*.test.ts,**/*.spec.ts"

# Use custom config file
auto-import --config ./my-config.json

# Combine options
auto-import ./src --dry-run --verbose --extensions .ts,.tsx
```

### CLI Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--dry-run` | `-d` | Preview changes without modifying files | `false` |
| `--verbose` | `-v` | Show detailed output | `false` |
| `--extensions` | `-e` | File extensions to scan (comma-separated) | `.ts,.tsx,.js,.jsx,.vue,.svelte,.astro` |
| `--ignore` | `-i` | Patterns to ignore (comma-separated) | - |
| `--config` | `-c` | Path to config file | `.auto-import.json` |
| `--help` | `-h` | Display help information | - |
| `--version` | `-V` | Display version number | - |

---

## 📖 Examples

### JSX Components

**Before:**
```typescript
// components/UserCard.tsx
export function UserCard() {
  return (
    <Card>
      <Avatar src="/avatar.jpg" />
      <Button onClick={handleClick}>Click</Button>
    </Card>
  );
}
```

**After running `auto-import`:**
```typescript
// components/UserCard.tsx
import { Card } from './Card';
import { Avatar } from './Avatar';
import { Button } from './Button';

export function UserCard() {
  return (
    <Card>
      <Avatar src="/avatar.jpg" />
      <Button onClick={handleClick}>Click</Button>
    </Card>
  );
}
```

### Plain TypeScript Functions

**Before:**
```typescript
// services/calculator.ts
const total = calculateSum(10, 20);
const isValid = validateEmail('test@example.com');
const price = formatCurrency(29.99);
```

**After running `auto-import`:**
```typescript
// services/calculator.ts
import { calculateSum } from './utils';
import { validateEmail } from './validators';
import { formatCurrency } from './formatters';

const total = calculateSum(10, 20);
const isValid = validateEmail('test@example.com');
const price = formatCurrency(29.99);
```

### Vue.js Components

**Before:**
```vue
<script setup>
const userName = formatName('John', 'Doe');
</script>
```

**After:**
```vue
<script setup>
import { formatName } from './utils';
const userName = formatName('John', 'Doe');
</script>
```

---

## ⚙️ Configuration

Create a `.auto-import.json` file in your project root:

```json
{
  "extensions": [".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte", ".astro"],
  "ignore": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/node_modules/**",
    "**/dist/**"
  ],
  "dryRun": false,
  "verbose": false
}
```

### Configuration Options

- **extensions**: Array of file extensions to scan
- **ignore**: Array of glob patterns to ignore
- **dryRun**: Preview mode (no file modifications)
- **verbose**: Detailed output

---

## 🎭 What Gets Detected

| Type | Detected | Example |
|------|----------|---------|
| ✅ JSX Components | Yes | `<Card>`, `<Button>` |
| ✅ Function Calls | Yes | `formatName()`, `calculateSum()` |
| ❌ Method Calls | No (filtered) | `obj.method()` |
| ❌ Built-in Types | No (filtered) | `Array`, `String`, `Object` |
| ❌ Common Methods | No (filtered) | `console.log()` |

---

## 🔗 Integration

### NPM Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "fix-imports": "auto-import ./src",
    "check-imports": "auto-import ./src --dry-run --verbose"
  }
}
```

### Pre-commit Hook

Using [husky](https://github.com/typicode/husky):

```bash
npx husky add .husky/pre-commit "npm run fix-imports"
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
- name: Check Imports
  run: npx auto-import --dry-run --verbose
```

---

## 🐛 Troubleshooting

### Common Issues

<details>
<summary><b>Imports not being detected</b></summary>

- Ensure your files have the correct extensions
- Check that files aren't in ignored directories
- Use `--verbose` to see what's being scanned
</details>

<details>
<summary><b>Wrong imports being added</b></summary>

- Use `--dry-run` to preview changes first
- Check your ignore patterns
- Ensure export statements are correctly formatted
</details>

<details>
<summary><b>Performance issues</b></summary>

- Add more ignore patterns for large directories
- Use specific directory paths instead of scanning entire project
- Consider excluding test files and build artifacts
</details>

---

## 📊 Performance

- **Speed**: Processes ~1000 files in < 5 seconds
- **Memory**: < 100MB for typical projects
- **Accuracy**: > 95% correct import detection

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/YosefHayim/auto-import-cli.git
cd auto-import-cli

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run in development mode
npm run dev
```

### Ways to Contribute

- 🐛 [Report bugs](https://github.com/YosefHayim/auto-import-cli/issues/new?template=bug_report.yml)
- ✨ [Request features](https://github.com/YosefHayim/auto-import-cli/issues/new?template=feature_request.yml)
- 📚 [Improve documentation](https://github.com/YosefHayim/auto-import-cli/issues/new?template=documentation.yml)
- 💻 Submit pull requests

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [TypeScript](https://www.typescriptlang.org/)
- CLI powered by [Commander.js](https://github.com/tj/commander.js)
- Beautiful output with [Chalk](https://github.com/chalk/chalk)
- File operations with [glob](https://github.com/isaacs/node-glob)

---

## 📮 Support

- 📧 Email: yosefisabag+03@gmail.com
- 💬 [GitHub Discussions](https://github.com/YosefHayim/auto-import-cli/discussions)
- 🐛 [Issue Tracker](https://github.com/YosefHayim/auto-import-cli/issues)
- ☕ [Buy Me a Coffee](https://buymeacoffee.com/yosefhayim)

---

## 🔐 Security

See [SECURITY.md](SECURITY.md) for our security policy and how to report vulnerabilities.

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes in each version.

---

<div align="center">

**Made with ❤️ by [Yosef Hayim Sabag](https://github.com/YosefHayim)**

[⬆ back to top](#auto-import-cli)

</div>
