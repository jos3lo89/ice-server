import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Gestión del servidor')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener el estado y la conectividad de la API' })
  @ApiResponse({ status: 200, description: 'Los sistemas están operativos' })
  @ApiResponse({
    status: 500,
    description: 'Error de conexión a la base de datos',
  })
  getStatus() {
    return this.appService.getStatus();
  }
}
