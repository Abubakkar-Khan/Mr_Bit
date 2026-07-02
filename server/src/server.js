import 'dotenv/config';
import app from './app.js';
import { initializeDatabase } from './config/database.js';
import { startCronJob } from './modules/automation/automation.service.js';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Initialize SQLite Database
    initializeDatabase();
    console.log('Database initialized successfully.');

    // Start Cron Job
    startCronJob();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`ASCII Man API server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
