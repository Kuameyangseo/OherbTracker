import cors from 'cors';
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { z } from 'zod';
import {
  createSessionToken,
  hashPassword,
  normalizeEmail,
  requireAuth,
  requireRole,
  serializeAuthCookie,
  verifyPassword,
  verifySessionToken,
} from '@oherb-tracker/auth';
import { serverConfig } from '@oherb-tracker/config';
import { User, pingDatabase } from '@oherb-tracker/database';
import shipmentRouter from './routes/shipment.routes.js';
import trackingRouter from './routes/tracking.routes.js';
import notificationRouter from './routes/notification.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import { ShipmentError } from './services/shipment.service.js';
import { ReportError } from './services/report.service.js';
import reportRouter from './routes/report.routes.js';
import trackerIntegrationRouter from './routes/tracker-integration.routes.js';

const app = express();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  phone: z.string().trim().min(4).max(30).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

app.use(helmet());
app.use(
  cors({
    origin: serverConfig.webUrls ?? [
      serverConfig.webUrl,
      'http://localhost:3100',
      'http://127.0.0.1:3100',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  }),
);
app.options(/.*/, (_request, response) => {
  response.sendStatus(204);
});
app.use(express.json());
app.use(morgan('combined'));

app.use((request: Request, _response: Response, next: NextFunction) => {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return next();
  }

  const cookies = new Map(
    cookieHeader.split(';').map((cookie) => {
      const index = cookie.indexOf('=');
      if (index === -1) return ['', ''];
      return [cookie.slice(0, index).trim(), cookie.slice(index + 1).trim()];
    }),
  );

  const token = cookies.get(serverConfig.authCookieName);
  if (!token) {
    return next();
  }

  try {
    request.user = verifySessionToken(token, serverConfig.authSecret);
  } catch {
    // session cookie is invalid or expired; ignore silently so the route can handle unauthenticated access
  }

  return next();
});

app.get('/api/health', async (_request, response) => {
  const databaseConnected = await pingDatabase();
  response.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    data: {
      status: 'ok',
      database: databaseConnected ? 'connected' : 'disconnected',
    },
  });
});

app.post('/api/auth/register', async (request, response, next) => {
  console.log('[auth/register] request received', {
    method: request.method,
    path: request.originalUrl,
    email:
      typeof request.body?.email === 'string'
        ? request.body.email.trim().toLowerCase()
        : undefined,
  });

  const parsed = registerSchema.safeParse(request.body);

  if (!parsed.success) {
    console.error('[auth/register] validation failed', {
      method: request.method,
      path: request.originalUrl,
      issues: parsed.error.issues,
    });
    return response.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid registration payload.',
      },
    });
  }

  const email = normalizeEmail(parsed.data.email);

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.error('[auth/register] email already exists', { email });
      return response.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with that email already exists.',
        },
      });
    }

    const user = (await User.create({
      name: parsed.data.name.trim(),
      email,
      passwordHash: await hashPassword(parsed.data.password),
      role: 'CUSTOMER' as any,
      phone: parsed.data.phone?.trim() || undefined,
    })) as any;

    const token = createSessionToken(
      { id: String(user._id), email: user.email, role: user.role as any },
      serverConfig.authSecret,
    );
    response.setHeader(
      'Set-Cookie',
      serializeAuthCookie(serverConfig.authCookieName, token),
    );

    return response.status(201).json({
      success: true,
      data: {
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('[auth/register] request failed', {
      method: request.method,
      path: request.originalUrl,
      email,
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
    });
    return next(error);
  }
});

app.post('/api/auth/login', async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    console.error('[auth/login] validation failed', {
      method: request.method,
      path: request.originalUrl,
      issues: parsed.error.issues,
    });
    return response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid login payload.' },
    });
  }

  const email = normalizeEmail(parsed.data.email);
  const user = (await User.findOne({ email }).select('+passwordHash')) as any;

  if (
    !user ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  ) {
    console.error('[auth/login] invalid credentials', { email });
    return response.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      },
    });
  }

  const token = createSessionToken(
    { id: String(user._id), email: user.email, role: user.role as any },
    serverConfig.authSecret,
  );
  response.setHeader(
    'Set-Cookie',
    serializeAuthCookie(serverConfig.authCookieName, token),
  );

  return response.status(200).json({
    success: true,
    data: {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

app.post('/api/auth/logout', (_request, response) => {
  response.setHeader(
    'Set-Cookie',
    serializeAuthCookie(serverConfig.authCookieName, '', {
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: serverConfig.nodeEnv === 'production',
      path: '/',
    }),
  );

  return response
    .status(200)
    .json({ success: true, data: { loggedOut: true } });
});

app.get('/api/auth/me', requireAuth, (request, response) => {
  const user = request.user;
  if (!user) {
    return response.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
  }

  return response.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    },
  });
});

app.get('/api/auth/test', requireAuth, (request, response) => {
  response.status(200).json({ success: true, data: { user: request.user } });
});

app.get(
  '/api/auth/test/staff',
  requireAuth,
  requireRole('STAFF', 'ADMIN'),
  (request, response) => {
    response
      .status(200)
      .json({ success: true, data: { user: request.user, access: 'staff' } });
  },
);

app.get(
  '/api/auth/test/admin',
  requireAuth,
  requireRole('ADMIN'),
  (request, response) => {
    response
      .status(200)
      .json({ success: true, data: { user: request.user, access: 'admin' } });
  },
);

app.use('/api/shipments', trackingRouter);
app.use('/api/shipments', shipmentRouter);
app.use('/api/v1', trackerIntegrationRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/admin/analytics', analyticsRouter);
app.use('/api/admin/reports', reportRouter);

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Resource not found' },
  });
});

const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  console.error('[api] unhandled request error', {
    method: request.method,
    path: request.originalUrl,
    error:
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error,
  });
  if (error instanceof ShipmentError) {
    response.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }
  if (error instanceof ReportError) {
    response.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }

  response.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
  });
};

app.use(errorHandler);

export default app;
