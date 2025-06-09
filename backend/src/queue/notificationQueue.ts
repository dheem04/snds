import { Queue } from 'bullmq';
import { redisConnection } from "../utils/redis";


export const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
});
