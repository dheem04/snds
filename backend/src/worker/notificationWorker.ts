import { Worker, Job } from 'bullmq';
import { sendEmail } from '../services/emailService';
import { sendSMS } from '../services/smsService';
import { sendInApp } from '../services/inAppService';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { redisConnection } from '../utils/redis';
dotenv.config();

const prisma = new PrismaClient();

const worker = new Worker(
  'notifications',
  async (job: Job) => {
    const { to, channel, message } = job.data;
    let status = 'success';
    let error: string | null = null;

    try {
      if (channel === 'email') {
        await sendEmail(to, message);
      } else if (channel === 'sms') {
        await sendSMS(to, message);
      } else if (channel === 'in-app') {
        await sendInApp(to, message);
      } else {
        throw new Error('Unknown channel');
      }
    } catch (err: any) {
      status = 'failed';
      error = err.message;
      throw err; // This triggers BullMQ to retry, if the job was added with attempts/backoff
    } finally {
      await prisma.notificationLog.create({
        data: {
          to,
          channel,
          message,
          status,
          error,
        },
      });
    }
  },
  {
    connection: redisConnection
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} has been completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with error:`, err);
});
