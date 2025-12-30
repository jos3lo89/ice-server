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
        estado: 'Operacional',
        base_datos: 'Conectada',
        timestamp: new Date().toISOString(),
        mensaje: 'Bienvenido al sistema de gestión de Ice Mankora.',
        detalles: 'Todos los servicios están funcionando correctamente.',
      };
    } catch (error) {
      throw new InternalServerErrorException({
        estado: 'Inactivo',
        base_datos: 'Desconectada',
        mensaje:
          'La API está en ejecución pero no puede acceder a la base de datos.',
        recomendacion: 'Verifique la conexión a la base de datos.',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
