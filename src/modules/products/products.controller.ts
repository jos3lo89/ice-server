import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';
import { area_preparacion } from 'src/generated/prisma/enums';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  AdjustStockDto,
  ToggleAvailabilityDto,
} from './dto/product-operations.dto';
import { CreateVariantGroupDto } from './dto/variant.dto';
import { CreateProductDto } from './dto/create-product.dto';

@ApiTags('Gestión de productos')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Crear producto',
    description: 'Crea un nuevo producto con sus variantes. Solo ADMIN.',
  })
  @ApiResponse({
    status: 201,
    description: 'Producto creado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 409, description: 'Código de producto duplicado' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Listar productos',
    description: 'Obtiene todos los productos activos',
  })
  @ApiResponse({
    status: 200,
    description: 'Productos obtenidos exitosamente',
  })
  findAll() {
    return this.productsService.findAll();
  }

  @Get('category/:categoryId')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Productos por categoría',
    description: 'Obtiene todos los productos de una categoría específica',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'UUID de la categoría',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Productos de la categoría obtenidos exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  findByCategory(
    @Param(
      'categoryId',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID de la categoría no es válido.');
        },
      }),
    )
    categoryId: string,
  ) {
    return this.productsService.findByCategory(categoryId);
  }

  @Get('area/:area')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Productos por área de preparación',
    description:
      'Obtiene productos filtrados por área (COCINA, BAR, BEBIDAS, CAJA)',
  })
  @ApiParam({
    name: 'area',
    enum: area_preparacion,
    description: 'Área de preparación',
    example: 'COCINA',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos del área',
  })
  async findByArea(
    @Param(
      'area',
      new ParseEnumPipe(area_preparacion, {
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException(
            'El área de preparación no es válida.',
          );
        },
      }),
    )
    area: area_preparacion,
  ) {
    return this.productsService.findByArea(area);
  }

  @Get('featured')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Productos destacados',
    description: 'Obtiene los productos marcados como destacados',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos destacados',
  })
  findFeatured() {
    return this.productsService.findFeatured();
  }

  @Get(':id')
  @Auth(Role.ADMIN, Role.BARTENDER, Role.CAJERO, Role.COCINERO, Role.MESERO)
  @ApiOperation({
    summary: 'Obtener producto por ID',
    description: 'Obtiene el detalle completo de un producto con sus variantes',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto obtenido exitosamente',
  })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findOne(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID del producto no es válido.');
        },
      }),
    )
    id: string,
  ) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Actualizar producto',
    description: 'Actualiza los datos de un producto existente. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto actualizado',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 409, description: 'Código de producto duplicado' })
  async update(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID del producto no es válido.');
        },
      }),
    )
    id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id/deactivate')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactivar producto',
    description: 'Desactiva un producto (soft delete). Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto desactivado',
    schema: {
      example: {
        success: true,
        message: 'Producto desactivado exitosamente',
        data: null,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  deactivate(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID del producto no es válido.');
        },
      }),
    )
    id: string,
  ) {
    return this.productsService.togglState(id, false);
  }

  @Delete(':id/activate')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activar producto',
    description: 'Activa un producto. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto activado',
    schema: {
      example: {
        success: true,
        message: 'Producto activado exitosamente',
        data: null,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  activate(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID del producto no es válido.');
        },
      }),
    )
    id: string,
  ) {
    return this.productsService.togglState(id, true);
  }

  @Patch(':id/stock')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Ajustar stock',
    description:
      'Ajusta el stock del producto (positivo para agregar, negativo para restar). ADMIN y CAJERO.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock ajustado',
  })
  @ApiResponse({
    status: 400,
    description: 'Stock inválido o producto sin gestión de stock',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  adjustStock(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID del producto no es válido.');
        },
      }),
    )
    id: string,
    @Body() adjustStockDto: AdjustStockDto,
  ) {
    return this.productsService.adjustStock(id, adjustStockDto);
  }

  @Patch(':id/toggle-availability')
  @Auth(Role.ADMIN, Role.CAJERO)
  @ApiOperation({
    summary: 'Cambiar disponibilidad',
    description:
      'Activa o desactiva la disponibilidad del producto para venta. ADMIN y CAJERO.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad actualizada',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  toggleAvailability(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID del producto no es válido.');
        },
      }),
    )
    id: string,
    @Body() toggleDto: ToggleAvailabilityDto,
  ) {
    return this.productsService.toggleAvailability(id, toggleDto);
  }

  @Post(':id/variants')
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary: 'Agregar grupo de variantes',
    description: 'Agrega un nuevo grupo de variantes al producto. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: 'uuid-v4-123',
  })
  @ApiResponse({
    status: 201,
    description: 'Grupo de variantes agregado',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  addVariantGroup(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID del producto no es válido.');
        },
      }),
    )
    id: string,
    @Body() variantGroupDto: CreateVariantGroupDto,
  ) {
    return this.productsService.addVariantGroup(id, variantGroupDto);
  }

  // TODO: verficar si se elimina cuando existe el foreign key
  @Delete(':id/variants/:groupId')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar grupo de variantes',
    description: 'Elimina un grupo de variantes del producto. Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: 'uuid-v4-123',
  })
  @ApiParam({
    name: 'groupId',
    description: 'UUID del grupo de variantes',
    example: 'uuid-v4-456',
  })
  @ApiResponse({
    status: 200,
    description: 'Grupo de variantes eliminado',
  })
  @ApiResponse({
    status: 404,
    description: 'Producto o grupo de variantes no encontrado',
  })
  removeVariantGroup(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException('El ID del producto no es válido.');
        },
      }),
    )
    id: string,
    @Param(
      'groupId',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory() {
          return new BadRequestException(
            'El ID del grupo de variantes no es válido.',
          );
        },
      }),
    )
    groupId: string,
  ) {
    return this.productsService.removeVariantGroup(id, groupId);
  }
}
