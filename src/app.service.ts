import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from './core/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        app: 'Ice Mankora API',
        version: '1.0.0',
        status: 'Operational',
        database: 'Connected',
        timestamp: new Date().toISOString(),
        message: 'Welcome to Ice Mankora Management System.',
      };
    } catch (error) {
      throw new InternalServerErrorException({
        status: 'Down',
        database: 'Disconnected',
        message: 'The API is running but the database is unreachable.',
      });
    }
  }
}
