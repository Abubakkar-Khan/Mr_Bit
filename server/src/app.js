import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import imagesRoutes from './modules/images/images.routes.js';
import asciiRoutes from './modules/ascii/ascii.routes.js';
import postsRoutes from './modules/posts/posts.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import automationRoutes from './modules/automation/automation.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/outputs', express.static(path.join(__dirname, '../data/ascii-outputs')));
app.use('/temp', express.static(path.join(__dirname, '../data/temp-images')));

// API Routes
app.use('/api/images', imagesRoutes);
app.use('/api/ascii', asciiRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/automation', automationRoutes);

// Base Route for API
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to ASCII Man API' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../../client/dist/index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('API is running in dev mode');
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

export default app;
