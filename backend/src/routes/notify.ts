import express from "express";
import { body, validationResult } from "express-validator";
import { notificationQueue } from "../queue/notificationQueue";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, authenticateApiKey, AuthRequest } from "../middleware/auth";
import { notificationLimiter } from "../middleware/rateLimiter";

const prisma = new PrismaClient();
const router = express.Router();

// Middleware to authenticate either via JWT or API key
const authenticate = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'];

  if (authHeader) {
    return authenticateToken(req, res, next);
  } else if (apiKey) {
    return authenticateApiKey(req, res, next);
  } else {
    return res.status(401).json({ error: 'Authentication required. Provide either Authorization header or x-api-key header.' });
  }
};

// Send notification
router.post(
  "/",
  notificationLimiter,
  authenticate,
  [
    body("to").isString().notEmpty(),
    body("channel").isIn(["email", "sms", "in-app"]),
    body("message").isString().notEmpty(),
    body("subject").optional().isString(),
    body("sendAt").optional().isISO8601(),
    body("templateId").optional().isInt(),
    body("metadata").optional().isObject(),
  ],
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { to, channel, message, subject, sendAt, templateId, metadata } = req.body;
    const userId = req.user!.id;

    try {
      // Validate template if provided
      if (templateId) {
        const template = await prisma.notificationTemplate.findFirst({
          where: { id: templateId, userId, isActive: true },
        });

        if (!template) {
          res.status(400).json({ error: 'Invalid template or template not found' });
          return;
        }

        if (template.channel !== channel) {
          res.status(400).json({ error: 'Template channel mismatch' });
          return;
        }
      }

      if (sendAt) {
        // Schedule notification
        const scheduled = await prisma.scheduledNotification.create({
          data: {
            userId,
            to,
            channel,
            message,
            subject: channel === 'email' ? subject : null,
            templateId,
            sendAt: new Date(sendAt),
            metadata,
          },
        });

        res.status(202).json({ 
          status: "scheduled", 
          sendAt,
          id: scheduled.id
        });
      } else {
        // Send immediately
        await notificationQueue.add(
          "send",
          { 
            userId,
            to, 
            channel, 
            message,
            subject: channel === 'email' ? subject : null,
            templateId,
            metadata
          },
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 10000,
            },
          }
        );
        res.status(202).json({ status: "queued" });
      }
    } catch (error) {
      console.error('Notification send error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Send bulk notifications
router.post(
  "/bulk",
  notificationLimiter,
  authenticate,
  [
    body("recipients").isArray({ min: 1, max: 100 }),
    body("channel").isIn(["email", "sms", "in-app"]),
    body("message").isString().notEmpty(),
    body("subject").optional().isString(),
    body("templateId").optional().isInt(),
    body("sendAt").optional().isISO8601(),
  ],
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { recipients, channel, message, subject, templateId, sendAt } = req.body;
    const userId = req.user!.id;

    try {
      // Validate template if provided
      if (templateId) {
        const template = await prisma.notificationTemplate.findFirst({
          where: { id: templateId, userId, isActive: true },
        });

        if (!template) {
          res.status(400).json({ error: 'Invalid template or template not found' });
          return;
        }

        if (template.channel !== channel) {
          res.status(400).json({ error: 'Template channel mismatch' });
          return;
        }
      }

      if (sendAt) {
        // Schedule bulk notifications
        const scheduledNotifications = await Promise.all(
          recipients.map((to: string) =>
            prisma.scheduledNotification.create({
              data: {
                userId,
                to,
                channel,
                message,
                subject: channel === 'email' ? subject : null,
                templateId,
                sendAt: new Date(sendAt),
              },
            })
          )
        );

        res.status(202).json({ 
          status: "scheduled", 
          sendAt,
          count: scheduledNotifications.length,
          ids: scheduledNotifications.map(n => n.id)
        });
      } else {
        // Send immediately
        const jobs = recipients.map((to: string) =>
          notificationQueue.add(
            "send",
            { 
              userId,
              to, 
              channel, 
              message,
              subject: channel === 'email' ? subject : null,
              templateId
            },
            {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 10000,
              },
            }
          )
        );

        await Promise.all(jobs);
        res.status(202).json({ 
          status: "queued",
          count: recipients.length
        });
      }
    } catch (error) {
      console.error('Bulk notification send error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get notification status
router.get(
  "/status/:id",
  authenticate,
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;

      // Check in notification logs first
      const log = await prisma.notificationLog.findFirst({
        where: { id: notificationId, userId },
      });

      if (log) {
        res.json({
          id: log.id,
          status: log.status,
          to: log.to,
          channel: log.channel,
          error: log.error,
          attempt: log.attempt,
          deliveredAt: log.deliveredAt,
          readAt: log.readAt,
          createdAt: log.createdAt,
        });
        return;
      }

      // Check in scheduled notifications
      const scheduled = await prisma.scheduledNotification.findFirst({
        where: { id: notificationId, userId },
      });

      if (scheduled) {
        res.json({
          id: scheduled.id,
          status: scheduled.status,
          to: scheduled.to,
          channel: scheduled.channel,
          sendAt: scheduled.sendAt,
          createdAt: scheduled.createdAt,
        });
        return;
      }

      res.status(404).json({ error: 'Notification not found' });
    } catch (error) {
      console.error('Notification status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Cancel scheduled notification
router.delete(
  "/scheduled/:id",
  authenticate,
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;

      const scheduled = await prisma.scheduledNotification.findFirst({
        where: { id: notificationId, userId, status: 'pending' },
      });

      if (!scheduled) {
        res.status(404).json({ error: 'Scheduled notification not found or cannot be cancelled' });
        return;
      }

      await prisma.scheduledNotification.update({
        where: { id: notificationId },
        data: { status: 'cancelled' },
      });

      res.json({ message: 'Scheduled notification cancelled successfully' });
    } catch (error) {
      console.error('Cancel notification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
