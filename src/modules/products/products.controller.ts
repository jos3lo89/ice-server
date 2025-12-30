import {
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
import { Public } from 'src/common/decorators/public.decorator';

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
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Listar productos',
    description: 'Obtiene todos los productos activos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos',
  })
  async findAll() {
    return this.productsService.findAll();
  }

  @Get('category/:categoryId')
  @Public()
  @ApiOperation({
    summary: 'Productos por categoría',
    description: 'Obtiene todos los productos de una categoría específica',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'UUID de la categoría',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos de la categoría',
  })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  async findByCategory(@Param('categoryId', ParseUUIDPipe) categoryId: string) {
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
    @Param('area', new ParseEnumPipe(area_preparacion)) area: area_preparacion,
  ) {
    return this.productsService.findByArea(area);
  }

  @Get('featured')
  @Public()
  @ApiOperation({
    summary: 'Productos destacados',
    description: 'Obtiene los productos marcados como destacados',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos destacados',
  })
  async findFeatured() {
    return this.productsService.findFeatured();
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Obtener producto por ID',
    description: 'Obtiene el detalle completo de un producto con sus variantes',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle del producto',
  })
  @ApiResponse({ status: 400, description: 'UUID inválido' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
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
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto actualizado',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 409, description: 'Código de producto duplicado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
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
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock ajustado',
  })
  @ApiResponse({
    status: 400,
    description: 'Stock insuficiente o producto sin gestión de stock',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
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
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidad actualizada',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async toggleAvailability(
    @Param('id', ParseUUIDPipe) id: string,
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
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Grupo de variantes agregado',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async addVariantGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() variantGroupDto: CreateVariantGroupDto,
  ) {
    return this.productsService.addVariantGroup(id, variantGroupDto);
  }

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
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'groupId',
    description: 'UUID del grupo de variantes',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Grupo de variantes eliminado',
    schema: {
      example: {
        success: true,
        data: { message: 'Grupo de variantes "Extras" eliminado exitosamente' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Producto o grupo de variantes no encontrado',
  })
  async removeVariantGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<{ message: string }> {
    return this.productsService.removeVariantGroup(id, groupId);
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactivar producto',
    description: 'Desactiva un producto (soft delete). Solo ADMIN.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto desactivado',
    schema: {
      example: {
        success: true,
        data: { message: 'Producto "Lomo Saltado" desactivado exitosamente' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.productsService.remove(id);
  }
}
