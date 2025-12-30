import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, LoginPinDto } from './dto/login.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { type Response } from 'express';
import { type CurrentUserI } from 'src/common/interfaces/userActive.interface';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Valida credenciales y emite una Cookie HttpOnly con el JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso y cookie establecida.',
  })
  @ApiResponse({ status: 401, description: 'Contraseña incorrecta.' })
  @ApiResponse({ status: 404, description: 'El usuario no existe.' })
  async login(
    @Body() body: LoginDto,
    @Res({
      passthrough: true,
    })
    res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.login(body);

    this.setCookies(res, accessToken, refreshToken);

    return {
      success: true,
      data: {
        user,
      },
      message: 'Inicio de sesión exitoso',
    };
  }

  @Post('login/pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión mediante PIN',
    description:
      'Acceso rápido para personal operativo. Valida el PIN y establece cookies de Access y Refresh Token.',
  })
  @ApiBody({ type: LoginPinDto })
  @ApiResponse({
    status: 200,
    description:
      'Autenticación exitosa. Se han emitido los tokens de acceso y actualización.',
  })
  @ApiResponse({
    status: 401,
    description: 'PIN incorrecto o usuario inactivo.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno al generar la sesión.',
  })
  async loginPin(
    @Body() body: LoginPinDto,
    @Res({
      passthrough: true,
    })
    res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.loginPin(body);

    this.setCookies(res, accessToken, refreshToken);

    return {
      success: true,
      data: {
        user,
      },
      message: 'Inicio de sesión exitoso',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar sesión',
    description: 'Elimina la cookie de sesión del navegador.',
  })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente.' })
  logout(@Res({ passthrough: true }) res: Response) {
    const isProduction = this.config.get<string>('APP_ENV') === 'production';
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
    });

    return {
      success: true,
      data: {
        message: 'Sesión cerrada',
      },
    };
  }

  @Get('me')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Perfil del usuario actual',
    description:
      'Retorna los datos del usuario autenticado, sus pisos asignados y si tiene una caja abierta.',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos obtenidos correctamente.',
  })
  @ApiResponse({ status: 401, description: 'No autorizado / Sesión expirada.' })
  me(@CurrentUser() user: CurrentUserI) {
    return this.authService.me(user.sub);
  }

  @Patch('change-password')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar contraseña del usuario',
    description:
      'Permite al usuario autenticado cambiar su contraseña actual por una nueva, previa validación de identidad.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada con éxito',
    schema: {
      example: {
        success: true,
        data: { message: 'Contraseña actualizada' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'La contraseña actual no coincide con nuestros registros.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Los datos enviados no son válidos (ej: contraseña nueva muy corta).',
  })
  changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentUser() user: CurrentUserI,
  ) {
    return this.authService.changePassword(body, user.sub);
  }

  private setCookies(res: Response, access: string, refresh: string) {
    const isProduction = this.config.get<string>('APP_ENV') === 'production';

    res.cookie('access_token', access, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('refresh_token', refresh, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
