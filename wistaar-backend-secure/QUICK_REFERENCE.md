# 🚀 Quick Reference Guide

Fast reference for common development tasks and implementation patterns.

## Table of Contents

1. [Project Commands](#project-commands)
2. [Common Patterns](#common-patterns)
3. [Database Operations](#database-operations)
4. [Authentication](#authentication)
5. [Error Handling](#error-handling)
6. [Middleware](#middleware)
7. [Testing](#testing)
8. [Debugging](#debugging)
9. [Deployment](#deployment)
10. [Emergency Procedures](#emergency-procedures)

---

## Project Commands

### Development

```bash
# Start dev server with hot reload
npm run dev

# Build TypeScript
npm run build

# Run built project
npm start

# Watch mode (compilation)
npm run watch
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts
```

### Quality

```bash
# Type check without build
npm run typecheck

# Lint code
npm run lint

# Fix linting issues
npm run lint -- --fix

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix
```

### Database

```bash
# Generate Prisma client
npm run prisma:generate

# Create migration
npm run prisma:migrate -- --name AddUserTable

# Apply migrations
npm run prisma:migrate -- deploy

# Reset database (dev only!)
npm run prisma:migrate -- reset

# Open Prisma Studio
npm run prisma:studio
```

---

## Common Patterns

### Creating a New Endpoint

```typescript
// 1. Define request/response types
interface CreateBookRequest {
  title: string;
  description: string;
  price: number;
}

// 2. Create validation schema
const createBookSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(500),
    description: z.string().min(10).max(5000),
    price: z.number().positive()
  })
});

// 3. Create service method
class BookService {
  static async createBook(data: CreateBookRequest, authorId: string) {
    return prisma.book.create({
      data: {
        ...data,
        authorId,
        status: 'DRAFT'
      }
    });
  }
}

// 4. Create controller method
class BookController {
  static async create(req: AuthRequest, res: Response) {
    const { body } = req;
    const book = await BookService.createBook(body, req.userId);
    res.status(201).json({
      success: true,
      message: 'Book created',
      data: book
    });
  }
}

// 5. Register route
router.post('/books', 
  authMiddleware,
  validate(createBookSchema),
  asyncHandler(BookController.create)
);
```

### Creating a Service Class

```typescript
/**
 * NotificationService - Handle user notifications
 */
class NotificationService {
  /**
   * Create and send notification
   */
  static async send(
    userId: string,
    type: string,
    message: string,
    data?: any
  ) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          message,
          data: data ? JSON.stringify(data) : null,
          read: false
        }
      });

      // Emit real-time notification (Socket.io)
      io.to(userId).emit('notification:new', notification);

      logger.info('Notification sent', { userId, type });
      return notification;
    } catch (error) {
      logger.error('Notification creation failed', { userId, error });
      throw error;
    }
  }

  static async markRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() }
    });
  }
}
```

### Creating Middleware

```typescript
/**
 * Custom middleware that checks if user is book owner
 */
const isBookOwner = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.params.bookId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAM', details: 'bookId required' }
    });
  }

  // Fetch book and check ownership
  const book = await prisma.book.findUnique({
    where: { id: req.params.bookId }
  });

  if (!book) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  }

  if (book.authorId !== req.userId && req.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'UNAUTHORIZED' }
    });
  }

  next();
};

// Usage: router.put('/books/:bookId', isBookOwner, controller.update);
```

---

## Database Operations

### Common Queries

```typescript
// Create
const user = await prisma.user.create({
  data: { email, passwordHash, name }
});

// Read single
const user = await prisma.user.findUnique({
  where: { email }
});

// Read multiple with pagination
const books = await prisma.book.findMany({
  where: { status: 'APPROVED' },
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' }
});

// Update
const user = await prisma.user.update({
  where: { id: userId },
  data: { name: newName }
});

// Delete
await prisma.user.delete({
  where: { id: userId }
});

// Count
const total = await prisma.book.count({
  where: { authorId: userId }
});

// Upsert (update if exists, create if not)
const user = await prisma.user.upsert({
  where: { email },
  create: { email, name, passwordHash },
  update: { name }
});

// Transaction
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const notification = await tx.notification.create({
    data: { userId: user.id, message: 'Welcome!' }
  });
  return { user, notification };
});
```

### With Relations

```typescript
// Include related data
const book = await prisma.book.findUnique({
  where: { id: bookId },
  include: {
    author: true,  // Include author User object
    chapters: true, // Include all chapters
    reviews: {
      take: 5,     // Limited to 5 reviews
      orderBy: { createdAt: 'desc' }
    }
  }
});

// Select specific fields
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    name: true,
    role: true
    // passwordHash NOT included
  }
});
```

### Search & Filter

```typescript
// Search in multiple fields
const books = await prisma.book.findMany({
  where: {
    OR: [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } }
    ]
  }
});

// Range queries
const books = await prisma.book.findMany({
  where: {
    AND: [
      { price: { gte: minPrice } },
      { price: { lte: maxPrice } }
    ]
  }
});

// Filter by enum
const approvedBooks = await prisma.book.findMany({
  where: { status: BookStatus.APPROVED }
});
```

---

## Authentication

### Protected Routes

```typescript
// Single role
router.get('/admin/stats', adminOnly(), controller.getStats);

// Multiple roles
router.post('/books', requireRole('author', 'admin'), controller.create);

// Minimum role (hierarchy)
router.put('/books/:id', requireMinimumRole('author'), controller.update);
```

### Creating Tokens

```typescript
// In AuthService
const accessToken = jwt.sign(
  { userId, email, role },
  process.env.JWT_SECRET!,
  { expiresIn: '15m' }
);

const refreshToken = jwt.sign(
  { userId },
  process.env.JWT_REFRESH_SECRET!,
  { expiresIn: '7d' }
);

// Store refresh token hash in DB
const tokenHash = CryptoUtil.createSignature(refreshToken);
await prisma.refreshToken.create({
  data: { userId, token: tokenHash, expiresAt: refreshExpiry }
});
```

### Validating Tokens

```typescript
// Automatic via authMiddleware
router.get('/protected', authMiddleware, (req, res) => {
  // req.userId, req.email, req.role available
});

// Manual
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET!);
  // decoded: { userId, email, role, iat, exp }
} catch (error) {
  if (error instanceof jwt.TokenExpiredError) {
    // Handle expired token
  }
}
```

---

## Error Handling

### Throwing Errors

```typescript
// Standard AppError
throw new AppError('User not found', 404, 'USER_NOT_FOUND');

// With additional context
throw new AppError(
  'Payment processing failed',
  402,
  'PAYMENT_FAILED',
  { orderId, amount, gateway }
);

// From Prisma errors (handled automatically)
// P2002 -> 409 UNIQUE_CONSTRAINT_VIOLATION
// P2025 -> 404 RECORD_NOT_FOUND
// P2003 -> 400 FOREIGN_KEY_CONSTRAINT_ERROR
```

### In Controllers

```typescript
class BookController {
  static async create(req: AuthRequest, res: Response) {
    try {
      const book = await BookService.create(req.body, req.userId);
      res.status(201).json({
        success: true,
        message: 'Book created',
        data: book
      });
    } catch (error) {
      // asyncHandler catches and passes to errorHandler
      throw error;
    }
  }
}

// Always wrap with asyncHandler
router.post('/books', asyncHandler(BookController.create));
```

### Validation Errors

```typescript
// Zod validation errors automatically caught
// Returns 400 with detailed error messages
const data = await validate(req, { body: createBookSchema });

// Example error response:
// {
//   "success": false,
//   "error": {
//     "code": "VALIDATION_ERROR",
//     "details": [
//       { "field": "title", "message": "String must contain at least 1 character" },
//       { "field": "price", "message": "Number must be greater than 0" }
//     ]
//   }
// }
```

---

## Middleware

### Applying Middleware

```typescript
// To specific route
router.post('/books', authMiddleware, validate(schema), controller);

// To all routes in router
router.use(authMiddleware);
router.get('/profile', controller.profile);

// To specific path
app.use('/api/admin', adminOnly());

// Chaining
router.post('/update', 
  authMiddleware,
  validate(updateSchema),
  checkOwnership,
  asyncHandler(controller.update)
);
```

### Creating Custom Middleware

```typescript
// Filter middleware
const filterByStatus = (status: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.query.status = status;
    next();
  };
};

// Validation middleware
const validateUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file || req.file.size > MAX_SIZE) {
    return res.status(400).json({ error: 'File too large' });
  }
  next();
};

// Tracking middleware
const trackRequest = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', { 
      method: req.method, 
      path: req.path, 
      duration, 
      status: res.statusCode 
    });
  });
  next();
};
```

---

## Testing

### Unit Test Template

```typescript
describe('BookService', () => {
  beforeAll(async () => {
    // Setup
  });

  afterEach(async () => {
    // Cleanup
    await prisma.book.deleteMany();
  });

  it('should create a book with valid data', async () => {
    const bookData = {
      title: 'Test Book',
      description: 'A test book',
      price: 299,
      authorId: 'test-author-id'
    };

    const book = await BookService.create(bookData, 'author-id');

    expect(book).toBeDefined();
    expect(book.title).toBe('Test Book');
    expect(book.status).toBe('DRAFT');
  });

  it('should throw error if title too long', async () => {
    const longTitle = 'a'.repeat(501);
    
    expect(async () => {
      await BookService.create({
        title: longTitle,
        description: 'Test',
        price: 299,
        authorId: 'author-id'
      }, 'author-id');
    }).rejects.toThrow();
  });
});
```

### Integration Test Template

```typescript
describe('Book API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Signup and get token
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@test.com', password: 'Pass123!', name: 'Test' });
    authToken = res.body.data.accessToken;
  });

  it('should create book with valid data', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'New Book',
        description: 'Description here',
        price: 499
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
  });

  it('should reject invalid data', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: '', // Empty title
        price: -100 // Negative price
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

---

## Debugging

### Console Logging

```typescript
// ✅ Development (use structure)
logger.info('Processing payment', {
  userId,
  orderId,
  amount,
  gateway: 'razorpay'
});

// ❌ Production (use logger, not console)
console.log('Payment:', payment); // Never in production!
```

### Debugging in VS Code

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/dist/main.js",
      "preLaunchTask": "build"
    }
  ]
}
```

### Inspecting Values

```typescript
// Breakpoint + Inspect
const result = await someOperation(); // Set breakpoint here
// In debugger, type: result in console

// Debug utility
function debug<T>(label: string, value: T): T {
  console.log(`[DEBUG] ${label}:`, JSON.stringify(value, null, 2));
  return value;
}

// Usage
const book = debug('book-result', await BookService.get(id));
```

### Performance Profiling

```typescript
// Simple timer
const start = performance.now();
await database.query();
console.log(`Query took ${performance.now() - start}ms`);

// Detailed profiling
console.time('operation');
// ... code ...
console.timeEnd('operation');
```

---

## Deployment

### Pre-Deployment Checklist

```bash
# 1. Verify builds
npm run build

# 2. Run tests
npm test

# 3. Check lint
npm run lint

# 4. Audit dependencies
npm audit

# 5. Type check
npm run typecheck

# 6. Verify environment
env | grep ENCRYPTION_KEY    # Should be set
env | grep DATABASE_URL      # Should be set
env | grep JWT_SECRET        # Should be set
```

### Deployment Commands

```bash
# Docker build
docker build -t wistaar/backend:latest .

# Docker run
docker run -d \
  --name wistaar-api \
  -p 3000:3000 \
  --env-file .env.production \
  wistaar/backend:latest

# View logs
docker logs -f wistaar-api

# Stop container
docker stop wistaar-api
docker rm wistaar-api
```

### Database Migration (Production)

```bash
# Backup first
mysqldump -u root -p wistaar_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
npm run prisma:migrate -- deploy

# Verify
npm run test:integration
```

---

## Emergency Procedures

### Database Connection Lost

```typescript
// Check connection
mysql -u user -p -h host wistaar_prod -e "SELECT 1;"

// Restart database
sudo systemctl restart mysql

// If credentials wrong, update .env
DATABASE_URL="mysql://newuser:newpass@host/db"

// Test connection
npm run prisma:db -- push --skip-generate
```

### High CPU/Memory Usage

```bash
# Check Node process
top -p $(pidof node)

# Kill and restart
killall node
npm start

# Or with PM2
pm2 restart wistaar-api
pm2 logs wistaar-api
```

### Cannot Login - Account Locked

```sql
-- Check if locked
SELECT id, email, accountLocked, lockUntil FROM users WHERE email = 'user@example.com';

-- Unlock (admin)
UPDATE users 
SET accountLocked = FALSE, failedAttempts = 0, lockUntil = NULL
WHERE email = 'user@example.com';
```

### Encryption Key Lost

```bash
# ⚠️ CRITICAL: Encrypted data cannot be recovered!
# 1. Generate new key
node -e "const c = require('crypto'); console.log(c.randomBytes(32).toString('hex'))"

# 2. Update .env.production
# ENCRYPTION_KEY=<new-key>

# 3. Re-encrypt all sensitive fields
# (requires data migration script)

# 4. Restart service
pm2 restart wistaar-api
```

### Refresh Token Revocation Issue

```sql
-- Revoke all tokens for user (they'll need to login again)
UPDATE refresh_tokens 
SET revoked_at = NOW()
WHERE user_id = 'user-uuid';

-- Revoke all tokens for all users (emergency only!)
UPDATE refresh_tokens 
SET revoked_at = NOW()
WHERE revoked_at IS NULL;
```

### Memory Leak Investigation

```bash
# Generate heap snapshot
node --inspect app.js
# Open chrome://inspect and take snapshots

# Analyze with clinic
npm install -g clinic
clinic doctor -- node dist/main.js
```

---

**Last Updated**: January 2025
**Version**: 1.0.0
