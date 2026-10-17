import { createServer } from 'http';
import { attachLiveNotifications } from './services/liveNotifications';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';

const startServer = async () => {
  await connectDB();

  const server = createServer(app);
  attachLiveNotifications(server);
  server.listen(Number(env.PORT), '0.0.0.0', () => {
    console.log(`==================================================`);
    console.log(` Civic Complaint Backend API Server`);
    console.log(` Running on port: ${env.PORT}`);
    console.log(` Environment: ${env.NODE_ENV}`);
    console.log(` AI Microservice URL: ${env.AI_SERVICE_URL}`);
    console.log(`==================================================`);
  });
};

startServer();

