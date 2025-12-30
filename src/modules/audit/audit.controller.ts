import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto';

@ApiTags('Gestión de Auditoría')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}
  @Get('logs')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Logs de auditoría',
    description:
      'Obtiene logs de auditoría con filtros. Limitado a 100 registros más recientes. Solo ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs de auditoría',
  })
  async getLogs(@Query() queryDto: AuditLogsQueryDto) {
    const result = await this.auditService.getLogs(queryDto);
    return {
      success: true,
      data: result,
    };
  }

  @Get('entity/:type/:id')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Historial de entidad',
    description:
      'Obtiene el historial completo de cambios de una entidad específica. Solo ADMIN.',
  })
  @ApiParam({
    name: 'type',
    description: 'Tipo de entidad',
    example: 'orders',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la entidad',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de la entidad',
  })
  async getEntityHistory(
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.auditService.getEntityHistory(type, id);
    return {
      success: true,
      data: result,
    };
  }

  @Get('user/:userId')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Acciones de usuario',
    description:
      'Obtiene todas las acciones realizadas por un usuario con estadísticas. Solo ADMIN.',
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Límite de resultados',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Acciones del usuario',
  })
  async getUserActions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const result = await this.auditService.getUserActions(userId, limit || 50);
    return {
      success: true,
      data: result,
    };
  }

  @Get('statistics')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Estadísticas de auditoría',
    description:
      'Obtiene estadísticas generales de auditoría de los últimos N días. Solo ADMIN.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Número de días',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de auditoría',
  })
  async getStatistics(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    const result = await this.auditService.getStatistics(days || 7);
    return {
      success: true,
      data: result,
    };
  }
}
