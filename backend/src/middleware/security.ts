import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// API usage tracking middleware
export const trackApiUsage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || null;
    
    // Track API usage asynchronously
    setImmediate(async () => {
      try {
        await prisma.apiUsage.create({
          data: {
            userId,
            endpoint: req.path,
            method: req.method,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          },
        });
      } catch (error) {
        console.error('Failed to track API usage:', error);
      }
    });
  } catch (error) {
    console.error('API tracking error:', error);
  }
  
  next();
};

// Request validation middleware
export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (!req.is('application/json')) {
      return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
};