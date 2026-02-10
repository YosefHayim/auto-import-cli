# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of import-pilot seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please email security concerns to: yosefisabag+03@gmail.com

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include

Please include the following information in your report:

- Type of vulnerability
- Full path of source file(s) related to the manifestation of the vulnerability
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- Acknowledgment of your report within 48 hours
- Regular updates on the progress of fixing the vulnerability
- Credit for your discovery in the release notes (unless you prefer to remain anonymous)

## Security Best Practices for Users

When using import-pilot:

1. **Keep the tool updated**: Always use the latest version
2. **Review changes**: Use `--dry-run` flag before applying changes to your codebase
3. **Backup your code**: Always commit your changes before running auto-import
4. **Validate imports**: Review the imports added by the tool to ensure they're correct
5. **Use in trusted environments**: Be cautious when running on untrusted codebases

## Scope

The following are considered in scope for security vulnerabilities:

- Code injection vulnerabilities
- Path traversal vulnerabilities
- Arbitrary file read/write vulnerabilities
- Denial of service vulnerabilities
- Privilege escalation vulnerabilities

The following are considered out of scope:

- Issues in dependencies (please report these to the respective maintainers)
- Social engineering attacks
- Physical attacks

## Disclosure Policy

We follow a coordinated disclosure model:

1. Security issue is reported privately
2. Issue is validated and a fix is developed
3. Fix is tested and validated
4. New version is released with the fix
5. Security advisory is published

Thank you for helping keep import-pilot and its users safe!
