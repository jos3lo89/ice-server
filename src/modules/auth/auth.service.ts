import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { LoginDto, LoginPinDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { CurrentUserI } from 'src/common/interfaces/userActive.interface';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(values: LoginDto) {
    const userFound = await this.prisma.users.findUnique({
      where: {
        username: values.username,
      },
      include: {
        user_floors: {
          include: {
            floor: {
              select: {
                id: true,
                name: true,
                level: true,
                is_active: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!userFound) {
      throw new NotFoundException('Usuario no econtrado');
    }

    if (!userFound.is_active) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const isPasswordValid = await bcrypt.compare(
      values.password,
      userFound.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    try {
      const payload: CurrentUserI = {
        sub: userFound.id,
        username: userFound.username,
        role: userFound.role,
        name: userFound.name,
        allowedFloorIds: userFound.user_floors.map((floor) => floor.floor.id),
      };

      const tokens = await this.generateTokens(payload);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: userFound.id,
          name: userFound.name,
          userName: userFound.username,
          role: userFound.role,
          dni: userFound.dni,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al iniciar sesión');
    }
  }

  async loginPin(values: LoginPinDto) {
    const user = await this.prisma.users.findFirst({
      where: { pin: values.pin, is_active: true },
      include: {
        user_floors: {
          include: {
            floor: {
              select: {
                id: true,
                name: true,
                level: true,
                is_active: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('PIN incorrecto');
    }

    try {
      const payload: CurrentUserI = {
        sub: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        allowedFloorIds: user.user_floors.map((floor) => floor.floor.id),
      };

      const accessToken = await this.jwtService.signAsync(payload, {
        expiresIn: '7d',
      });
      const refreshToken = await this.jwtService.signAsync(payload, {
        expiresIn: '7d',
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          userName: user.username,
          role: user.role,
          dni: user.dni,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al iniciar sesión');
    }
  }

  async me(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        dni: true,
        user_floors: {
          include: {
            floor: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        },
        cash_registers: {
          where: { status: 'ABIERTA' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        userName: user.username,
        role: user.role,
        dni: user.dni,
        floors: user.user_floors.map((f) => ({
          id: f.floor.id,
          name: f.floor.name,
          level: f.floor.level,
        })),
      },
    };
  }

  async changePassword(values: ChangePasswordDto, userId: string) {
    const userFound = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!userFound) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isMatch = await bcrypt.compare(
      values.currentPassword,
      userFound.password_hash,
    );

    if (!isMatch) {
      throw new ForbiddenException('La contraseña actual es incorrecta');
    }

    if (values.currentPassword === values.newPassword) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la anterior',
      );
    }

    try {
      const salt = await bcrypt.genSalt(10);
      const newPwdHash = await bcrypt.hash(values.newPassword, salt);

      await this.prisma.users.update({
        where: { id: userId },
        data: {
          password_hash: newPwdHash,
        },
      });

      return {
        success: true,
        message: 'Tu contraseña ha sido actualizada con éxito',
        data: null,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al cambiar al contraseña.');
    }
  }

  private async generateTokens(payload: CurrentUserI) {
    const [accessToken, refreshToken] = await Promise.all([
      await this.jwtService.signAsync(payload, {
        expiresIn: '1h',
      }),
      await this.jwtService.signAsync(payload, {
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const salt = await bcrypt.genSalt(10);
    const hashedToken = await bcrypt.hash(refreshToken, salt);
    await this.prisma.users.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        user_floors: {
          include: {
            floor: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Acceso denegado');
    }

    const tokensMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!tokensMatch) {
      throw new UnauthorizedException('Token inválido');
    }

    const payload: CurrentUserI = {
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      allowedFloorIds: user.user_floors.map((uf) => uf.floor.id),
    };

    const tokens = await this.generateTokens(payload);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { refreshToken: null },
      });

      return {
        success: true,
        message: 'Sesión cerrada correctamente en el servidor',
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al cerrar sesión');
    }
  }
}
