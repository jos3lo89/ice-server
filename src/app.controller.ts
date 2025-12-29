import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get API status and connectivity' })
  @ApiResponse({ status: 200, description: 'Systems are operational' })
  @ApiResponse({ status: 500, description: 'Database connection error' })
  getStatus() {
    return this.appService.getStatus();
  }
}
