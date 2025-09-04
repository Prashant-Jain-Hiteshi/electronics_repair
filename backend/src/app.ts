import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { sanitizeRequest } from './middleware/sanitize';
import { defaultRateLimit } from './middleware/rateLimit';
import { requestId } from './middleware/requestId';
import { auditLogger } from './middleware/auditLogger';
import { cacheMiddleware } from './middleware/cache';
import authRoutes from './routes/auth.routes';
import customersRoutes from './routes/customers.routes';
import inventoryRoutes from './routes/inventory.routes';
import repairsRoutes from './routes/repairs.routes';
import paymentsRoutes from './routes/payments.routes';
import analyticsRoutes from './routes/analytics.routes';
import estimatesRoutes from './routes/estimates.routes';
import techniciansRoutes from './routes/technicians.routes';
import locationsRoutes from './routes/locations.routes';
import inventoryStockRoutes from './routes/inventoryStock.routes';
import stockTransfersRoutes from './routes/stockTransfers.routes';
import slaRoutes from './routes/sla.routes';
import auditRoutes from './routes/audit.routes';
import diagnosticsRoutes from './routes/diagnostics.routes';
import worklogsRoutes from './routes/worklogs.routes';
import appointmentsRoutes from './routes/appointments.routes';
import approvalsRoutes from './routes/approvals.routes';
import rmaRoutes from './routes/rma.routes';
import warrantyRoutes from './routes/warranty.routes';
import feedbackRoutes from './routes/feedback.routes';
import devicesRoutes from './routes/devices.routes';
import usersRoutes from './routes/users.routes';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

const app = express();

// Middleware
// Disable ETag to avoid 304 Not Modified for dynamic API responses
app.set('etag', false);
// Allow images to be requested from a different origin (e.g., Vite dev server port)
// Helmet's default Cross-Origin-Resource-Policy is 'same-origin', which blocks cross-origin image loads
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", 'data:', 'blob:'],
        "script-src": ["'self'", process.env.NODE_ENV !== 'production' ? "'unsafe-inline'" : "'strict-dynamic'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "connect-src": ["'self'", process.env.CORS_ORIGIN || 'http://localhost:5173'],
        "font-src": ["'self'", 'data:'],
        "frame-ancestors": ["'self'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        // upgrade-insecure-requests in prod if behind HTTPS
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
    frameguard: { action: 'deny' },
    xssFilter: true,
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  })
);
app.use(cookieParser());
app.use(express.json());
// Sanitize incoming inputs (strings) across body/query/params
app.use(sanitizeRequest());
// Determine allowed CORS origins (comma-separated). Must not be '*' when credentials: true
const corsList = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser or same-origin requests (no Origin header)
      if (!origin) return callback(null, true);
      // If list contains '*', fall back to echo the incoming origin to avoid wildcard with credentials
      if (corsList.includes('*')) return callback(null, true);
      const ok = corsList.includes(origin);
      return callback(ok ? null : new Error('CORS: origin not allowed'), ok);
    },
    credentials: true,
  })
);

// Expose debug headers to the browser (useful to see OTP/body in Network tab)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    const existing = (res.getHeader('Access-Control-Expose-Headers') as string) || '';
    const toExpose = ['X-Debug-OTP', 'X-Debug-Body', 'X-Cache', 'Retry-After', 'X-Request-Id'];
    const headerVal = Array.from(new Set((existing ? existing.split(',') : []).concat(toExpose))).filter(Boolean).join(',');
    if (headerVal) res.setHeader('Access-Control-Expose-Headers', headerVal);
  }
  next();
});

// Attach request id for correlation
app.use(requestId());

// Minimal audit log of API requests (method, path, status, duration, user)
app.use(auditLogger());

// Tap responses and mirror a truncated JSON/string body into a header so it's visible in Network > Headers
// Enabled when NODE_ENV !== 'production' OR DEBUG_EXPOSE_RESPONSES=true
const __debugExpose = (process.env.DEBUG_EXPOSE_RESPONSES === 'true') || ((process.env.NODE_ENV || 'development') !== 'production');
if (__debugExpose) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api')) return next();
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res) as typeof res.send;
    const setDebugHeader = (body: any) => {
      try {
        let text: string;
        if (typeof body === 'string') text = body;
        else text = JSON.stringify(body);
        // prevent very large headers; truncate
        const truncated = text.length > 1000 ? text.slice(0, 1000) + '…' : text;
        res.setHeader('X-Debug-Body', truncated);
      } catch {}
    };
    res.json = (body?: any) => { setDebugHeader(body); return originalJson(body); };
    const sendWrapper = (body?: any) => { setDebugHeader(body); return originalSend(body as any); };
    (res as any).send = sendWrapper;
    next();
  });
}

// Global rate limit (Redis-backed): default 100 req/min per IP+method+baseUrl
app.use(defaultRateLimit);

// CSRF protection (disabled by default in dev). Enable by setting ENABLE_CSRF=true
const ENABLE_CSRF = (process.env.ENABLE_CSRF || 'false').toLowerCase() === 'true';
if (ENABLE_CSRF) {
  // CSRF protection for state-changing requests. Use cookie-based secret and expect x-csrf-token header.
  // Skip CSRF for READ-only and explicit safe endpoints.
  const csrfProtection = csrf({ cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' } as any });
  // Issue a CSRF token via endpoint so SPA can fetch and store it in memory
  app.get('/api/csrf-token', (req, res) => {
    // Initialize session secret if not present
    try {
      // csurf will set a secret cookie automatically on first use; trigger it by calling req.csrfToken()
      // However we need middleware to be mounted; mount it temporarily for this call
      const _csrf = csrfProtection as any;
      _csrf(req, res, () => {
        const token = (req as any).csrfToken();
        res.status(200).json({ token });
      });
    } catch (e) {
      res.status(500).json({ error: { message: 'Failed to issue CSRF token' } });
    }
  });

  // Apply CSRF to API write routes
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) return next();
    const method = req.method.toUpperCase();
    const isWrite = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    if (!isWrite) return next();
    return (csrfProtection as any)(req, res, next);
  });
} else {
  // In dev without CSRF, still provide a no-op endpoint for clients expecting it
  app.get('/api/csrf-token', (_req, res) => res.status(204).end());
}

// Response cache for GET /api requests (Redis-backed)
// Varies by user (if available on req) to avoid leaking data across users
app.use(cacheMiddleware({ ttlSeconds: parseInt(process.env.API_CACHE_TTL || '30', 10), varyByUser: true }));

// Prevent caching for API responses to ensure fresh JSON (avoids 304 with empty body)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    // If cache middleware already set cache headers (X-Cache), don't override
    const usedCache = res.getHeader('X-Cache');
    if (!usedCache) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
  }
  next();
});

// Root - Hello World
app.get('/', (_req: Request, res: Response) => {
  res.type('text/plain').send('Hello World');
});

// Security.txt as per RFC 9116
app.get('/.well-known/security.txt', (_req: Request, res: Response) => {
  const contact = process.env.SECURITY_CONTACT || 'mailto:security@example.com';
  const policy = process.env.SECURITY_POLICY_URL || 'https://example.com/security-policy';
  const expires = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
  const body = [
    `Contact: ${contact}`,
    `Policy: ${policy}`,
    `Expires: ${expires}`,
    `Preferred-Languages: en`,
  ].join('\n');
  res.type('text/plain').send(body);
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/repairs', repairsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/estimates', estimatesRoutes);
app.use('/api/technicians', techniciansRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/inventory-stock', inventoryStockRoutes);
app.use('/api/stock-transfers', stockTransfersRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);
app.use('/api/worklogs', worklogsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/rma', rmaRoutes);
app.use('/api/warranty', warrantyRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/devices', devicesRoutes);

// Static: serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 404 handler for unknown routes
app.use((req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
      },
    });
  }
  return res.status(404).send('Not Found');
});

// Centralized error handler
// Ensure this stays after all routes/middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = typeof err?.status === 'number' ? err.status : 500;
  const isApi = req.path.startsWith('/api');

  // Basic structured log
  const logPayload = {
    level: status >= 500 ? 'error' : 'warn',
    ts: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    status,
    message: err?.message || 'Unhandled error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack,
  } as const;
  try {
    const line = `[${logPayload.level}] ${logPayload.ts} ${logPayload.method} ${logPayload.path} -> ${logPayload.status} :: ${logPayload.message}`;
    if (logPayload.level === 'error') console.error(line, logPayload.stack || '');
    else console.warn(line, logPayload.stack || '');
  } catch {}

  const payload = {
    error: {
      code: err?.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
      message:
        typeof err?.publicMessage === 'string'
          ? err.publicMessage
          : status >= 500
          ? 'Something went wrong. Please try again later.'
          : err?.message || 'Request error',
      details: process.env.NODE_ENV === 'production' ? undefined : err?.details || undefined,
    },
  };

  if (isApi) return res.status(status).json(payload);
  return res.status(status).type('text/plain').send(payload.error.message);
});

export default app;
