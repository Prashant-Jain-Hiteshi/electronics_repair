import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import { Request, Response } from 'express';

const app = express();

// Middleware
// Disable ETag to avoid 304 Not Modified for dynamic API responses
app.set('etag', false);
// Allow images to be requested from a different origin (e.g., Vite dev server port)
// Helmet's default Cross-Origin-Resource-Policy is 'same-origin', which blocks cross-origin image loads
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  })
);

// Prevent caching for API responses to ensure fresh JSON (avoids 304 with empty body)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

// Root - Hello World
app.get('/', (_req: Request, res: Response) => {
  res.type('text/plain').send('Hello World');
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

export default app;
