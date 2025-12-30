import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(values: CreateUserDto) {
    const existing = await this.prisma.users.findFirst({
      where: { OR: [{ username: values.username }, { dni: values.dni }] },
    });

    if (existing) {
      throw new ConflictException('El username o DNI ya existen');
    }

    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(values.password, salt);

      const newUser = await this.prisma.users.create({
        data: {
          name: values.name,
          dni: values.dni,
          username: values.username,
          role: values.role,
          pin: values.pin,
          password_hash: passwordHash,
        },
        select: { id: true, name: true, username: true, role: true, dni: true },
      });

      return newUser;
    } catch (error) {
      throw new InternalServerErrorException('Error al crear el usuario');
    }
  }

  async findAll() {
    const allUsers = await this.prisma.users.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        is_active: true,
      },
    });

    return allUsers;
  }

  async setFloors(userId: string, floorIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.user_floors.deleteMany({ where: { user_id: userId } });

      return tx.user_floors.createMany({
        data: floorIds.map((floorId) => ({
          user_id: userId,
          floor_id: floorId,
        })),
      });
    });
  }

  async updateStatus(id: string, is_active: boolean) {
    return this.prisma.users.update({
      where: { id },
      data: { is_active },
    });
  }
}
