import { startDeliveryWorker } from './services/resolutionDeliveryService';
import { createServer } from 'http';
import { attachLiveNotifications } from './services/liveNotifications';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { User } from './models/User';
import { Complaint } from './models/Complaint';
import { Notification } from './models/Notification';
import { SignupChallenge, SignupThrottle } from './models/SignupChallenge';
import { NotificationDelivery } from './models/NotificationDelivery';
import { emailConfigured, smsConfigured } from './services/contactDeliveryService';

const startServer = async () => {
  await connectDB();
  // Let declared unique/TTL indexes finish before accepting registration or delivery work.
  await Promise.all([User.init(), Complaint.init(), Notification.init(), SignupChallenge.init(), SignupThrottle.init(), NotificationDelivery.init()]);
  if (!emailConfigured()) console.warn('Email OTP unavailable: configure real SMTP settings in backend/.env. Development codes are never issued.');
  if (!smsConfigured()) console.warn('SMS OTP unavailable: configure Twilio credentials and an authorized sender in international format in backend/.env.');

  const server = createServer(app);
  attachLiveNotifications(server);
  if (env.DELIVERY_WORKER_ENABLED) startDeliveryWorker();
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

