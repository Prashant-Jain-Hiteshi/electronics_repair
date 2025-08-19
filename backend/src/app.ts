import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import customersRoutes from './routes/customers.routes';
import inventoryRoutes from './routes/inventory.routes';
import repairsRoutes from './routes/repairs.routes';
import paymentsRoutes from './routes/payments.routes';
import path from 'path';

const app = express();

// Middleware
// Allow images to be requested from a different origin (e.g., Vite dev server port)
// Helmet's default Cross-Origin-Resource-Policy is 'same-origin', which blocks cross-origin image loads
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  })
);

// Root - Hello World
app.get('/', (_req, res) => {
  res.type('text/plain').send('Hello World');
});

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/repairs', repairsRoutes);
app.use('/api/payments', paymentsRoutes);

// Static: serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

export default app;
