# Maintainer Guide

This guide helps maintainers manage the auto-import-cli project.

## Table of Contents

- [CI/CD Workflows](#cicd-workflows)
- [Publishing New Versions](#publishing-new-versions)
- [Managing Issues](#managing-issues)
- [Managing Pull Requests](#managing-pull-requests)
- [Security](#security)

## CI/CD Workflows

### CI Workflow

**File:** `.github/workflows/ci.yml`

**Triggers:**
- Pull requests to `main` branch
- Pushes to `main` branch

**What it does:**
1. **Test Job**: Runs tests on Node.js 18.x, 20.x, and 22.x
2. **Build Verification**: Ensures the build produces correct artifacts
3. **Edge Cases**: Tests CLI with various scenarios
4. **Coverage**: Uploads code coverage to Codecov (Node 20.x only)

**Viewing Results:**
- Go to the "Actions" tab in GitHub
- Find your PR or commit
- Click on the workflow run to see details

### Publish Workflow

**File:** `.github/workflows/publish.yml`

**Triggers:**
- Git tags matching `v*.*.*` (e.g., `v1.0.1`, `v2.1.0`)

**What it does:**
1. Runs all tests
2. Builds the project
3. Publishes to npm with provenance
4. Creates a GitHub release

**Prerequisites:**
- `NPM_TOKEN` secret must be configured in repository settings
- Token needs publishing permissions for the package

## Publishing New Versions

### Step-by-Step Process

1. **Update Version**
   ```bash
   # Update package.json version
   npm version patch  # for 1.0.0 -> 1.0.1
   # OR
   npm version minor  # for 1.0.0 -> 1.1.0
   # OR
   npm version major  # for 1.0.0 -> 2.0.0
   ```

2. **Update CHANGELOG.md**
   - Move items from `[Unreleased]` to new version section
   - Add release date
   - Update version links at bottom

3. **Commit Changes**
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "Release v1.0.1"
   ```

4. **Create and Push Tag**
   ```bash
   git tag v1.0.1
   git push origin main
   git push origin v1.0.1
   ```

5. **Monitor Publish**
   - Go to "Actions" tab
   - Watch "Publish to NPM" workflow
   - Verify success and check npm

### Versioning Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

## Managing Issues

### Issue Templates

We have 4 issue templates:

1. **Bug Report** (`bug_report.yml`)
   - Auto-labels: `bug`, `triage`
   - Contains: Description, reproduction steps, environment

2. **Feature Request** (`feature_request.yml`)
   - Auto-labels: `enhancement`, `triage`
   - Contains: Problem, solution, priority

3. **Documentation** (`documentation.yml`)
   - Auto-labels: `documentation`
   - Contains: Doc type, current state, suggestions

4. **Question** (`question.yml`)
   - Auto-labels: `question`
   - Contains: Question, context, what was tried

### Triage Process

1. **Review new issues** with `triage` label
2. **Verify information** is complete
3. **Ask for clarification** if needed
4. **Reproduce bugs** when possible
5. **Remove `triage`** label and add appropriate labels:
   - Priority: `priority-high`, `priority-medium`, `priority-low`
   - Status: `good first issue`, `help wanted`, `duplicate`, `wontfix`
   - Type: `bug`, `enhancement`, `documentation`

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements to docs
- `question` - Further information requested
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `duplicate` - Issue already exists
- `wontfix` - This will not be worked on
- `priority-high` - High priority
- `priority-medium` - Medium priority
- `priority-low` - Low priority

## Managing Pull Requests

### PR Template

All PRs use `.github/PULL_REQUEST_TEMPLATE.md`

### Review Checklist

- [ ] PR title is clear and descriptive
- [ ] Linked to related issue (if applicable)
- [ ] All CI checks pass
- [ ] Code follows project style
- [ ] Tests added for new features
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (if user-facing change)

### Merge Process

1. **Review code** thoroughly
2. **Run CI checks** (automatic)
3. **Request changes** if needed
4. **Approve** when ready
5. **Merge** using "Squash and merge" (recommended)

### Merge Strategies

- **Squash and merge**: Most common, clean history
- **Rebase and merge**: For clean, small PRs
- **Create merge commit**: For feature branches

## Security

### Security Policy

**File:** `SECURITY.md`

### Reporting Vulnerabilities

Users should email: `yosefisabag+03@gmail.com`

### Handling Security Reports

1. **Acknowledge** within 48 hours
2. **Validate** the vulnerability
3. **Develop a fix** (private branch)
4. **Test** the fix thoroughly
5. **Release** new version with fix
6. **Publish** security advisory
7. **Credit** reporter (unless anonymous)

### Security Best Practices

- Never commit secrets
- Review dependencies regularly
- Keep Node.js version updated
- Use provenance when publishing

## Additional Resources

- [Contributing Guide](../CONTRIBUTING.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [Security Policy](../SECURITY.md)
- [Changelog](../CHANGELOG.md)

## Questions?

If you have questions about maintaining the project:
- Check existing documentation
- Review past issues and PRs
- Ask in GitHub Discussions
- Contact project owner

---

**Remember:** Be kind, be professional, and help grow the community! 🌱
