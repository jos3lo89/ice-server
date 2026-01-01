import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(values: CreateUserDto) {
    const existing = await this.prisma.users.findFirst({
      where: { OR: [{ username: values.username }, { dni: values.dni }] },
    });

    if (existing) {
      throw new ConflictException('El nombre de usuario o el DNI ya existen');
    }

    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(values.password, salt);

      const newUser = await this.prisma.users.create({
        data: {
          name: values.name,
          username: values.username,
          role: values.role,
          dni: values.dni,
          password_hash: passwordHash,
        },
        select: { id: true, name: true, username: true, role: true, dni: true },
      });

      return {
        success: true,
        message: 'Usuario creado exitosamente',
        data: {
          user: newUser,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error creando usuario ${values.username}: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        'Error interno al crear el usuario',
      );
    }
  }

  async findAll() {
    try {
      const allUsers = await this.prisma.users.findMany({
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          is_active: true,
        },
      });

      return {
        success: true,
        message: 'Lista de usuarios obtenida exitosamente',
        data: {
          users: allUsers,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error obteniendo la lista de usuarios: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error interno al obtener la lista de usuarios',
      );
    }
  }

  async setFloors(userId: string, floorIds: string[]) {
    try {
      const updatedFloors = await this.prisma.$transaction(async (tx) => {
        await tx.user_floors.deleteMany({ where: { user_id: userId } });

        await tx.user_floors.createMany({
          data: floorIds.map((floorId) => ({
            user_id: userId,
            floor_id: floorId,
          })),
        });

        return await tx.user_floors.findMany({
          where: { user_id: userId },
          select: {
            floor: { select: { id: true, name: true, level: true } },
          },
        });
      });

      return {
        success: true,
        message: 'Pisos asignados correctamente',
        data: { updatedFloors },
      };
    } catch (error) {
      this.logger.error(
        `Error asignando pisos al usuario ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error interno al asignar pisos');
    }
  }

  async updateStatus(id: string, is_active: boolean) {
    try {
      await this.prisma.users.update({
        where: { id },
        data: { is_active },
      });

      return {
        success: true,
        message: is_active ? 'Usuario activado' : 'Usuario desactivado',
        data: null,
      };
    } catch (error) {
      this.logger.error(
        `Error actualizando estado del usuario ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error interno al actualizar el estado del usuario',
      );
    }
  }
}
