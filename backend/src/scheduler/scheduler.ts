import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { notificationQueue } from "../queue/notificationQueue";

const prisma = new PrismaClient();

export function startScheduler() {
  // 🕐 Every minute
  cron.schedule("* * * * *", async () => {
    const now = new Date();

    const dueNotifications = await prisma.scheduledNotification.findMany({
      where: {
        sendAt: { lte: now },
        status: "pending",
      },
    });

    for (const notif of dueNotifications) {
      // ✅ Add with retry options
      await notificationQueue.add(
        "send",
        {
          to: notif.to,
          channel: notif.channel,
          message: notif.message,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 10000,
          },
        }
      );

      // ✅ Mark as queued
      await prisma.scheduledNotification.update({
        where: { id: notif.id },
        data: { status: "queued" },
      });

      console.log(`Scheduled notification ${notif.id} queued at ${now}`);
    }
  });
}
