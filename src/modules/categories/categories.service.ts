import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PrismaClientKnownRequestError } from 'src/generated/prisma/internal/prismaNamespace';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    // Validar que el slug sea único
    const existingSlug = await this.prisma.categories.findFirst({
      where: { slug: createCategoryDto.slug },
    });

    if (existingSlug) {
      throw new ConflictException(
        `Ya existe una categoría con el slug "${createCategoryDto.slug}"`,
      );
    }

    // Si tiene parent_id, validar que exista y calcular el nivel
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
      });

      return category;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Ya existe una categoría con estos datos únicos',
          );
        }
      }
      throw error;
    }
  }

  async findAll() {
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

    return categories.map((category) => ({
      ...category,
      productsCount: category._count.products,
      children: category.children.map((child) => ({
        ...child,
        image_path: null,
      })),
    }));
  }

  async findTree() {
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

    return this.buildTree(categories);
  }

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
      throw new NotFoundException(`Categoría con ID "${id}" no encontrada`);
    }

    return {
      ...category,
      productsCount: category._count.products,
    };
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
      throw new NotFoundException(`Categoría con slug "${slug}" no encontrada`);
    }

    return {
      ...category,
      productsCount: category._count.products,
    };
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    // Verificar que la categoría existe
    const existingCategory = await this.prisma.categories.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundException(`Categoría con ID "${id}" no encontrada`);
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
          `Ya existe una categoría con el slug "${updateCategoryDto.slug}"`,
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
            `Categoría padre con ID "${updateCategoryDto.parent_id}" no encontrada`,
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

      return category;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Ya existe una categoría con estos datos únicos',
          );
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    // Verificar que la categoría existe
    const category = await this.prisma.categories.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Categoría con ID "${id}" no encontrada`);
    }

    // Validar que no tenga productos activos
    if (category._count.products > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría porque tiene ${category._count.products} producto(s) asociado(s)`,
      );
    }

    // Validar que no tenga subcategorías activas
    if (category._count.children > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría porque tiene ${category._count.children} subcategoría(s)`,
      );
    }

    // Soft delete (desactivar)
    await this.prisma.categories.update({
      where: { id },
      data: { is_active: false },
    });

    return {
      message: `Categoría "${category.name}" desactivada exitosamente`,
    };
  }
}
