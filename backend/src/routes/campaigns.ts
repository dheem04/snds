import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = express.Router();

// Get all campaigns for user
router.get('/', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { status, channel } = req.query;

    const filters: any = { userId };
    if (status) filters.status = status;
    if (channel) filters.channel = channel;

    const campaigns = await prisma.notificationCampaign.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          select: { name: true, channel: true },
        },
        _count: {
          select: {
            notificationLogs: true,
            scheduledNotifications: true,
          },
        },
      },
    });

    res.json(campaigns);
  } catch (error) {
    console.error('Campaigns fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single campaign
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const campaignId = parseInt(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.notificationCampaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        template: true,
        notificationLogs: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        _count: {
          select: {
            notificationLogs: true,
            scheduledNotifications: true,
          },
        },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    res.json(campaign);
  } catch (error) {
    console.error('Campaign fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create campaign
router.post('/',
  authenticateToken,
  [
    body('name').isLength({ min: 1 }).trim(),
    body('channel').isIn(['email', 'sms', 'in-app']),
    body('recipients').isArray({ min: 1 }),
    body('templateId').optional().isInt(),
    body('description').optional().isString(),
    body('scheduledAt').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, channel, recipients, templateId, description, scheduledAt } = req.body;
    const userId = req.user!.id;

    try {
      // Validate template if provided
      if (templateId) {
        const template = await prisma.notificationTemplate.findFirst({
          where: { id: templateId, userId, isActive: true },
        });

        if (!template) {
          res.status(400).json({ error: 'Invalid template' });
          return;
        }

        if (template.channel !== channel) {
          res.status(400).json({ error: 'Template channel mismatch' });
          return;
        }
      }

      // Check if campaign name already exists for user
      const existingCampaign = await prisma.notificationCampaign.findFirst({
        where: { name, userId },
      });

      if (existingCampaign) {
        res.status(400).json({ error: 'Campaign name already exists' });
        return;
      }

      const campaign = await prisma.notificationCampaign.create({
        data: {
          userId,
          name,
          channel,
          recipients,
          templateId,
          description,
          totalRecipients: recipients.length,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: scheduledAt ? 'scheduled' : 'draft',
        },
        include: {
          template: true,
        },
      });

      res.status(201).json({
        message: 'Campaign created successfully',
        campaign,
      });
    } catch (error) {
      console.error('Campaign creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update campaign
router.put('/:id',
  authenticateToken,
  [
    body('name').optional().isLength({ min: 1 }).trim(),
    body('recipients').optional().isArray({ min: 1 }),
    body('description').optional().isString(),
    body('scheduledAt').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const campaignId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { name, recipients, description, scheduledAt } = req.body;

    try {
      // Check if campaign exists and belongs to user
      const existingCampaign = await prisma.notificationCampaign.findFirst({
        where: { id: campaignId, userId },
      });

      if (!existingCampaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      // Only allow updates if campaign is in draft or scheduled status
      if (!['draft', 'scheduled'].includes(existingCampaign.status)) {
        res.status(400).json({ error: 'Cannot update campaign in current status' });
        return;
      }

      // Check if new name conflicts with existing campaign
      if (name && name !== existingCampaign.name) {
        const nameConflict = await prisma.notificationCampaign.findFirst({
          where: { name, userId, id: { not: campaignId } },
        });

        if (nameConflict) {
          res.status(400).json({ error: 'Campaign name already exists' });
          return;
        }
      }

      const updatedCampaign = await prisma.notificationCampaign.update({
        where: { id: campaignId },
        data: {
          ...(name && { name }),
          ...(recipients && { 
            recipients, 
            totalRecipients: recipients.length 
          }),
          ...(description !== undefined && { description }),
          ...(scheduledAt !== undefined && { 
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            status: scheduledAt ? 'scheduled' : 'draft',
          }),
        },
        include: {
          template: true,
        },
      });

      res.json({
        message: 'Campaign updated successfully',
        campaign: updatedCampaign,
      });
    } catch (error) {
      console.error('Campaign update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Start campaign
router.post('/:id/start', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const campaignId = parseInt(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.notificationCampaign.findFirst({
      where: { id: campaignId, userId },
      include: { template: true },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      res.status(400).json({ error: 'Campaign cannot be started in current status' });
      return;
    }

    if (!campaign.templateId) {
      res.status(400).json({ error: 'Campaign requires a template to start' });
      return;
    }

    // Update campaign status
    await prisma.notificationCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    // Import notification queue
    const { notificationQueue } = await import('../queue/notificationQueue');

    // Queue notifications for all recipients
    const recipients = campaign.recipients as string[];
    for (const recipient of recipients) {
      await notificationQueue.add(
        'send',
        {
          userId,
          to: recipient,
          channel: campaign.channel,
          message: campaign.template!.content,
          subject: campaign.template!.subject,
          templateId: campaign.templateId,
          campaignId: campaign.id,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        }
      );
    }

    res.json({
      message: 'Campaign started successfully',
      recipientsQueued: recipients.length,
    });
  } catch (error) {
    console.error('Campaign start error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pause campaign
router.post('/:id/pause', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const campaignId = parseInt(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.notificationCampaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.status !== 'running') {
      res.status(400).json({ error: 'Only running campaigns can be paused' });
      return;
    }

    await prisma.notificationCampaign.update({
      where: { id: campaignId },
      data: { status: 'paused' },
    });

    res.json({ message: 'Campaign paused successfully' });
  } catch (error) {
    console.error('Campaign pause error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get campaign analytics
router.get('/:id/analytics', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const campaignId = parseInt(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.notificationCampaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Get notification logs for this campaign
    const logs = await prisma.notificationLog.findMany({
      where: { campaignId },
    });

    const analytics = {
      totalSent: logs.length,
      successful: logs.filter(log => log.status === 'success').length,
      failed: logs.filter(log => log.status === 'failed').length,
      pending: logs.filter(log => log.status === 'pending').length,
      successRate: logs.length > 0 ? (logs.filter(log => log.status === 'success').length / logs.length) * 100 : 0,
      
      // Status breakdown
      statusBreakdown: logs.reduce((acc, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),

      // Recent failures
      recentFailures: logs
        .filter(log => log.status === 'failed')
        .slice(0, 10)
        .map(log => ({
          to: log.to,
          error: log.error,
          createdAt: log.createdAt,
        })),
    };

    res.json(analytics);
  } catch (error) {
    console.error('Campaign analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete campaign
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const campaignId = parseInt(req.params.id);
    const userId = req.user!.id;

    const campaign = await prisma.notificationCampaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Only allow deletion if campaign is in draft status
    if (campaign.status !== 'draft') {
      res.status(400).json({ error: 'Only draft campaigns can be deleted' });
      return;
    }

    await prisma.notificationCampaign.delete({
      where: { id: campaignId },
    });

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Campaign deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;