# Auto Import CLI

Open source CLI tool that automatically scans each file in your project and imports missing imports of Components, functions, etc., instead of wasting AI Agents tokens.

## Features

- 🔍 **Automatic Scanning**: Scans all TypeScript/JavaScript files in your project
- 🎯 **Smart Detection**: Identifies missing imports using AST parsing
- 📦 **Function Support**: Detects both JSX components AND plain TypeScript/JavaScript functions
- 🔗 **Import Resolution**: Finds the source of components and functions across your codebase
- 🚀 **Fast & Efficient**: Lightweight regex-based parser for quick analysis
- 🎨 **Beautiful CLI**: Colorful terminal output with detailed feedback
- 🔧 **Configurable**: Support for custom extensions, ignore patterns, and more
- 🧪 **Dry Run Mode**: Preview changes before applying them
- 🌐 **Multi-Framework**: Supports Vue.js, Svelte, Astro, React, and more
- 🎯 **Path Aliases**: Uses `@/` path aliases instead of relative imports in source code

## Installation

### Global Installation

```bash
npm install -g auto-import-cli
```

### Local Installation

```bash
npm install --save-dev auto-import-cli
```

## Usage

### Basic Usage

Scan the current directory and auto-fix missing imports:

```bash
auto-import
```

### Scan a Specific Directory

```bash
auto-import ./src
```

### Dry Run (Preview Changes)

```bash
auto-import --dry-run
```

### Verbose Output

```bash
auto-import --verbose
```

### Custom File Extensions

```bash
auto-import --extensions .ts,.tsx,.js,.jsx
```

### Ignore Patterns

```bash
auto-import --ignore "**/*.test.ts,**/*.spec.ts"
```

### Complete Example

```bash
auto-import ./src --dry-run --verbose --extensions .ts,.tsx --ignore "**/*.test.ts"
```

## CLI Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--dry-run` | `-d` | Preview changes without modifying files | `false` |
| `--verbose` | `-v` | Show detailed output for each file | `false` |
| `--extensions` | `-e` | File extensions to scan (comma-separated) | `.ts,.tsx,.js,.jsx` |
| `--ignore` | `-i` | Patterns to ignore (comma-separated) | - |
| `--config` | `-c` | Path to config file | - |

## Configuration File

Create a `.auto-import.json` file in your project root:

```json
{
  "extensions": [".ts", ".tsx", ".js", ".jsx"],
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

## How It Works

1. **Scanning**: The tool recursively scans all files in the specified directory
2. **Parsing**: Each file is parsed to identify existing imports and used identifiers
3. **Resolution**: Missing identifiers are matched against exports found in your project
4. **Application**: Import statements are automatically added to files (unless in dry-run mode)

## Examples

### JSX Components

Before:
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

After running `auto-import`:
```typescript
// components/UserCard.tsx
import { Card } from './Card';
import { Avatar } from './Avatar';
import { Button } from '../ui/Button';

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

Before:
```typescript
// services/calculator.ts

const total = calculateSum(10, 20);
const isValid = validateEmail('test@example.com');
const price = formatCurrency(29.99);
```

After running `auto-import`:
```typescript
// services/calculator.ts
import { calculateSum } from './utils';
import { validateEmail } from './validators';
import { formatCurrency } from './formatters';

const total = calculateSum(10, 20);
const isValid = validateEmail('test@example.com');
const price = formatCurrency(29.99);
```

### What Gets Detected

✅ **JSX Components**: `<Card>`, `<Button>`, `<Avatar>`
✅ **Function Calls**: `calculateSum()`, `formatName()`, `validateEmail()`
❌ **Method Calls**: `obj.method()` (filtered out)
❌ **Built-in Types**: `Array`, `Object`, `String` (filtered out)

## Use Case: Saving AI Agent Tokens

When working with AI coding assistants (GitHub Copilot, ChatGPT, Claude, etc.), they often need to:
- Read multiple files to understand available exports
- Generate import statements
- Remember module paths and structures

This wastes valuable context tokens. By using `auto-import-cli`, you can:
- ✅ Write code without worrying about imports
- ✅ Let the tool automatically add missing imports
- ✅ Save AI agent tokens for actual logic and problem-solving
- ✅ Speed up development workflow

## Integration with Development Workflow

### NPM Script

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

Use with [husky](https://github.com/typicode/husky):

```bash
npx husky add .husky/pre-commit "npm run fix-imports"
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
- name: Check Imports
  run: npx auto-import --dry-run --verbose
```

## Supported File Types

### JavaScript/TypeScript
- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)
- React components
- Node.js modules
- ES6 modules

### Frontend Frameworks
- **Vue.js** (`.vue`) - Single File Components with `<script>` and `<script setup>`
- **Svelte** (`.svelte`) - Svelte components
- **Astro** (`.astro`) - Astro components with frontmatter

The tool intelligently extracts script sections from framework-specific files and adds imports in the correct location while preserving the file structure.

## Framework Examples

### Vue.js

Before:
```vue
<script setup>

const userName = formatName('John', 'Doe');
</script>
```

After running `auto-import`:
```vue
<script setup>
import { formatName } from './utils';
const userName = formatName('John', 'Doe');
</script>
```

### Svelte

Before:
```svelte
<script>

let formatted = formatDate(new Date());
</script>
```

After:
```svelte
<script>
import { formatDate } from './utils';
let formatted = formatDate(new Date());
</script>
```

### Astro

Before:
```astro
---

const title = capitalize('hello world');
---
```

After:
```astro
---
import { capitalize } from './utils';
const title = capitalize('hello world');
---
```

## Limitations

- Currently uses regex-based parsing (fast but may miss complex patterns)
- Works best with standard import/export syntax
- Does not yet support dynamic imports
- Does not resolve npm package imports (only project-local imports)

## Future Enhancements

- [ ] Full AST parsing support using babel/typescript compiler
- [ ] Support for npm package resolution
- [ ] Auto-organize and sort imports
- [ ] Remove unused imports
- [ ] Support for JSDoc imports
- [ ] Integration with popular IDEs
- [ ] Configuration presets for popular frameworks

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

Yosef Hayim Sabag

## Links

- [GitHub Repository](https://github.com/YosefHayim/auto-import-cli)
- [Report Issues](https://github.com/YosefHayim/auto-import-cli/issues)
