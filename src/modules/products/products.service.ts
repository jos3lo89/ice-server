import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { area_preparacion } from 'src/generated/prisma/enums';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  AdjustStockDto,
  ToggleAvailabilityDto,
} from './dto/product-operations.dto';
import { CreateVariantGroupDto } from './dto/variant.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const category = await this.prisma.categories.findUnique({
      where: { id: createProductDto.category_id },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (!category.is_active) {
      throw new BadRequestException(
        'No se puede crear un producto en una categoría inactiva',
      );
    }

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

      return {
        succes: true,
        message: 'Producto creado exitosamente',
        data: product,
      };
    } catch (error) {
      this.logger.error(`Error al crear producto ${productData.name}: `, error);
      throw new InternalServerErrorException('Error interno al crear producto');
    }
  }

  async findAll() {
    try {
      const products = await this.prisma.products.findMany({
        where: { is_active: true },
        omit: {
          created_at: true,
          updated_at: true,
          afectacion_igv: true,
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
                where: { is_active: true },
                orderBy: { display_order: 'asc' },
                omit: {
                  created_at: true,
                },
              },
            },
            omit: {
              created_at: true,
              updated_at: true,
            },
          },
        },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
      });

      return {
        success: true,
        message: 'Productos obtenidos exitosamente',
        data: products.map((product) => ({
          ...product,
          price: parseFloat(product.price.toString()),
          cost: parseFloat(product.cost.toString()),
          has_variants: product.variant_groups.length > 0,
          variant_groups: product.variant_groups.map((group) => ({
            ...group,
            options: group.options.map((option) => ({
              ...option,
              price_modifier: parseFloat(option.price_modifier.toString()),
            })),
          })),
        })),
      };
    } catch (error) {
      this.logger.error('Error al obtener productos: ', error);
      throw new InternalServerErrorException(
        'Error interno al obtener productos',
      );
    }
  }

  async findByCategory(categoryId: string) {
    const category = await this.prisma.categories.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    try {
      const products = await this.prisma.products.findMany({
        where: {
          category_id: categoryId,
          is_active: true,
        },
        omit: {
          created_at: true,
          updated_at: true,
          afectacion_igv: true,
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
                where: { is_active: true },
                orderBy: { display_order: 'asc' },
                omit: {
                  created_at: true,
                },
              },
            },
            omit: {
              created_at: true,
              updated_at: true,
            },
          },
        },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
      });

      return {
        success: true,
        message: `Productos de la categoría ${category.name} obtenidos exitosamente`,
        data: products.map((product) => ({
          ...product,
          price: parseFloat(product.price.toString()),
          cost: parseFloat(product.cost.toString()),
          has_variants: product.variant_groups.length > 0,
          variant_groups: product.variant_groups.map((group) => ({
            ...group,
            options: group.options.map((option) => ({
              ...option,
              price_modifier: parseFloat(option.price_modifier.toString()),
            })),
          })),
        })),
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener productos de la categoría ${categoryId}: `,
        error,
      );
      throw new InternalServerErrorException(
        'Error interno al obtener productos de la categoría',
      );
    }
  }

  async findByArea(area: area_preparacion) {
    try {
      const products = await this.prisma.products.findMany({
        where: {
          area_preparacion: area,
          is_active: true,
        },
        omit: {
          created_at: true,
          updated_at: true,
          afectacion_igv: true,
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
                where: { is_active: true },
                orderBy: { display_order: 'asc' },
                omit: {
                  created_at: true,
                },
              },
            },
            omit: {
              created_at: true,
              updated_at: true,
            },
          },
        },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
      });

      return {
        success: true,
        message: `Productos del área ${area} obtenidos exitosamente`,
        data: products.map((product) => ({
          ...product,
          price: parseFloat(product.price.toString()),
          cost: parseFloat(product.cost.toString()),
          has_variants: product.variant_groups.length > 0,
          variant_groups: product.variant_groups.map((group) => ({
            ...group,
            options: group.options.map((option) => ({
              ...option,
              price_modifier: parseFloat(option.price_modifier.toString()),
            })),
          })),
        })),
      };
    } catch (error) {
      this.logger.error(`Error al obtener productos del área ${area}: `, error);
      throw new InternalServerErrorException(
        'Error interno al obtener productos del área',
      );
    }
  }

  async findFeatured() {
    try {
      const products = await this.prisma.products.findMany({
        where: {
          is_featured: true,
          is_active: true,
          is_available: true,
        },
        omit: {
          created_at: true,
          updated_at: true,
          afectacion_igv: true,
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
                where: { is_active: true },
                orderBy: { display_order: 'asc' },
                omit: {
                  created_at: true,
                },
              },
            },
            omit: {
              created_at: true,
              updated_at: true,
            },
          },
        },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
        take: 20,
      });

      return {
        success: true,
        message: 'Productos destacados obtenidos exitosamente',
        data: products.map((product) => ({
          ...product,
          price: parseFloat(product.price.toString()),
          cost: parseFloat(product.cost.toString()),
          has_variants: product.variant_groups.length > 0,
          variant_groups: product.variant_groups.map((group) => ({
            ...group,
            options: group.options.map((option) => ({
              ...option,
              price_modifier: parseFloat(option.price_modifier.toString()),
            })),
          })),
        })),
      };
    } catch (error) {
      this.logger.error('Error al obtener productos destacados: ', error);
      throw new InternalServerErrorException(
        'Error interno al obtener productos destacados',
      );
    }
  }

  async findOne(id: string) {
    const product = await this.prisma.products.findUnique({
      where: { id },
      omit: {
        created_at: true,
        updated_at: true,
        afectacion_igv: true,
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
              where: { is_active: true },
              orderBy: { display_order: 'asc' },
              omit: { created_at: true },
            },
          },
          orderBy: { display_order: 'asc' },
          omit: {
            created_at: true,
            updated_at: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID "${id}" no encontrado`);
    }

    return {
      success: true,
      message: 'Producto obtenido exitosamente',
      data: {
        ...product,
        price: parseFloat(product.price.toString()),
        cost: parseFloat(product.cost.toString()),
        has_variants: product.variant_groups.length > 0,
        variant_groups: product.variant_groups.map((group) => ({
          ...group,
          options: group.options.map((option) => ({
            ...option,
            price_modifier: parseFloat(option.price_modifier.toString()),
          })),
        })),
      },
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const existingProduct = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException('Producto no encontrado');
    }

    // TODO: verificar si la cetegoria viene desde en cliente o es null
    if (updateProductDto.category_id) {
      const category = await this.prisma.categories.findUnique({
        where: { id: updateProductDto.category_id },
      });

      if (!category) {
        throw new NotFoundException('Categoría con ID no encontrada');
      }

      if (!category.is_active) {
        throw new BadRequestException(
          'No se puede asignar una categoría inactiva',
        );
      }
    }

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

        omit: {
          created_at: true,
          updated_at: true,
          afectacion_igv: true,
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
                where: { is_active: true },
                orderBy: { display_order: 'asc' },
                omit: {
                  created_at: true,
                },
              },
            },
            omit: {
              created_at: true,
              updated_at: true,
            },
            orderBy: { display_order: 'asc' },
          },
        },
      });

      return {
        success: true,
        message: 'Producto actualizado exitosamente',
        data: {
          ...product,
          price: parseFloat(product.price.toString()),
          cost: parseFloat(product.cost.toString()),
          has_variants: product.variant_groups.length > 0,
          variant_groups: product.variant_groups.map((group) => ({
            ...group,
            options: group.options.map((option) => ({
              ...option,
              price_modifier: parseFloat(option.price_modifier.toString()),
            })),
          })),
        },
      };
    } catch (error) {
      this.logger.error(`Error al actualizar producto ${id}: `, error);
      throw new InternalServerErrorException(
        'Error interno al actualizar producto',
      );
    }
  }

  async togglState(id: string, state: boolean) {
    const product = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    try {
      await this.prisma.products.update({
        where: { id },
        data: { is_active: state, is_available: state },
      });

      return {
        success: true,
        message: `Producto ${state ? 'activado' : 'desactivado'} exitosamente`,
        data: null,
      };
    } catch (error) {
      this.logger.error(
        `Error al cambiar el estado del producto ${id}: `,
        error,
      );
      throw new InternalServerErrorException(
        'Error interno al cambiar el estado del producto',
      );
    }
  }

  async adjustStock(id: string, adjustStockDto: AdjustStockDto) {
    const product = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
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

    try {
      await this.prisma.products.update({
        where: { id },
        data: { stock_actual: newStock },
      });

      return {
        success: true,
        message: 'Stock ajustado exitosamente',
        data: {
          product_id: product.id,
          product_name: product.name,
          previous_stock: previousStock,
          new_stock: newStock,
          adjustment: adjustStockDto.quantity,
          reason: adjustStockDto.reason || 'Sin razón especificada',
          adjusted_at: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Error al ajustar stock del producto ${id}: `, error);
      throw new InternalServerErrorException('Error interno al ajustar stock');
    }
  }

  async toggleAvailability(id: string, toggleDto: ToggleAvailabilityDto) {
    const product = await this.prisma.products.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    try {
      const updated = await this.prisma.products.update({
        where: { id },
        data: { is_available: toggleDto.is_available },
        omit: {
          created_at: true,
          updated_at: true,
          afectacion_igv: true,
        },
      });

      return updated;
    } catch (error) {
      this.logger.error(
        `Error al cambiar disponibilidad del producto ${id}: `,
        error,
      );
      throw new InternalServerErrorException(
        'Error interno al cambiar disponibilidad',
      );
    }
  }

  async addVariantGroup(
    productId: string,
    variantGroupDto: CreateVariantGroupDto,
  ) {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    try {
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

      const { data } = await this.findOne(productId);
      return {
        success: true,
        message: `Grupo de variantes "${variantGroupDto.name}" agregado exitosamente`,
        data,
      };
    } catch (error) {
      this.logger.error(
        `Error al crear grupo de variantes para producto ${productId}: `,
        error,
      );
      throw new InternalServerErrorException(
        'Error interno al crear grupo de variantes',
      );
    }
  }

  async removeVariantGroup(productId: string, groupId: string) {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const variantGroup = await this.prisma.variant_groups.findUnique({
      where: { id: groupId, product_id: productId },
    });

    if (!variantGroup) {
      throw new NotFoundException('Grupo de variantes no encontrado');
    }
    try {
      await this.prisma.variant_groups.delete({
        where: { id: groupId },
      });

      const { data } = await this.findOne(productId);

      return {
        success: true,
        message: `Grupo de variantes "${variantGroup.name}" eliminado exitosamente`,
        data,
      };
    } catch (error) {
      this.logger.error(
        `Error al eliminar grupo de variantes ${groupId} del producto ${productId}: `,
        error,
      );
      throw new InternalServerErrorException(
        'Error interno al eliminar grupo de variantes',
      );
    }
  }
}
