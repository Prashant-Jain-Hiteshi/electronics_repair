import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import sequelize from './config/database';
import './models'; // initialize models and associations
import { createServer } from 'http';
import { initSocket } from './socket';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function start() {
  try {
    // Test DB connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync models (adjust as needed: { alter: true } in dev, avoid in prod)
    const alter = process.env.NODE_ENV === 'development';
    await sequelize.sync({ alter });
    console.log('All models were synchronized successfully.');

    const server = createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
    process.exit(1);
  }
}

start();
