import cron from 'node-cron';
import { sendAbsentNotifications, sendDailyReports } from './notification.service';

export const startNotificationScheduler = () => {
  // Send absent notifications at end of day (6 PM)
  cron.schedule('0 18 * * *', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await sendAbsentNotifications(today);
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Send daily reports to teachers (7 PM)
  cron.schedule('0 19 * * *', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await sendDailyReports(today);
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('Notification scheduler started');
};