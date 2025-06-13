import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { notificationQueue } from "../queue/notificationQueue";

const prisma = new PrismaClient();

export function startScheduler() {
  console.log('📅 Scheduler started - checking for due notifications every minute');
  
  // Check for due notifications every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      const dueNotifications = await prisma.scheduledNotification.findMany({
        where: {
          sendAt: { lte: now },
          status: "pending",
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          template: {
            select: { id: true, name: true },
          },
          campaign: {
            select: { id: true, name: true },
          },
        },
      });

      if (dueNotifications.length > 0) {
        console.log(`📅 Found ${dueNotifications.length} due notifications to process`);
      }

      for (const notif of dueNotifications) {
        try {
          // Add to queue with retry options
          await notificationQueue.add(
            "send",
            {
              userId: notif.userId,
              to: notif.to,
              channel: notif.channel,
              message: notif.message,
              subject: notif.subject,
              templateId: notif.templateId,
              campaignId: notif.campaignId,
              metadata: notif.metadata,
            },
            {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 10000,
              },
            }
          );

          // Mark as queued
          await prisma.scheduledNotification.update({
            where: { id: notif.id },
            data: { status: "queued" },
          });

          console.log(`📅 Scheduled notification ${notif.id} queued for ${notif.to} (${notif.channel})`);
          
        } catch (error) {
          console.error(`❌ Failed to queue scheduled notification ${notif.id}:`, error);
          
          // Mark as failed
          await prisma.scheduledNotification.update({
            where: { id: notif.id },
            data: { status: "failed" },
          });
        }
      }
    } catch (error) {
      console.error('❌ Scheduler error:', error);
    }
  });

  // Check for completed campaigns every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const runningCampaigns = await prisma.notificationCampaign.findMany({
        where: { status: "running" },
        include: {
          _count: {
            select: {
              notificationLogs: true,
              scheduledNotifications: {
                where: { status: { in: ["pending", "queued"] } },
              },
            },
          },
        },
      });

      for (const campaign of runningCampaigns) {
        // Check if all notifications for this campaign are processed
        const pendingCount = campaign._count.scheduledNotifications;
        const totalSent = campaign.successCount + campaign.failureCount;
        
        if (pendingCount === 0 && totalSent >= campaign.totalRecipients) {
          await prisma.notificationCampaign.update({
            where: { id: campaign.id },
            data: {
              status: "completed",
              completedAt: new Date(),
            },
          });
          
          console.log(`🎯 Campaign "${campaign.name}" completed: ${campaign.successCount} successful, ${campaign.failureCount} failed`);
        }
      }
    } catch (error) {
      console.error('❌ Campaign completion check error:', error);
    }
  });

  // Cleanup old logs every day at 2 AM
  cron.schedule("0 2 * * *", async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Delete old notification logs (keep last 30 days)
      const deletedLogs = await prisma.notificationLog.deleteMany({
        where: {
          createdAt: { lt: thirtyDaysAgo },
          status: { in: ["success", "failed"] }, // Don't delete pending ones
        },
      });

      // Delete old scheduled notifications that are completed
      const deletedScheduled = await prisma.scheduledNotification.deleteMany({
        where: {
          createdAt: { lt: thirtyDaysAgo },
          status: { in: ["sent", "failed", "cancelled"] },
        },
      });

      console.log(`🧹 Cleanup completed: ${deletedLogs.count} logs, ${deletedScheduled.count} scheduled notifications deleted`);
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  });
}
