import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const router = express.Router();

// Helper function to extract variables from template content
function extractVariables(content: string, subject?: string): string[] {
  const variableRegex = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();
  
  // Extract from content
  let match;
  while ((match = variableRegex.exec(content)) !== null) {
    variables.add(match[1]);
  }
  
  // Extract from subject if provided
  if (subject) {
    variableRegex.lastIndex = 0; // Reset regex
    while ((match = variableRegex.exec(subject)) !== null) {
      variables.add(match[1]);
    }
  }
  
  return Array.from(variables);
}

// Get all templates for user
router.get('/', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { channel, isActive } = req.query;

    const filters: any = { userId };
    if (channel) filters.channel = channel;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const templates = await prisma.notificationTemplate.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            notificationLogs: true,
            scheduledNotifications: true,
          },
        },
      },
    });

    res.json(templates);
  } catch (error) {
    console.error('Templates fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single template
router.get('/:id', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const templateId = parseInt(req.params.id);
    const userId = req.user!.id;

    const template = await prisma.notificationTemplate.findFirst({
      where: { id: templateId, userId },
      include: {
        _count: {
          select: {
            notificationLogs: true,
            scheduledNotifications: true,
          },
        },
      },
    });

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json(template);
  } catch (error) {
    console.error('Template fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create template
router.post('/',
  authenticateToken,
  [
    body('name').isLength({ min: 1 }).trim(),
    body('channel').isIn(['email', 'sms', 'in-app']),
    body('content').isLength({ min: 1 }),
    body('subject').optional().isString(),
    body('variables').optional().isArray(),
  ],
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, channel, content, subject, variables } = req.body;
    const userId = req.user!.id;

    try {
      // Check if template name already exists for user
      const existingTemplate = await prisma.notificationTemplate.findFirst({
        where: { name, userId },
      });

      if (existingTemplate) {
        res.status(400).json({ error: 'Template name already exists' });
        return;
      }

      // Auto-extract variables from content and subject
      const extractedVariables = extractVariables(content, subject);

      const template = await prisma.notificationTemplate.create({
        data: {
          userId,
          name,
          channel,
          content,
          subject: channel === 'email' ? subject : null,
          variables: variables || extractedVariables,
        },
      });

      res.status(201).json({
        message: 'Template created successfully',
        template,
      });
    } catch (error) {
      console.error('Template creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update template
router.put('/:id',
  authenticateToken,
  [
    body('name').optional().isLength({ min: 1 }).trim(),
    body('content').optional().isLength({ min: 1 }),
    body('subject').optional().isString(),
    body('variables').optional().isArray(),
    body('isActive').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const templateId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { name, content, subject, variables, isActive } = req.body;

    try {
      // Check if template exists and belongs to user
      const existingTemplate = await prisma.notificationTemplate.findFirst({
        where: { id: templateId, userId },
      });

      if (!existingTemplate) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      // Check if new name conflicts with existing template
      if (name && name !== existingTemplate.name) {
        const nameConflict = await prisma.notificationTemplate.findFirst({
          where: { name, userId, id: { not: templateId } },
        });

        if (nameConflict) {
          res.status(400).json({ error: 'Template name already exists' });
          return;
        }
      }

      const updatedTemplate = await prisma.notificationTemplate.update({
        where: { id: templateId },
        data: {
          ...(name && { name }),
          ...(content && { content }),
          ...(subject !== undefined && { subject }),
          ...(variables && { variables }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.json({
        message: 'Template updated successfully',
        template: updatedTemplate,
      });
    } catch (error) {
      console.error('Template update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete template
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const templateId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Check if template exists and belongs to user
    const template = await prisma.notificationTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    // Check if template is being used
    const usageCount = await prisma.notificationLog.count({
      where: { templateId },
    });

    if (usageCount > 0) {
      // Soft delete by marking as inactive
      await prisma.notificationTemplate.update({
        where: { id: templateId },
        data: { isActive: false },
      });

      res.json({ message: 'Template deactivated (has usage history)' });
    } else {
      // Hard delete if no usage
      await prisma.notificationTemplate.delete({
        where: { id: templateId },
      });

      res.json({ message: 'Template deleted successfully' });
    }
  } catch (error) {
    console.error('Template deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Preview template with variables
router.post('/:id/preview',
  authenticateToken,
  [
    body('variables').optional().isObject(),
  ],
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const templateId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { variables = {} } = req.body;

    try {
      const template = await prisma.notificationTemplate.findFirst({
        where: { id: templateId, userId },
      });

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      // Simple variable replacement
      let previewContent = template.content;
      let previewSubject = template.subject;

      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        previewContent = previewContent.replace(new RegExp(placeholder, 'g'), variables[key]);
        if (previewSubject) {
          previewSubject = previewSubject.replace(new RegExp(placeholder, 'g'), variables[key]);
        }
      });

      res.json({
        content: previewContent,
        subject: previewSubject,
        channel: template.channel,
      });
    } catch (error) {
      console.error('Template preview error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Send notification using template
router.post('/:id/send',
  authenticateToken,
  [
    body('to').isString().notEmpty(),
    body('variables').optional().isObject(),
    body('sendAt').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const templateId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { to, variables = {}, sendAt } = req.body;

    try {
      const template = await prisma.notificationTemplate.findFirst({
        where: { id: templateId, userId, isActive: true },
      });

      if (!template) {
        res.status(404).json({ error: 'Template not found or inactive' });
        return;
      }

      // Process template content
      let processedContent = template.content;
      let processedSubject = template.subject;

      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), variables[key]);
        if (processedSubject) {
          processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), variables[key]);
        }
      });

      // Import notification queue
      const { notificationQueue } = await import('../queue/notificationQueue');

      if (sendAt) {
        // Schedule notification
        await prisma.scheduledNotification.create({
          data: {
            userId,
            to,
            channel: template.channel,
            message: processedContent,
            subject: processedSubject,
            templateId,
            sendAt: new Date(sendAt),
          },
        });

        res.status(202).json({ 
          status: 'scheduled', 
          sendAt,
          templateUsed: template.name 
        });
      } else {
        // Send immediately
        await notificationQueue.add(
          'send',
          {
            userId,
            to,
            channel: template.channel,
            message: processedContent,
            subject: processedSubject,
            templateId,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 10000,
            },
          }
        );

        res.status(202).json({ 
          status: 'queued',
          templateUsed: template.name 
        });
      }
    } catch (error) {
      console.error('Template send error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;