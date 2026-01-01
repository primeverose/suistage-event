# 🤝 Contributing to SuiStage

First off, thank you for considering contributing to SuiStage! It's people like you that make SuiStage such a great tool.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- ✅ Be respectful and inclusive
- ✅ Accept constructive criticism gracefully
- ✅ Focus on what is best for the community
- ✅ Show empathy towards other community members
- ❌ No harassment, trolling, or insulting comments
- ❌ No political or off-topic discussions

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- Python 3.9+ installed
- Sui CLI installed
- Git configured
- A GitHub account

### Setup Development Environment

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/suistage-role2-sqlite.git
cd suistage-role2-sqlite

# 3. Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/suistage-role2-sqlite.git

# 4. Install dependencies
cd backend
npm install

# 5. Copy environment file
cp .env.example .env

# 6. Start development server
npm run dev
```

### Finding Something to Work On

1. **Check Issues**: Browse [existing issues](../../issues)
2. **Good First Issues**: Look for issues labeled `good first issue`
3. **Help Wanted**: Issues labeled `help wanted` are great for contributors
4. **Feature Requests**: Check issues labeled `enhancement`

---

## 🔄 Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Update your fork
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

Examples:
- `feature/add-ticket-nft`
- `fix/event-date-validation`
- `docs/update-api-guide`

### 2. Make Your Changes

- Write clean, readable code
- Follow the coding standards (see below)
- Add tests for new features
- Update documentation as needed
- Keep commits atomic and focused

### 3. Test Your Changes

```bash
# Run backend tests
cd backend
npm test

# Run contract tests
cd contracts
sui move test

# Build to check for errors
cd backend
npm run build
```

### 4. Commit Your Changes

Follow our [commit guidelines](#commit-guidelines):

```bash
git add .
git commit -m "feat: add ticket NFT minting"
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

1. Go to your fork on GitHub
2. Click "Pull Request"
3. Select your branch
4. Fill out the PR template
5. Submit!

---

## 💻 Coding Standards

### TypeScript/JavaScript

```typescript
// ✅ Good
export async function getEventById(eventId: string): Promise<Event | null> {
    const result = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    return (result.rows[0] as Event) || null;
}

// ❌ Bad
export async function getEventById(eventId) {
    const result = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    return result.rows[0] || null;
}
```

**Standards:**
- Use TypeScript for all new code
- Always define types and interfaces
- Use `async/await` instead of promises
- Use meaningful variable names
- Add JSDoc comments for public functions
- Max line length: 100 characters
- Use 4 spaces for indentation

### Move Smart Contracts

```move
// ✅ Good
/// Creates a new event with the given parameters
public entry fun create_event(
    registry: &mut EventRegistry,
    name: vector<u8>,
    // ... other params
    ctx: &mut TxContext
) {
    // Validate inputs
    assert!(date > current_time, ERROR_INVALID_DATE);

    // Create event
    let event = Event { /* ... */ };

    // Emit event
    event::emit(EventCreated { /* ... */ });
}

// ❌ Bad
public entry fun create_event(r: &mut EventRegistry, n: vector<u8>, ctx: &mut TxContext) {
    let e = Event { /* ... */ };
}
```

**Standards:**
- Add documentation comments (`///`)
- Use descriptive function and variable names
- Always validate inputs
- Use appropriate error codes
- Emit events for important state changes
- Write comprehensive tests

### SQL Queries

```typescript
// ✅ Good
const query = `
    SELECT * FROM events
    WHERE date > $1
      AND is_active = 1
    ORDER BY date DESC
    LIMIT $2 OFFSET $3
`;

// ❌ Bad
const query = 'SELECT * FROM events WHERE date > $1 AND is_active = 1 ORDER BY date DESC LIMIT $2 OFFSET $3';
```

**Standards:**
- Use parameterized queries (prevent SQL injection)
- Format multi-line queries for readability
- Use uppercase for SQL keywords
- Proper indentation for complex queries

---

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
# Feature
git commit -m "feat(events): add event cancellation functionality"

# Bug fix
git commit -m "fix(database): resolve SQLite locking issue"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api)!: change event endpoint response format

BREAKING CHANGE: Event API now returns dates in ISO format instead of Unix timestamp"
```

### Best Practices

- ✅ Use present tense ("add feature" not "added feature")
- ✅ Be concise but descriptive
- ✅ Reference issues: `fix(api): resolve timeout issue (#123)`
- ✅ Explain WHY, not WHAT (code shows what)
- ❌ Don't commit unrelated changes together
- ❌ Don't use vague messages like "fix stuff"

---

## 🔀 Pull Request Process

### Before Submitting

- [ ] All tests pass
- [ ] Code follows our style guidelines
- [ ] Documentation is updated
- [ ] No merge conflicts
- [ ] Branch is up to date with main

### PR Title

Follow the same format as commit messages:

```
feat(events): add recurring events support
fix(api): resolve race condition in seat reservation
docs: update deployment guide
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Motivation
Why is this change needed?

## Changes
- Change 1
- Change 2
- Change 3

## Testing
How has this been tested?

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Commit messages follow guidelines
```

### Review Process

1. **Automated Checks**: CI/CD will run tests
2. **Code Review**: At least one maintainer will review
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, a maintainer will merge

### After Merge

- Your branch will be deleted
- You'll be added to contributors
- Close related issues

---

## 🧪 Testing

### Writing Tests

**Backend Tests:**

```typescript
describe('Event Service', () => {
    it('should create a new event', async () => {
        const event = await createEvent({
            name: 'Test Event',
            // ...
        });

        expect(event).toBeDefined();
        expect(event.name).toBe('Test Event');
    });
});
```

**Contract Tests:**

```move
#[test]
fun test_create_event() {
    let mut scenario = ts::begin(ADMIN);

    // Setup
    event::init_for_testing(ts::ctx(&mut scenario));

    // Test
    // ...

    ts::end(scenario);
}
```

### Test Coverage

- Aim for at least 80% coverage
- Test edge cases
- Test error conditions
- Test async operations

---

## 📚 Documentation

### Code Documentation

```typescript
/**
 * Retrieves an event by its ID from the database
 *
 * @param eventId - The unique identifier of the event
 * @returns The event object or null if not found
 * @throws {DatabaseError} If database connection fails
 *
 * @example
 * ```typescript
 * const event = await getEventById('0x123...');
 * if (event) {
 *   console.log(event.name);
 * }
 * ```
 */
export async function getEventById(eventId: string): Promise<Event | null>
```

### Documentation Updates

When adding new features, update:

1. **README.md** - If it affects setup or usage
2. **API Documentation** - If adding/changing endpoints
3. **Code Comments** - For complex logic
4. **Examples** - If introducing new patterns

---

## 🐛 Reporting Bugs

### Before Reporting

1. Check if the bug has already been reported
2. Try to reproduce the bug
3. Collect relevant information

### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Actual behavior**
What actually happens

**Environment:**
 - OS: [e.g. macOS 12]
 - Node version: [e.g. 20.0.0]
 - Sui version: [e.g. 1.55.0]

**Additional context**
Any other relevant information
```

---

## 💡 Suggesting Features

We love feature suggestions! Here's how:

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem

**Describe the solution you'd like**
What you want to happen

**Describe alternatives you've considered**
Other solutions you've thought about

**Additional context**
Mockups, examples, etc.
```

---

## 🎓 Resources

### Learning Resources

- [Sui Documentation](https://docs.sui.io/)
- [Move Language Guide](https://move-language.github.io/move/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

### Project Resources

- [Architecture Guide](./SIMPLIFIED_ARCHITECTURE.md)
- [File Structure](./FILE_EXPLANATIONS_AND_COLLABORATION.md)
- [Quick Start](./QUICKSTART.md)

---

## 📞 Getting Help

- **Questions**: [GitHub Discussions](../../discussions)
- **Issues**: [GitHub Issues](../../issues)
- **Chat**: [Discord](#) (if available)

---

## 🙏 Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort!

**Happy Coding! 🚀**

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
