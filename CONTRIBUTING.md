# Contributing to Discord TemplateBot

Thank you for your interest in contributing to the Discord TemplateBot! This document provides guidelines and best practices for contributing to this template.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)

## 📜 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other contributors

## 🚀 Getting Started

### Prerequisites

- Node.js v18+ installed
- pnpm v8+ installed
- Git configured
- Discord Developer Portal account

### Setup Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd bot/Discord-TemplateBot

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
# Edit .env with your Discord credentials

# Deploy commands
pnpm run deploy

# Start development server
pnpm run dev
```

## 🔄 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/my-new-feature
# or
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/changes
- `chore/` - Maintenance tasks

### 2. Make Changes

- Follow the [Coding Standards](#coding-standards)
- Write tests for new features
- Update documentation as needed
- Ensure all checks pass

### 3. Commit Changes

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add new greeting command"
```

See [Commit Guidelines](#commit-guidelines) for commit message format.

### 4. Push and Create PR

```bash
git push origin feature/my-new-feature
```

Then create a Pull Request on GitHub.

## 📏 Coding Standards

### TypeScript

- **Use TypeScript for all new code**
- **Enable strict mode** (already configured)
- **Avoid `any` type** - use proper types or `unknown`
- **Use interfaces for object shapes**
- **Export types with code**

Example:
```typescript
// ✅ Good
interface UserData {
  id: string;
  username: string;
}

function processUser(user: UserData): void {
  // ...
}

// ❌ Bad
function processUser(user: any) {
  // ...
}
```

### Code Style

We use **Prettier** and **ESLint** for consistent code style.

```bash
# Format code
pnpm run format

# Check formatting
pnpm run format:check

# Lint code
pnpm run lint

# Fix lint issues
pnpm run lint:fix
```

#### Key Style Rules

- **Indentation:** 2 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Always use semicolons
- **Line length:** Max 100 characters
- **Trailing commas:** Always use in multiline

### Documentation

#### JSDoc Comments

All public functions, classes, and interfaces MUST have JSDoc:

```typescript
/**
 * Send a greeting message to a user
 *
 * @param interaction - The Discord interaction
 * @param username - The user's name to greet
 * @returns Promise that resolves when message is sent
 * @throws {Error} If interaction fails
 *
 * @example
 * ```ts
 * await greetUser(interaction, 'Alice');
 * ```
 */
async function greetUser(
  interaction: ChatInputCommandInteraction,
  username: string,
): Promise<void> {
  // Implementation
}
```

#### Command Documentation

Commands must include metadata in JSDoc:

```typescript
/**
 * @command commandname
 * @description Short description
 * @usage /commandname [options]
 * @permissions Required permissions (or 'None')
 * @category utility|moderation|fun|music|admin
 */
```

### File Organization

#### Imports

Group and order imports:

```typescript
// 1. External dependencies
import { Client, GatewayIntentBits } from 'discord.js';
import { FastifyInstance } from 'fastify';

// 2. Internal modules (absolute paths with @/)
import { config } from '@/config.js';
import { Command } from '@/commands/types.js';

// 3. Relative imports
import { helperFunction } from './helpers.js';
```

#### Exports

Prefer named exports:

```typescript
// ✅ Good
export const config = { /* ... */ };
export function validateConfig() { /* ... */ }

// ❌ Bad
export default { /* ... */ };
```

### Error Handling

Always handle errors properly:

```typescript
// ✅ Good
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  // Handle or rethrow
  throw new Error('Failed to complete operation');
}

// ❌ Bad
try {
  await riskyOperation();
} catch (error) {
  // Empty catch - never do this!
}
```

### Async/Await

- Always use `async/await` over `.then()` chains
- Handle promise rejections
- Use `void` keyword for fire-and-forget promises

```typescript
// ✅ Good
async function fetchData(): Promise<Data> {
  const response = await fetch(url);
  return await response.json();
}

// Fire-and-forget (intentionally not awaited)
void logEvent();

// ❌ Bad
function fetchData() {
  return fetch(url).then(r => r.json());
}
```

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `ci:` - CI/CD changes

### Examples

```bash
# Feature
feat(commands): add user info command

# Bug fix
fix(client): handle missing guild member data

# Documentation
docs(readme): update installation instructions

# Refactoring
refactor(api): improve error handling in routes

# Breaking change
feat(config)!: migrate to Zod validation

BREAKING CHANGE: Config now requires Zod schema validation
```

## 🔀 Pull Request Process

### Before Submitting

1. **Run all checks:**
   ```bash
   pnpm run validate
   ```

2. **Update documentation** if needed

3. **Add tests** for new features

4. **Ensure no breaking changes** (or document them)

### PR Title

Use the same format as commit messages:

```
feat(commands): add greeting command
fix(api): correct stats endpoint response
```

### PR Description

Include:

- **What:** Brief description of changes
- **Why:** Motivation for the change
- **How:** Technical approach used
- **Testing:** How you tested the changes
- **Screenshots:** For UI changes
- **Breaking Changes:** If any

Template:

```markdown
## What

Adds a new `/greet` command that greets users

## Why

Users requested a friendly greeting feature

## How

- Created `greet.ts` command file
- Registered in command index
- Added tests

## Testing

- Manually tested `/greet` in development
- Added unit tests
- All checks pass

## Breaking Changes

None
```

### Review Process

- At least 1 approval required (for actual projects)
- All CI checks must pass
- No merge conflicts
- Up-to-date with main branch

## 🧪 Testing Guidelines

### Writing Tests

Use Vitest for testing:

```typescript
// src/commands/ping.test.ts
import { describe, it, expect, vi } from 'vitest';
import { pingCommand } from './ping';

describe('Ping Command', () => {
  it('should reply with "Pong!"', async () => {
    const mockInteraction = {
      reply: vi.fn(),
    };

    await pingCommand.execute(mockInteraction as any);

    expect(mockInteraction.reply).toHaveBeenCalledWith('Pong!');
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm run test:watch

# With coverage
pnpm run test:coverage

# UI mode
pnpm run test:ui
```

### Test Coverage

- Aim for **80%+ coverage** for new code
- Focus on critical paths
- Test edge cases and error conditions

## 🏗️ Architecture Guidelines

### Adding a New Command

1. Create file in `src/commands/`:
   ```typescript
   // src/commands/mycommand.ts
   export const myCommand: Command = { /* ... */ };
   ```

2. Register in `src/commands/index.ts`:
   ```typescript
   import { myCommand } from './mycommand.js';
   export const commands: Command[] = [/* ..., */ myCommand];
   ```

3. Deploy:
   ```bash
   pnpm run deploy
   ```

### Adding a New Service

1. Create file in `src/services/`:
   ```typescript
   // src/services/myservice.ts
   export class MyService { /* ... */ }
   export const myService = new MyService();
   ```

2. Export in `src/services/index.ts`:
   ```typescript
   export * from './myservice.js';
   ```

### Adding a New API Route

1. Add to `src/api/bot.api.ts`:
   ```typescript
   fastify.get('/my-route', {
     schema: { /* OpenAPI schema */ },
   }, async () => {
     // Handler
   });
   ```

## 🐛 Reporting Bugs

When reporting bugs, include:

- **Environment:** OS, Node version, pnpm version
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Logs/errors**
- **Screenshots** if applicable

## 💡 Suggesting Features

When suggesting features:

- **Use case:** Why is this needed?
- **Proposed solution:** How should it work?
- **Alternatives:** Other approaches considered?
- **Additional context:** Mockups, examples, etc.

## 📚 Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Discord.js Guide](https://discordjs.guide/)
- [Fastify Documentation](https://fastify.dev/)
- [Vitest Documentation](https://vitest.dev/)

## ❓ Questions?

- Check existing issues
- Ask in discussions
- Read the documentation

---

Thank you for contributing! 🎉
