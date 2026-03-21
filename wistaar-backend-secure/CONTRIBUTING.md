# 🤝 Contributing Guide

Guidelines for contributing to Wistaar Secure Backend. Thank you for helping us build a secure, reliable platform!

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Guidelines](#development-guidelines)
4. [Commit Standards](#commit-standards)
5. [Pull Request Process](#pull-request-process)
6. [Code Review Checklist](#code-review-checklist)
7. [Testing Requirements](#testing-requirements)
8. [Security Considerations](#security-considerations)
9. [Performance Standards](#performance-standards)
10. [Documentation Standards](#documentation-standards)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors must:

- **Be Respectful**: Treat all contributors with respect and professionalism
- **Be Inclusive**: Welcome contributors from all backgrounds and experience levels
- **Be Professional**: Maintain professional communication in all interactions
- **Report Issues**: Report inappropriate behavior to maintainers
- **No Harassment**: Zero tolerance for harassment, discrimination, or abuse

### Consequences

Violations of the code of conduct may result in:
- Warning
- Temporary ban from contributing
- Permanent ban (for severe violations)

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 10.0.0
- MySQL >= 8.0
- Git

### Setup Development Environment

```bash
# 1. Fork and clone repository
git clone https://github.com/YOUR-USERNAME/wistaar-backend-secure.git
cd wistaar-backend-secure

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.development

# 4. Generate encryption key
node -e "const c = require('crypto'); console.log('ENCRYPTION_KEY=' + c.randomBytes(32).toString('hex'))"
# Add to .env.development

# 5. Setup database
npm run prisma:generate
npm run prisma:migrate -- --name init

# 6. Start development server
npm run dev
```

### Verify Setup

```bash
# Should return successful responses
curl http://localhost:5000/health
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@dev.local","password":"TestPass123!","name":"Test User"}'
```

---

## Development Guidelines

### Project Structure

```
src/
  ├── config/         # Configuration files
  ├── middleware/     # Express middleware
  ├── modules/        # Feature modules (auth, books, etc.)
  ├── utils/          # Utility functions
  ├── schemas/        # Validation schemas
  ├── app.ts          # Express app setup
  └── main.ts         # Entry point

prisma/
  ├── schema.prisma   # Database schema
  └── migrations/     # Migration files

tests/
  ├── unit/           # Unit tests
  ├── integration/    # Integration tests
  └── fixtures/       # Test data
```

### Naming Conventions

**Files**
```typescript
// descriptive names in camelCase
auth.ts
userProfile.ts
passwordReset.ts
```

**Functions**
```typescript
// Verbs first, camelCase
function createUser() {}
function updatePassword() {}
function validateEmail() {}
```

**Variables**
```typescript
// camelCase, descriptive
const userId = "uuid-123";
const isEmailVerified = true;
const maxLoginAttempts = 5;
```

**Constants**
```typescript
// UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5MB
const ALLOWED_ROLES = ['user', 'author', 'admin'];
const DEFAULT_PAGE_LIMIT = 20;
```

**Classes**
```typescript
// PascalCase
class UserService {}
class AuthMiddleware {}
class CryptoUtil {}
```

### TypeScript Best Practices

**Strict Types**
```typescript
// ✅ GOOD - explicit types
function createUser(email: string, password: string): Promise<User> {
  // implementation
}

// ❌ BAD - implicit any
function createUser(email, password) {
  // implementation
}
```

**Interfaces Over Types**
```typescript
// ✅ GOOD - for object shapes
interface User {
  id: string;
  email: string;
  name: string;
}

// ✅ GOOD - for primitive aliases
type UserId = string & { readonly __brand: 'UserId' };
```

**Error Handling**
```typescript
// ✅ GOOD
try {
  await db.user.create({ data: userData });
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    // Handle specific error
  }
  throw new AppError('Creation failed', 500, 'DB_ERROR');
}

// ❌ BAD
try {
  await db.user.create({ data: userData });
} catch (e) {
  console.log("Error:", e);
  throw e;
}
```

**Async/Await Over Promises**
```typescript
// ✅ GOOD
async function getUser(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  return user;
}

// ❌ BAD
function getUser(id: string) {
  return db.user.findUnique({ where: { id } });
}
```

### Security First

Every contribution must follow security best practices:

**Never Commit**
```typescript
// ❌ NEVER
const SECRET = "hardcoded-secret-123";
const password = "admin123";
const apiKey = "sk_live_abc123";

// ✅ ALWAYS
const SECRET = process.env.JWT_SECRET;
const password = req.body.password; // Validated and hashed
const apiKey = process.env.STRIPE_API_KEY;
```

**Input Validation**
```typescript
// ✅ All inputs validated
const { body } = await validate(req, {
  body: createBookSchema
});

// ❌ Never trust user input
const title = req.body.title; // Direct use without validation
```

**Parameterized Queries**
```typescript
// ✅ Safe (Prisma)
const users = await prisma.user.findMany({
  where: { email: userEmail }
});

// ❌ SQL Injection risk
const users = await db.query(`SELECT * FROM users WHERE email = '${userEmail}'`);
```

**Encrypt Sensitive Data**
```typescript
// ✅ Encrypt before storage
const encrypted = CryptoUtil.encrypt(sensitiveData);
await db.update({ data: { field: encrypted.encrypted } });

// ❌ Never store plaintext
await db.update({ data: { creditCard: req.body.creditCard } });
```

**Log Carefully**
```typescript
// ✅ Sanitize logs
logger.info('User login', { userId, email, timestamp });

// ❌ Never log sensitive data
logger.info('User login', { userId, email, password }); // ❌ PASSWORD LEAK!
```

---

## Commit Standards

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (not logic)
- `refactor`: Code reorganization
- `perf`: Performance improvement
- `test`: Test additions/changes
- `chore`: Build, dependencies, etc.
- `security`: Security fix

### Scopes

- `auth`: Authentication module
- `books`: Books module
- `admin`: Admin module
- `payments`: Payments module
- `users`: Users module
- `db`: Database/schema
- `middleware`: Middleware
- `security`: Security features

### Examples

```
feat(auth): add email verification flow

- Add email verification endpoint
- Add verification token generation
- Add email notification system

Closes #123

---

fix(auth): prevent account enumeration

Re-using same error message for invalid email and wrong password
to prevent attacker from determining which users exist.

Closes #456

---

docs(api): document payment endpoints

Add complete API documentation for payment-related endpoints
including examples and error codes.
```

### Commit Best Practices

- ✅ Commit frequently with logical chunks
- ✅ Write descriptive commit messages
- ✅ Reference issue numbers (#123)
- ✅ Keep commits self-contained
- ❌ Don't commit multiple features in one commit
- ❌ Don't commit unrelated changes
- ❌ Don't use vague messages like "fix stuff"

---

## Pull Request Process

### Before Creating PR

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/auth-email-verification
   ```

2. **Make Changes**
   - Follow code guidelines
   - Write tests
   - Update documentation

3. **Run Quality Checks**
   ```bash
   npm run typecheck    # TypeScript compilation
   npm run lint         # ESLint
   npm run test         # All tests
   npm audit           # Security vulnerabilities
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat(auth): add email verification"
   git push origin feature/auth-email-verification
   ```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] No console.log statements
- [ ] Documentation updated
- [ ] No security issues introduced
- [ ] Backwards compatible

## Screenshots (if applicable)
```

### PR Review Process

1. **Automated Checks**
   - TypeScript compilation
   - Linting
   - Tests
   - Security scanning

2. **Code Review**
   - Maintainers review code
   - Check for security issues
   - Verify testing
   - Check documentation

3. **Approval & Merge**
   - Requires 2 approvals
   - No conflicts with main
   - All checks passing

---

## Code Review Checklist

When reviewing code, verify:

### Functionality
- [ ] Does it solve the stated problem?
- [ ] Are edge cases handled?
- [ ] Is error handling appropriate?
- [ ] Are there any logical errors?

### Code Quality
- [ ] Is code readable and clear?
- [ ] Are variables well-named?
- [ ] Is there unnecessary duplication?
- [ ] Could code be simplified?

### Security
- [ ] Are inputs validated?
- [ ] Is sensitive data encrypted?
- [ ] Are there SQL injection risks?
- [ ] Is authentication/authorization correct?
- [ ] Are secrets hardcoded?

### Performance
- [ ] Are there N+1 queries?
- [ ] Is data fetched efficiently?
- [ ] Are there memory leaks?
- [ ] Is caching used appropriately?

### Testing
- [ ] Are tests comprehensive?
- [ ] Do tests cover edge cases?
- [ ] Is test code quality high?
- [ ] Do tests actually verify behavior?

### Documentation
- [ ] Is code commented where needed?
- [ ] Is API documented?
- [ ] Are breaking changes noted?
- [ ] Is README updated?

---

## Testing Requirements

### Unit Tests

```typescript
// ✅ Test individual functions
describe('CryptoUtil', () => {
  it('should encrypt and decrypt data', () => {
    const plaintext = 'secret data';
    const encrypted = CryptoUtil.encrypt(plaintext);
    const decrypted = CryptoUtil.decrypt(
      encrypted.encrypted,
      encrypted.iv,
      encrypted.tag
    );
    expect(decrypted).toBe(plaintext);
  });

  it('should reject invalid decryption', () => {
    expect(() => {
      CryptoUtil.decrypt('invalid', 'invalid', 'invalid');
    }).toThrow();
  });
});
```

### Integration Tests

```typescript
// ✅ Test entire flows
describe('Auth Flow', () => {
  it('should complete signup -> login -> verify token flow', async () => {
    // Signup
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@test.com', password: 'Pass123!', name: 'Test' });
    expect(signupRes.status).toBe(201);

    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'Pass123!' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data).toHaveProperty('accessToken');

    // Use token
    const profileRes = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);
    expect(profileRes.status).toBe(200);
  });
});
```

### Test Coverage

Required coverage:
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

```bash
npm run test:coverage
```

---

## Security Considerations

### Reporting Security Issues

**Do not** create public issues for security vulnerabilities.

Email security@wistaar.com with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Review

All PRs are reviewed for:

- SQL injection vulnerabilities
- XSS/CSRF attack vectors
- Authentication bypass
- Authorization flaws
- Sensitive data exposure
- Insecure deserialization
- Broken encryption
- Hardcoded secrets
- Outdated dependencies

### Secure Development

Always:
- Use parameterized queries (Prisma)
- Validate all inputs with Zod
- Sanitize HTML with DOMPurify
- Hash passwords with bcrypt
- Encrypt sensitive data with AES-256-GCM
- Use HTTPS only
- Set security headers (Helmet)
- Log security events
- Never commit secrets

---

## Performance Standards

### Benchmarks

- Response time: < 500ms (p95)
- Database query: < 100ms
- File upload: < 5s for 50MB
- Authentication: < 200ms

### Optimization

Before PR submission:

1. **Profile if database heavy**
   ```bash
   npm run profile
   ```

2. **Check for N+1 queries**
   ```typescript
   // ❌ BAD - N+1
   const books = await prisma.book.findMany();
   for (const book of books) {
     book.author = await prisma.user.findUnique({ where: { id: book.authorId } });
   }

   // ✅ GOOD
   const books = await prisma.book.findMany({
     include: { author: true }
   });
   ```

3. **Cache appropriately**
   ```typescript
   const cached = await cache.get(key);
   if (cached) return cached;
   
   const result = await expensiveOperation();
   await cache.set(key, result, 3600); // 1 hour
   return result;
   ```

---

## Documentation Standards

### Code Comments

```typescript
// ✅ Good - explains why, not what
// Retry with exponential backoff for transient failures
const retryWithBackoff = async (fn: () => Promise<T>, maxAttempts = 3) => {
  // implementation
};

// ❌ Bad - states obvious
// Increment counter
counter++;
```

### JSDoc

```typescript
/**
 * Encrypts plaintext data using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @returns Encrypted data with IV and auth tag
 * @throws Error if encryption fails
 * @example
 * const result = CryptoUtil.encrypt('secret');
 * // { encrypted: 'abc123...', iv: 'def456...', tag: 'ghi789...' }
 */
static encrypt(plaintext: string): EncryptionResult {
  // implementation
}
```

### README Updates

When adding features, update:
- Quick start section
- Feature list
- API endpoints
- Configuration options
- Dependencies

### Changelog (.CHANGELOG.md)

Format:
```markdown
## [Version] - YYYY-MM-DD

### Added
- New feature description

### Changed
- Breaking change description

### Fixed
- Bug fix description

### Security
- Security fix description
```

---

## Getting Help

### Questions?

- Create GitHub discussion
- Ask in Discord community
- Email community@wistaar.com

### Issues?

- Search existing issues first
- Create detailed issue with:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Environment info (Node version, OS, etc.)
  - Error messages/logs

### Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)

---

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Community discussions

Thank you for contributing! 🙏

---

**Last Updated**: January 2025
**Version**: 1.0.0
