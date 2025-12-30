import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { PrismaClientKnownRequestError } from 'src/generated/prisma/internal/prismaNamespace';
import { area_preparacion } from 'src/generated/prisma/enums';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  AdjustStockDto,
  ToggleAvailabilityDto,
} from './dto/product-operations.dto';
import { CreateVariantGroupDto } from './dto/variant.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    // Validar que la categoría existe y está activa
    const category = await this.prisma.categories.findUnique({
      where: { id: createProductDto.category_id },
    });

    if (!category) {
      throw new NotFoundException(
        `Categoría con ID "${createProductDto.category_id}" no encontrada`,
      );
    }

    if (!category.is_active) {
      throw new BadRequestException(
        'No se puede crear un producto en una categoría inactiva',
      );
    }

    // Validar código de producto único si se proporciona
    if (createProductDto.codigo_producto) {
      const existingCode = await this.prisma.products.findFirst({
        where: { codigo_producto: createProductDto.codigo_producto },
      });

      if (existingCode) {
        throw new ConflictException(
          `Ya existe un producto con el código "${createProductDto.codigo_producto}"`,
        );
      }
    }

    const { variant_groups, ...productData } = createProductDto;

    try {
      const product = await this.prisma.products.create({
        data: {
          ...productData,
          variant_groups: variant_groups
            ? {
                create: variant_groups.map((group) => ({
                  name: group.name,
                  is_required: group.is_required ?? false,
                  max_selections: group.max_selections,
                  display_order: group.display_order ?? 0,
                  options: {
                    create: group.options.map((option) => ({
                      name: option.name,
                      price_modifier: option.price_modifier,
                      is_default: option.is_default ?? false,
                      is_active: option.is_active ?? true,
                      display_order: option.display_order ?? 0,
                    })),
                  },
                })),
              }
            : undefined,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          variant_groups: {
            include: {
              options: {
                orderBy: { display_order: 'asc' },
              },
            },
            orderBy: { display_order: 'asc' },
          },
        },
      });

      return product;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Ya existe un producto con estos datos únicos',
          );
        }
      }
      throw error;
    }
  }

  async findAll() {
    const products = await this.prisma.products.findMany({
      where: { is_active: true },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variant_groups: {
          select: { id: true },
        },
      },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      short_name: product.short_name,
      price: product.price,
      image_path: product.image_path,
      area_preparacion: product.area_preparacion,
      is_available: product.is_available,
      is_featured: product.is_featured,
      category: product.category,
      has_variants: product.variant_groups.length > 0,
    }));
  }
  async findByCategory(categoryId: string) {
    // Validar que la categoría existe
    const category = await this.prisma.categories.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Categoría con ID "${categoryId}" no encontrada`,
      );
    }

    const products = await this.prisma.products.findMany({
      where: {
        category_id: categoryId,
        is_active: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variant_groups: {
          select: { id: true },
        },
      },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      short_name: product.short_name,
      price: product.price,
      image_path: product.image_path,
      area_preparacion: product.area_preparacion,
      is_available: product.is_available,
      is_featured: product.is_featured,
      category: product.category,
      has_variants: product.variant_groups.length > 0,
    }));
  }

  async findByArea(area: area_preparacion) {
    const products = await this.prisma.products.findMany({
      where: {
        area_preparacion: area,
        is_active: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variant_groups: {
          select: { id: true },
        },
      },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      short_name: product.short_name,
      price: product.price,
      image_path: product.image_path,
      area_preparacion: product.area_preparacion,
      is_available: product.is_available,
      is_featured: product.is_featured,
      category: product.category,
      has_variants: product.variant_groups.length > 0,
    }));
  }

  async findFeatured() {
    const products = await this.prisma.products.findMany({
      where: {
        is_featured: true,
        is_active: true,
        is_available: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variant_groups: {
          select: { id: true },
        },
      },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
      take: 20, // Límite de productos destacados
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      short_name: product.short_name,
      price: product.price,
      image_path: product.image_path,
      area_preparacion: product.area_preparacion,
      is_available: product.is_available,
      is_featured: product.is_featured,
      category: product.category,
      has_variants: product.variant_groups.length > 0,
    }));
  }

  async findOne(id: string) {
    const product = await this.prisma.products.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        variant_groups: {
          include: {
            options: {
              where: { is_active: true },
              orderBy: { display_order: 'asc' },
            },
          },
          orderBy: { display_order: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID "${id}" no encontrado`);
    }

    return product;
  }
  async update(id: string, updateProductDto: UpdateProductDto) {
    // Verificar que el producto existe
    const existingProduct = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException(`Producto con ID "${id}" no encontrado`);
    }

    // Si se cambia la categoría, validar que existe y está activa
    if (updateProductDto.category_id) {
      const category = await this.prisma.categories.findUnique({
        where: { id: updateProductDto.category_id },
      });

      if (!category) {
        throw new NotFoundException(
          `Categoría con ID "${updateProductDto.category_id}" no encontrada`,
        );
      }

      if (!category.is_active) {
        throw new BadRequestException(
          'No se puede asignar una categoría inactiva',
        );
      }
    }

    // Validar código de producto único si se cambia
    if (
      updateProductDto.codigo_producto &&
      updateProductDto.codigo_producto !== existingProduct.codigo_producto
    ) {
      const existingCode = await this.prisma.products.findFirst({
        where: {
          codigo_producto: updateProductDto.codigo_producto,
          id: { not: id },
        },
      });

      if (existingCode) {
        throw new ConflictException(
          `Ya existe un producto con el código "${updateProductDto.codigo_producto}"`,
        );
      }
    }

    try {
      const product = await this.prisma.products.update({
        where: { id },
        data: updateProductDto,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          variant_groups: {
            include: {
              options: {
                where: { is_active: true },
                orderBy: { display_order: 'asc' },
              },
            },
            orderBy: { display_order: 'asc' },
          },
        },
      });

      return product;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Ya existe un producto con estos datos únicos',
          );
        }
      }
      throw error;
    }
  }

  async adjustStock(id: string, adjustStockDto: AdjustStockDto) {
    const product = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID "${id}" no encontrado`);
    }

    if (!product.is_stock_managed) {
      throw new BadRequestException(
        'Este producto no tiene gestión de stock activada',
      );
    }

    const previousStock = product.stock_actual;
    const newStock = previousStock + adjustStockDto.quantity;

    if (newStock < 0) {
      throw new BadRequestException(
        `Stock insuficiente. Stock actual: ${previousStock}, intentando ajustar: ${adjustStockDto.quantity}`,
      );
    }

    await this.prisma.products.update({
      where: { id },
      data: { stock_actual: newStock },
    });

    return {
      product_id: product.id,
      product_name: product.name,
      previous_stock: previousStock,
      new_stock: newStock,
      adjustment: adjustStockDto.quantity,
      reason: adjustStockDto.reason || 'Sin razón especificada',
      adjusted_at: new Date(),
    };
  }

  async toggleAvailability(id: string, toggleDto: ToggleAvailabilityDto) {
    const product = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID "${id}" no encontrado`);
    }

    const updated = await this.prisma.products.update({
      where: { id },
      data: { is_available: toggleDto.is_available },
    });

    return updated;
  }

  async addVariantGroup(
    productId: string,
    variantGroupDto: CreateVariantGroupDto,
  ) {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(
        `Producto con ID "${productId}" no encontrado`,
      );
    }

    await this.prisma.variant_groups.create({
      data: {
        product_id: productId,
        name: variantGroupDto.name,
        is_required: variantGroupDto.is_required ?? false,
        max_selections: variantGroupDto.max_selections,
        display_order: variantGroupDto.display_order ?? 0,
        options: {
          create: variantGroupDto.options.map((option) => ({
            name: option.name,
            price_modifier: option.price_modifier,
            is_default: option.is_default ?? false,
            is_active: option.is_active ?? true,
            display_order: option.display_order ?? 0,
          })),
        },
      },
    });

    return this.findOne(productId);
  }

  async removeVariantGroup(productId: string, groupId: string) {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(
        `Producto con ID "${productId}" no encontrado`,
      );
    }

    const variantGroup = await this.prisma.variant_groups.findUnique({
      where: { id: groupId, product_id: productId },
    });

    if (!variantGroup) {
      throw new NotFoundException(
        `Grupo de variantes con ID "${groupId}" no encontrado`,
      );
    }

    await this.prisma.variant_groups.delete({
      where: { id: groupId },
    });

    return {
      message: `Grupo de variantes "${variantGroup.name}" eliminado exitosamente`,
    };
  }

  async remove(id: string): Promise<{ message: string }> {
    const product = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID "${id}" no encontrado`);
    }

    await this.prisma.products.update({
      where: { id },
      data: { is_active: false, is_available: false },
    });

    return {
      message: `Producto "${product.name}" desactivado exitosamente`,
    };
  }
}
