# Contributing to import-pilot

Thank you for your interest in contributing to import-pilot! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/YosefHayim/import-pilot.git
cd import-pilot
```

2. **Install dependencies**

```bash
npm install
```

3. **Build the project**

```bash
npm run build
```

4. **Run tests**

```bash
npm test
```

## Project Structure

```
import-pilot/
├── src/
│   ├── scanner/         # File scanning functionality
│   ├── parser/          # AST parsing and import detection
│   ├── resolver/        # Import resolution logic
│   ├── cli/             # CLI interface
│   └── __tests__/       # Unit tests
├── bin/                 # Executable entry point
├── tests/
│   └── sample-project/  # Sample test project
└── dist/                # Compiled output (generated)
```

## Development Workflow

1. **Watch mode for development**

```bash
npm run dev
```

2. **Run tests in watch mode**

```bash
npm run test:watch
```

3. **Test your changes**

```bash
node bin/auto-import.js tests/sample-project --dry-run --verbose
```

## Guidelines

### Code Style

- Use TypeScript with strict mode enabled
- Follow existing code patterns and naming conventions
- Use meaningful variable and function names
- Add comments for complex logic

### Testing

- Write unit tests for new features
- Ensure all existing tests pass
- Aim for high test coverage
- Test edge cases

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <description>

Examples:
feat(parser): add support for dynamic imports
fix(resolver): correct relative path resolution
docs(readme): update usage examples
test(scanner): add tests for ignore patterns
```

## Adding New Features

1. **Create a feature branch**

```bash
git checkout -b feat/your-feature-name
```

2. **Implement your feature**
   - Add source code in appropriate module
   - Write unit tests
   - Update documentation

3. **Test thoroughly**

```bash
npm test
npm run build
node bin/auto-import.js tests/sample-project
```

4. **Submit a pull request**
   - Describe the feature clearly
   - Reference any related issues
   - Include examples if applicable

## Reporting Issues

When reporting issues, please include:

- Auto Import CLI version
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Sample code or project structure (if possible)

## Feature Requests

Feature requests are welcome! Please:

- Check if the feature has already been requested
- Clearly describe the use case
- Explain why this feature would be valuable
- Provide examples if possible

## Pull Request Process

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Run tests and build
5. Update documentation
6. Submit pull request

Your PR will be reviewed and feedback provided. Please be patient and responsive to feedback.

## Code of Conduct

- Be respectful and professional
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Collaborate openly

## Questions?

Feel free to open an issue for any questions or reach out to the maintainers.

Thank you for contributing! 🎉
