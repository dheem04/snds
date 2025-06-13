import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';

const prisma = new PrismaClient();
const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';

    // Base filters
    const userFilter = isAdmin ? {} : { userId };

    // Get date range (default to last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Total notifications sent
    const totalNotifications = await prisma.notificationLog.count({
      where: {
        ...userFilter,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Success rate
    const successfulNotifications = await prisma.notificationLog.count({
      where: {
        ...userFilter,
        status: 'success',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const successRate = totalNotifications > 0 ? (successfulNotifications / totalNotifications) * 100 : 0;

    // Notifications by channel
    const notificationsByChannel = await prisma.notificationLog.groupBy({
      by: ['channel'],
      where: {
        ...userFilter,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // Notifications by status
    const notificationsByStatus = await prisma.notificationLog.groupBy({
      by: ['status'],
      where: {
        ...userFilter,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // Daily notifications (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyNotifications = await Promise.all(
      last7Days.map(async (date) => {
        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const count = await prisma.notificationLog.count({
          where: {
            ...userFilter,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        return { date, count };
      })
    );

    // Recent failed notifications
    const recentFailures = await prisma.notificationLog.findMany({
      where: {
        ...userFilter,
        status: 'failed',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        to: true,
        channel: true,
        error: true,
        createdAt: true,
      },
    });

    // Scheduled notifications count
    const scheduledCount = await prisma.scheduledNotification.count({
      where: {
        ...userFilter,
        status: 'pending',
      },
    });

    // Templates count
    const templatesCount = await prisma.notificationTemplate.count({
      where: {
        ...userFilter,
        isActive: true,
      },
    });

    res.json({
      summary: {
        totalNotifications,
        successRate: Math.round(successRate * 100) / 100,
        scheduledCount,
        templatesCount,
      },
      charts: {
        notificationsByChannel: notificationsByChannel.map(item => ({
          channel: item.channel,
          count: item._count.id,
        })),
        notificationsByStatus: notificationsByStatus.map(item => ({
          status: item.status,
          count: item._count.id,
        })),
        dailyNotifications,
      },
      recentFailures,
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed analytics
router.get('/detailed', 
  authenticateToken,
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'SUPER_ADMIN';
      const userFilter = isAdmin ? {} : { userId };

      const { startDate, endDate, channel, status } = req.query;

      // Build filters
      const filters: any = { ...userFilter };
      
      if (startDate && endDate) {
        filters.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }
      
      if (channel) {
        filters.channel = channel;
      }
      
      if (status) {
        filters.status = status;
      }

      // Get paginated results
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        prisma.notificationLog.findMany({
          where: filters,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            user: {
              select: { name: true, email: true },
            },
            template: {
              select: { name: true },
            },
            campaign: {
              select: { name: true },
            },
          },
        }),
        prisma.notificationLog.count({ where: filters }),
      ]);

      res.json({
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Detailed analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get system health (admin only)
router.get('/health', 
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    try {
      // Get latest health checks
      const healthChecks = await prisma.systemHealth.findMany({
        orderBy: { checkedAt: 'desc' },
        take: 20,
      });

      // Group by service
      const serviceHealth = healthChecks.reduce((acc, check) => {
        if (!acc[check.service]) {
          acc[check.service] = [];
        }
        acc[check.service].push(check);
        return acc;
      }, {} as Record<string, any[]>);

      // Get current status for each service
      const currentStatus = Object.keys(serviceHealth).map(service => {
        const latest = serviceHealth[service][0];
        return {
          service,
          status: latest.status,
          responseTime: latest.responseTime,
          lastChecked: latest.checkedAt,
          error: latest.errorMessage,
        };
      });

      res.json({
        currentStatus,
        history: serviceHealth,
      });
    } catch (error) {
      console.error('Health analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get API usage statistics (admin only)
router.get('/api-usage',
  authenticateToken,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  async (req: AuthRequest, res: express.Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;
      
      const filters: any = {};
      if (startDate && endDate) {
        filters.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      // Usage by endpoint
      const usageByEndpoint = await prisma.apiUsage.groupBy({
        by: ['endpoint', 'method'],
        where: filters,
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 20,
      });

      // Usage by user
      const usageByUser = await prisma.apiUsage.groupBy({
        by: ['userId'],
        where: {
          ...filters,
          userId: { not: null },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      });

      // Get user details for top users
      const topUserIds = usageByUser.map(u => u.userId).filter(Boolean);
      const users = await prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: { id: true, name: true, email: true },
      });

      const usageWithUserDetails = usageByUser.map(usage => ({
        ...usage,
        user: users.find(u => u.id === usage.userId),
      }));

      res.json({
        usageByEndpoint: usageByEndpoint.map(item => ({
          endpoint: `${item.method} ${item.endpoint}`,
          count: item._count.id,
        })),
        usageByUser: usageWithUserDetails,
      });
    } catch (error) {
      console.error('API usage analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;