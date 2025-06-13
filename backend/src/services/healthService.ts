import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../utils/redis';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

const prisma = new PrismaClient();

export class HealthService {
  private static instance: HealthService;

  public static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  async checkDatabaseHealth(): Promise<{ status: string; responseTime: number; error?: string }> {
    const startTime = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;
      return { status: 'healthy', responseTime };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return { 
        status: 'down', 
        responseTime, 
        error: error.message 
      };
    }
  }

  async checkRedisHealth(): Promise<{ status: string; responseTime: number; error?: string }> {
    const startTime = Date.now();
    try {
      await redisConnection.ping();
      const responseTime = Date.now() - startTime;
      return { status: 'healthy', responseTime };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return { 
        status: 'down', 
        responseTime, 
        error: error.message 
      };
    }
  }

  async checkEmailHealth(): Promise<{ status: string; responseTime: number; error?: string }> {
    const startTime = Date.now();
    try {
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.verify();
      const responseTime = Date.now() - startTime;
      return { status: 'healthy', responseTime };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return { 
        status: 'down', 
        responseTime, 
        error: error.message 
      };
    }
  }

  async checkSmsHealth(): Promise<{ status: string; responseTime: number; error?: string }> {
    const startTime = Date.now();
    try {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );

      // Just check if we can authenticate with Twilio
      await client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch();
      const responseTime = Date.now() - startTime;
      return { status: 'healthy', responseTime };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return { 
        status: 'down', 
        responseTime, 
        error: error.message 
      };
    }
  }

  async performHealthCheck(): Promise<void> {
    const checks = [
      { service: 'database', check: () => this.checkDatabaseHealth() },
      { service: 'redis', check: () => this.checkRedisHealth() },
      { service: 'email', check: () => this.checkEmailHealth() },
      { service: 'sms', check: () => this.checkSmsHealth() },
    ];

    for (const { service, check } of checks) {
      try {
        const result = await check();
        await prisma.systemHealth.create({
          data: {
            service,
            status: result.status,
            responseTime: result.responseTime,
            errorMessage: result.error || null,
          },
        });
      } catch (error: any) {
        console.error(`Health check failed for ${service}:`, error);
        await prisma.systemHealth.create({
          data: {
            service,
            status: 'down',
            responseTime: 0,
            errorMessage: error.message,
          },
        });
      }
    }
  }

  async getSystemStatus(): Promise<Record<string, any>> {
    // Get latest health check for each service
    const services = ['database', 'redis', 'email', 'sms'];
    const status: Record<string, any> = {};

    for (const service of services) {
      const latest = await prisma.systemHealth.findFirst({
        where: { service },
        orderBy: { checkedAt: 'desc' },
      });

      status[service] = latest || { status: 'unknown', responseTime: null };
    }

    return status;
  }

  async cleanupOldHealthRecords(): Promise<void> {
    // Keep only last 1000 records per service
    const services = ['database', 'redis', 'email', 'sms'];
    
    for (const service of services) {
      const records = await prisma.systemHealth.findMany({
        where: { service },
        orderBy: { checkedAt: 'desc' },
        skip: 1000,
        select: { id: true },
      });

      if (records.length > 0) {
        await prisma.systemHealth.deleteMany({
          where: {
            id: { in: records.map(r => r.id) },
          },
        });
      }
    }
  }
}