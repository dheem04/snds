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
    const { 
      userId, 
      to, 
      channel, 
      message, 
      subject, 
      templateId, 
      campaignId, 
      metadata 
    } = job.data;
    
    let status = 'success';
    let error: string | null = null;
    let deliveredAt: Date | null = null;

    console.log(`Processing notification job ${job.id}: ${channel} to ${to}`);

    try {
      const startTime = Date.now();
      
      if (channel === 'email') {
        await sendEmail(to, message, subject);
      } else if (channel === 'sms') {
        await sendSMS(to, message);
      } else if (channel === 'in-app') {
        // For in-app notifications, use userId if available, otherwise use socket ID
        const targetId = userId ? `user_${userId}` : to;
        await sendInApp(targetId, message);
      } else {
        throw new Error(`Unknown channel: ${channel}`);
      }

      deliveredAt = new Date();
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ ${channel} notification sent to ${to} in ${responseTime}ms`);
      
      // Update campaign stats if this is part of a campaign
      if (campaignId) {
        await prisma.notificationCampaign.update({
          where: { id: campaignId },
          data: {
            successCount: { increment: 1 },
          },
        });
      }

    } catch (err: any) {
      status = 'failed';
      error = err.message;
      
      console.error(`❌ Failed to send ${channel} notification to ${to}:`, error);
      
      // Update campaign stats if this is part of a campaign
      if (campaignId) {
        await prisma.notificationCampaign.update({
          where: { id: campaignId },
          data: {
            failureCount: { increment: 1 },
          },
        });
      }
      
      throw err; // This triggers BullMQ to retry
    } finally {
      // Log the notification attempt
      try {
        await prisma.notificationLog.create({
          data: {
            userId,
            to,
            channel,
            message,
            subject,
            templateId,
            campaignId,
            status,
            error,
            attempt: job.attemptsMade + 1,
            deliveredAt,
            metadata,
          },
        });
      } catch (logError) {
        console.error('Failed to log notification:', logError);
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

worker.on('stalled', (jobId) => {
  console.warn(`⚠️ Job ${jobId} stalled`);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker gracefully');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker gracefully');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log('🔄 Notification worker started');
