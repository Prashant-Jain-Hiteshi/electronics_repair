import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import sequelize from './config/database';
import { DataTypes } from 'sequelize';
import { PaymentKind, PaymentProvider } from './models/Payment';
import './models'; // initialize models and associations
import { createServer } from 'http';
import { initSocket } from './socket';
// Reverted: Time Tracking & Bench Utilization background jobs
// import { startBackgroundJobs } from './jobs/scheduler';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  try {
    // Test DB connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Ensure required columns exist before syncing indexes (hotfix for environments where alter=false)
    try {
      const qi = sequelize.getQueryInterface();
      const ensure = async (table: string, col: string, def: any) => {
        const desc = await qi.describeTable(table as any).catch(() => ({} as any));
        if (!desc || !desc[col]) {
          console.log(`Adding missing column ${table}.${col} ...`);
          await qi.addColumn(table as any, col as any, def as any).catch((e: any) => {
            console.warn(`addColumn(${table}.${col}) warning:`, e?.message || e);
          });
        }
      };

      // inventory_usage safety columns
      await ensure('inventory_usage', 'barcode', { type: 'VARCHAR(255)', allowNull: true });
      await ensure('inventory_usage', 'status', { type: 'VARCHAR(32)', allowNull: true });
      await ensure('inventory_usage', 'reservedQty', { type: 'INTEGER', allowNull: true });
      await ensure('inventory_usage', 'pickedAt', { type: 'TIMESTAMP', allowNull: true });
      await ensure('inventory_usage', 'consumedAt', { type: 'TIMESTAMP', allowNull: true });
      await ensure('inventory_usage', 'cancelledAt', { type: 'TIMESTAMP', allowNull: true });

      // repair_orders QA/Checklist columns to avoid insert failures
      await ensure('repair_orders', 'checklist', { type: (sequelize as any).Sequelize?.JSONB || (sequelize as any).Sequelize?.JSON || 'JSONB', allowNull: true });
      await ensure('repair_orders', 'checklistPassed', { type: 'BOOLEAN', allowNull: true });
      await ensure('repair_orders', 'checklistByUserId', { type: 'UUID', allowNull: true });
      await ensure('repair_orders', 'checklistAt', { type: 'TIMESTAMP', allowNull: true });
      await ensure('repair_orders', 'qaRequired', { type: 'BOOLEAN', allowNull: false, defaultValue: false });
      await ensure('repair_orders', 'qaApproved', { type: 'BOOLEAN', allowNull: true });
      await ensure('repair_orders', 'qaByUserId', { type: 'UUID', allowNull: true });
      await ensure('repair_orders', 'qaAt', { type: 'TIMESTAMP', allowNull: true });
      await ensure('repair_orders', 'qaNotes', { type: 'TEXT', allowNull: true });

      // payments columns that newer code expects
      // Use Sequelize DataTypes for enums for better compatibility
      await ensure('payments', 'kind', { type: DataTypes.ENUM(...Object.values(PaymentKind)) as any, allowNull: true });
      await ensure('payments', 'provider', { type: DataTypes.ENUM('manual', 'stripe', 'upi') as any, allowNull: true, defaultValue: 'manual' });
      await ensure('payments', 'currencyCode', { type: DataTypes.STRING(8) as any, allowNull: true });
      await ensure('payments', 'transactionId', { type: DataTypes.STRING as any, allowNull: true });
      await ensure('payments', 'intentId', { type: DataTypes.STRING as any, allowNull: true });
      await ensure('payments', 'linkUrl', { type: DataTypes.TEXT as any, allowNull: true });
      await ensure('payments', 'paidAt', { type: DataTypes.DATE as any, allowNull: true });
      await ensure('payments', 'notes', { type: DataTypes.TEXT as any, allowNull: true });
    } catch (preSyncErr) {
      console.warn('Pre-sync column ensure failed (continuing):', (preSyncErr as any)?.message || preSyncErr);
    }

    // Sync models (auto-alter in non-production to keep local DB in sync with models)
    const isProd = process.env.NODE_ENV === 'production';
    const alter = !isProd; // enable in dev/test/local
    await sequelize.sync({ alter });
    console.log(`All models were synchronized successfully. (alter=${alter})`);

    const server = createServer(app);
    initSocket(server);

    // Reverted: do not start background jobs
    const stopJobs = undefined as unknown as (() => void) | undefined;

    // graceful shutdown
    const shutdown = () => {
      try { stopJobs && stopJobs(); } catch {}
      server.close(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    server.listen(PORT, () => {
      const corsOrigin = process.env.CORS_ORIGIN || '*';
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Health:            http://localhost:${PORT}/health`);
      console.log(`API base (mount):  http://localhost:${PORT}/api`);
      console.log(`CORS origin:       ${corsOrigin}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
    process.exit(1);
  }
}

start();
