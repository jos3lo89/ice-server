import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PrismaClientKnownRequestError } from 'src/generated/prisma/internal/prismaNamespace';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const existingSlug = await this.prisma.categories.findFirst({
      where: { slug: createCategoryDto.slug },
    });

    if (existingSlug) {
      throw new ConflictException(
        `Ya existe una categoría con el slug "${createCategoryDto.slug}"`,
      );
    }

    let level = 0;
    if (createCategoryDto.parent_id) {
      const parent = await this.prisma.categories.findUnique({
        where: { id: createCategoryDto.parent_id },
      });

      if (!parent) {
        throw new NotFoundException(
          `Categoría padre con ID "${createCategoryDto.parent_id}" no encontrada`,
        );
      }

      if (!parent.is_active) {
        throw new BadRequestException(
          'No se puede crear una subcategoría bajo una categoría inactiva',
        );
      }

      level = parent.level + 1;
    }

    try {
      const category = await this.prisma.categories.create({
        data: {
          ...createCategoryDto,
          level,
        },
        include: {
          parent: true,
        },
      });

      return {
        succes: true,
        message: 'Categoría creada exitosamente',
        data: category,
      };
    } catch (error) {
      this.logger.error(
        `Error interno al crear categoría ${createCategoryDto.name}: ${error.message}`,
      );

      throw new InternalServerErrorException(
        'Error interno al crear la categoría',
      );
    }
  }

  async findAll() {
    try {
      const categories = await this.prisma.categories.findMany({
        where: { is_active: true },
        include: {
          _count: {
            select: { products: true },
          },
          children: {
            where: { is_active: true },
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              default_area: true,
              display_order: true,
              icon: true,
              color: true,
              level: true,
              is_active: true,
              created_at: true,
              updated_at: true,
              parent_id: true,
            },
          },
        },
        orderBy: [{ level: 'asc' }, { display_order: 'asc' }, { name: 'asc' }],
      });

      return {
        succes: true,
        message: 'Lista de categorías obtenida exitosamente',
        data: categories.map((category) => ({
          ...category,
          productsCount: category._count.products,
          children: category.children.map((child) => ({
            ...child,
            image_path: null,
          })),
        })),
      };
    } catch (error) {
      this.logger.error(
        `Error interno al obtener la lista de categorías: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Error interno al obtener la lista de categorías',
      );
    }
  }

  async findTree() {
    try {
      const categories = await this.prisma.categories.findMany({
        where: { is_active: true, parent_id: null },
        include: {
          _count: {
            select: { products: true },
          },
          children: {
            where: { is_active: true },
            include: {
              _count: {
                select: { products: true },
              },
              children: {
                where: { is_active: true },
                include: {
                  _count: {
                    select: { products: true },
                  },
                },
              },
            },
            orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
          },
        },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
      });

      return {
        succes: true,
        message: 'Árbol de categorías obtenido exitosamente',
        data: this.buildTree(categories),
      };
    } catch (error) {
      this.logger.error(
        `Error interno al obtener el árbol de categorías: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Error interno al obtener el árbol de categorías',
      );
    }
  }

  // TODO: verificar los tipos
  private buildTree(categories: any[]) {
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      default_area: category.default_area,
      productsCount: category._count.products,
      icon: category.icon,
      color: category.color,
      display_order: category.display_order,
      children: category.children
        ? this.buildTree(category.children)
        : undefined,
    }));
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.categories.findFirst({
      where: { slug, is_active: true },
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          where: { is_active: true },
          select: {
            id: true,
            name: true,
            short_name: true,
            price: true,
            is_available: true,
            is_featured: true,
            image_path: true,
            display_order: true,
          },
          orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Categoría con slug ${slug} no encontrada`);
    }

    {
      return {
        succes: true,
        message: 'Categoría obtenida exitosamente',
        data: {
          ...category,
          productsCount: category._count.products,
        },
      };
    }
  }

  async findOne(id: string) {
    const category = await this.prisma.categories.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          where: { is_active: true },
          select: {
            id: true,
            name: true,
            short_name: true,
            price: true,
            is_available: true,
            is_featured: true,
            image_path: true,
            display_order: true,
          },
          orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    return {
      ...category,
      productsCount: category._count.products,
    };
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    // Verificar que la categoría existe y contar sus hijos
    const existingCategory = await this.prisma.categories.findUnique({
      where: { id },
      include: {
        _count: {
          select: { children: true },
        },
      },
    });

    if (!existingCategory) {
      throw new NotFoundException(`Categoría con ID "${id}" no encontrada`);
    }

    // Validar que una categoría con hijos no pueda convertirse en subcategoría
    if (
      updateCategoryDto.parent_id !== undefined &&
      updateCategoryDto.parent_id !== null &&
      existingCategory._count.children > 0
    ) {
      throw new BadRequestException(
        `No se puede convertir esta categoría en subcategoría porque tiene ${existingCategory._count.children} subcategoría(s) asociadas. Primero debe mover o eliminar las subcategorías.`,
      );
    }

    // Si se cambia el slug, validar que sea único
    if (
      updateCategoryDto.slug &&
      updateCategoryDto.slug !== existingCategory.slug
    ) {
      const existingSlug = await this.prisma.categories.findFirst({
        where: { slug: updateCategoryDto.slug, id: { not: id } },
      });

      if (existingSlug) {
        throw new ConflictException(
          `Ya existe una categoría con el slug ${updateCategoryDto.slug}`,
        );
      }
    }

    // Si se cambia el parent_id, validar y recalcular nivel
    let level = existingCategory.level;
    if (updateCategoryDto.parent_id !== undefined) {
      if (updateCategoryDto.parent_id === null) {
        // Se convierte en categoría raíz
        level = 0;
      } else {
        // Validar que no sea su propio hijo (evitar ciclos)
        if (updateCategoryDto.parent_id === id) {
          throw new BadRequestException(
            'Una categoría no puede ser su propia categoría padre',
          );
        }

        const parent = await this.prisma.categories.findUnique({
          where: { id: updateCategoryDto.parent_id },
        });

        if (!parent) {
          throw new NotFoundException(
            `Categoría padre con ID ${updateCategoryDto.parent_id} no encontrada`,
          );
        }

        level = parent.level + 1;
      }
    }

    try {
      const category = await this.prisma.categories.update({
        where: { id },
        data: {
          ...updateCategoryDto,
          level,
        },
      });

      return {
        succes: true,
        message: 'Categoría actualizada exitosamente',
        data: category,
      };
    } catch (error) {
      this.logger.error(
        `Error interno al actualizar categoría ${id}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Error interno al actualizar la categoría',
      );
    }
  }

  async remove(id: string) {
    const category = await this.prisma.categories.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Categoría no encontrada`);
    }

    if (category._count.products > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría porque tiene ${category._count.products} producto(s) asociado(s)`,
      );
    }

    if (category._count.children > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría porque tiene ${category._count.children} subcategoría(s)`,
      );
    }

    try {
      const category = await this.prisma.categories.update({
        where: { id },
        data: { is_active: false },
      });

      return {
        succes: true,
        message: `Categoría "${category.name}" desactivada exitosamente`,
        data: category,
      };
    } catch (error) {
      this.logger.error(
        `Error interno al eliminar categoría ${id}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Error interno al eliminar la categoría',
      );
    }
  }
}
