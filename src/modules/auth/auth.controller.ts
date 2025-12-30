import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, LoginPinDto } from './dto/login.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { type Request, type Response } from 'express';
import { type CurrentUserI } from 'src/common/interfaces/userActive.interface';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';
import { JwtService } from '@nestjs/jwt';

@ApiTags('Gestión de Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
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
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  @ApiResponse({ status: 404, description: 'El usuario no existe.' })
  async login(
    @Body() body: LoginDto,
    @Res({
      passthrough: true,
    })
    res: Response,
  ) {
    const result = await this.authService.login(body);

    await this.authService.updateRefreshToken(
      result.user.id,
      result.refreshToken,
    );

    this.setCookies(res, result.accessToken, result.refreshToken);

    return {
      success: true,
      data: {
        user: result.user,
      },
      message: 'Inicio de sesión exitoso',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refrescar Access Token',
    description:
      'Utiliza la cookie refresh_token para emitir un nuevo set de tokens.',
  })
  @ApiResponse({ status: 200, description: 'Tokens renovados correctamente.' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado.',
  })
  async refresh(
    @Req() req: Request,
    @Res({
      passthrough: true,
    })
    res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('No hay token de refresco');
    }
    try {
      const decoded = this.jwtService.decode(refreshToken) as CurrentUserI;
      if (!decoded || !decoded.sub) throw new UnauthorizedException();

      const { accessToken, refreshToken: newRefreshToken } =
        await this.authService.refreshTokens(decoded.sub, refreshToken);

      this.setCookies(res, accessToken, newRefreshToken);
      return { success: true, message: 'Token renovado' };
    } catch (error) {
      throw new UnauthorizedException('Token de refresco inválido');
    }
  }

  @Post('login/pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión mediante PIN',
    description: 'Acceso rápido para personal operativo.',
  })
  @ApiResponse({ status: 200, description: 'Autenticación por PIN exitosa.' })
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
    const result = await this.authService.loginPin(body);
    await this.authService.updateRefreshToken(
      result.user.id,
      result.refreshToken,
    );

    this.setCookies(res, result.accessToken, result.refreshToken);

    return {
      success: true,
      data: {
        user: result.user,
      },
      message: 'Inicio de sesión exitoso',
    };
  }

  @Post('logout')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar sesión total',
    description:
      'Elimina las cookies y limpia el token de la base de datos para invalidar el acceso.',
  })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente.' })
  async logout(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: CurrentUserI,
  ) {
    await this.authService.logout(user.sub);
    const isProduction = this.config.get<string>('APP_ENV') === 'production';

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
    });

    res.clearCookie('refresh_token', {
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
