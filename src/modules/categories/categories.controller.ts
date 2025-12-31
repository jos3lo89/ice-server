import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Gestión de Categorias')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Crear categoría',
    description: 'Crea una nueva categoría. Solo ADMIN.',
  })
  @ApiResponse({
    status: 201,
    description: 'Categoría creada exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  @ApiResponse({ status: 409, description: 'Slug duplicado' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Listar categorías',
    description: 'Obtiene todas las categorías activas con conteo de productos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorías',
  })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get('tree')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Árbol jerárquico de categorías',
    description:
      'Obtiene la estructura jerárquica completa de categorías con subcategorías',
  })
  @ApiResponse({
    status: 200,
    description: 'Árbol de categorías',
  })
  findTree() {
    return this.categoriesService.findTree();
  }

  @Get('slug/:slug')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Buscar por slug',
    description: 'Obtiene una categoría por su slug con sus productos',
  })
  @ApiParam({
    name: 'slug',
    description: 'Slug único de la categoría',
    example: 'postres',
  })
  @ApiResponse({
    status: 200,
    description: 'Categoría encontrada',
  })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Get(':id')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Obtener categoría por ID',
    description: 'Obtiene una categoría específica con sus productos',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la categoría',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Categoría encontrada',
  })
  @ApiResponse({ status: 400, description: 'UUID inválido' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  findOne(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID proporcionado no es válido.');
        },
      }),
    )
    id: string,
  ) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Actualizar categoría',
    description: 'Actualiza los datos de una categoría existente. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la categoría',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Categoría actualizada',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o UUID inválido' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 409, description: 'Slug duplicado' })
  update(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID proporcionado no es válido.');
        },
      }),
    )
    id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar categoría',
    description:
      'Desactiva una categoría (soft delete). Solo si no tiene productos o subcategorías. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la categoría',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Categoría desactivada',
    schema: {
      example: {
        success: true,
        data: { message: 'Categoría "Postres" desactivada exitosamente' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Tiene productos o subcategorías asociadas',
  })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  remove(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID proporcionado no es válido.');
        },
      }),
    )
    id: string,
  ) {
    return this.categoriesService.remove(id);
  }
}
