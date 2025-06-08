import { Queue } from 'bullmq';

export const notificationQueue = new Queue('notifications', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});
