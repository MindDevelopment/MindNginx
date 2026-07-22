# Contributing to MindNginx

Thank you for your interest in contributing to MindNginx! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js (version 10 or higher)
- Nginx installed
- Git

### Setting Up Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/MindNginx.git
   cd MindNginx
   ```
3. Verify your setup:
   ```bash
   node --version
   nginx -v
   ```

## How to Contribute

### Reporting Bugs

1. Check existing issues first
2. Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, Node.js version, Nginx version)

### Suggesting Features

1. Open an issue with the `enhancement` label
2. Describe the feature and its benefits
3. Provide examples if possible

### Submitting Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes
3. Test thoroughly:
   ```bash
   sudo node nginx.js
   ```

4. Commit with clear message:
   ```bash
   git commit -m "Add: brief description of changes"
   ```

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Open a Pull Request

## Code Style Guidelines

### JavaScript Style

- Use strict mode (`'use strict'`)
- Use `const` and `let` instead of `var`
- Use arrow functions where appropriate
- Use template literals for string concatenation
- Use destructuring where it improves readability
- Keep functions small and focused
- Add comments for complex logic

### Naming Conventions

- **Functions**: camelCase (`getSiteConfig`, `handleError`)
- **Variables**: camelCase (`siteList`, `currentPath`)
- **Constants**: UPPER_SNAKE_CASE (`CONFIG`, `SITES_AVAILABLE`)
- **Classes**: PascalCase (`Site`)

### File Structure

- Keep everything in a single file (`nginx.js`)
- Use clear section separators with comments
- Group related functions together
- Put helper functions before main logic

### Example Code Style

```javascript
// ─── SECTION NAME ──────────────────────────────────────
function exampleFunction(param1, param2) {
    const result = param1 + param2;
    return result;
}

const siteConfig = {
    serverName: 'example.com',
    listen: '80',
    root: '/var/www/example.com',
};
```

## Testing

### Manual Testing

1. Run MindNginx:
   ```bash
   sudo node nginx.js
   ```

2. Test all menu options:
   - Add a site
   - Enable/disable a site
   - Delete a site
   - View site config
   - View logs
   - Nginx control
   - Test configuration
   - Create backup
   - Restore backup

3. Test edge cases:
   - Empty configuration
   - Invalid paths
   - Special characters in names

### Test Scenarios

- **Add Site**: Test static, proxy, and custom types
- **Enable/Disable**: Verify symlinks are created/removed
- **Delete Site**: Test with enabled and disabled sites
- **Backup/Restore**: Verify backup integrity
- **Error Handling**: Test with invalid inputs

## Documentation

### Updating Documentation

- Update README.md for user-facing changes
- Update Docs/ files for detailed explanations
- Keep documentation in sync with code changes

### Documentation Standards

- Use clear, concise language
- Provide code examples
- Include troubleshooting steps
- Keep formatting consistent

## Pull Request Process

### Before Submitting

1. Test your changes thoroughly
2. Update documentation if needed
3. Ensure no console errors
4. Check for typos and formatting

### PR Description

Include in your PR description:

1. **What**: Brief description of changes
2. **Why**: Reason for changes
3. **How**: Implementation details
4. **Testing**: How you tested the changes

### Example PR Template

```
## Description
Brief description of the changes.

## Motivation
Why this change is needed.

## Changes
- Added feature X
- Fixed bug Y
- Updated documentation Z

## Testing
- Tested manually with various sites
- Verified all menu options work
- Checked error handling

## Screenshots
If applicable, add screenshots.
```

## Code Review

### What We Look For

- Code quality and readability
- Proper error handling
- Consistent style
- Documentation updates
- Test coverage

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged

## Community Guidelines

### Be Respectful

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully

### Be Constructive

- Focus on what is best for the community
- Show empathy towards other contributors
- Help others when possible

## Getting Help

- Open an issue for bugs or features
- Join discussions in issues
- Contact maintainers directly if needed

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to MindNginx!
