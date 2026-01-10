# ICE MANKORA - Agent Development Guide

## Project Overview

ICE MANKORA is a Restaurant Point of Sale (POS) system built with:

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT via HTTP-only cookies
- **Documentation**: Swagger/OpenAPI
- **Architecture**: Modular REST API with role-based access control

**System Roles**: ADMIN, CAJERO, MESERO, BARTENDER, COCINERO

## Essential Commands

### Development

```bash
# Development with hot reload
npm run start:dev

# Build for production
npm run build

# Production start
npm run start:prod
```

### Testing

```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test -- auth.service.spec.ts

# Run test by name pattern
npm run test -- --testNamePattern="should create user"

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov

# Run E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Lint and auto-fix
npm run lint

# Format code with Prettier
npm run format
```

### Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Run database migrations
npx prisma migrate dev

# View database
npx prisma studio
```

## Code Style Guidelines

### Import Organization

```typescript
// 1. External libraries (sorted alphabetically)
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

// 2. Internal modules (use absolute paths)
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';

// 3. Type imports
import { type Request, type Response } from 'express';
import { type CurrentUserI } from 'src/common/interfaces/userActive.interface';
```

### Naming Conventions

- **Files**: kebab-case (`auth.service.ts`, `create-user.dto.ts`, `user.controller.ts`)
- **Classes**: PascalCase (`AuthService`, `CreateUserDto`, `UserController`)
- **Methods/Variables**: camelCase (`loginUser`, `userResult`, `isActive`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `DEFAULT_TIMEOUT`)
- **Enums**: PascalCase with snake_case values (`user_role.ADMIN`, `table_status.OCUPADA`)

### TypeScript Usage

```typescript
// Use type imports for type-only imports
import { type Request, type Response } from 'express';

// Use generated Prisma types
import { user_role, order_status } from 'src/generated/prisma/enums';

// Prefer interfaces for object shapes
export interface CurrentUserI {
  sub: string;
  username: string;
  role: user_role;
}

// Use decorators with proper metadata
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
}
```

### API Response Format

Always use standardized response structure:

```typescript
return {
  success: true,
  message: 'Operation completed successfully',
  data: {
    user: result,
    // ...other data
  },
};

// For operations without returned data
return {
  success: true,
  message: 'Resource created successfully',
  data: null,
};
```

### Error Handling

```typescript
import {
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async create(values: CreateUserDto) {
    try {
      // Business logic here
      const result = await this.prisma.users.create({
        /* ... */
      });
      return { success: true, message: 'User created', data: { user: result } };
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Internal server error');
    }
  }
}
```

### DTOs and Validation

```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Jose Manuel',
    description: 'Nombre completo del trabajador',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiProperty({
    enum: user_role,
    example: 'MESERO',
    description: 'Rol asignado en el restaurante',
  })
  @IsEnum(user_role, { message: 'El rol asignado no es válido' })
  role: user_role;

  @ApiProperty({
    example: '123456',
    description: 'PIN de 6 dígitos para acceso rápido',
    required: false,
  })
  @IsString({ message: 'El PIN debe ser texto' })
  @IsOptional()
  @Length(6, 6, { message: 'El PIN debe tener exactamente 6 dígitos' })
  pin?: string;
}
```

## Authentication & Authorization

### Role-Based Access Control

```typescript
import { Auth } from 'src/common/decorators/auth.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CurrentUser } from 'src/common/decorators/currentUser.decorator';

// Apply authentication and authorization
@Auth(Role.ADMIN, Role.CAJERO)
@Get('protected-endpoint')
async protectedMethod(@CurrentUser() user: CurrentUserI) {
  // Access user data: user.sub, user.username, user.role
  return this.service.someMethod();
}
```

### Available Roles

- `ADMIN`: Full system access
- `CAJERO`: Cash register, payments, sales
- `MESERO`: Orders and table management
- `BARTENDER`: Bar order viewing
- `COCINERO`: Kitchen order viewing

## Database Patterns

### Prisma Service Usage

```typescript
import { PrismaService } from 'src/core/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    return await this.prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        // Avoid returning sensitive data
      },
    });
  }
}
```

### Transaction Handling

```typescript
async complexOperation(data: CreateOrderDto) {
  return await this.prisma.$transaction(async (tx) => {
    // Create order
    const order = await tx.orders.create({ /* ... */ });

    // Create order items
    await tx.order_items.createMany({ /* ... */ });

    // Update table status
    await tx.tables.update({ /* ... */ });

    return order;
  });
}
```

## Testing Patterns

### Test Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, PrismaService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create user successfully', async () => {
    // Arrange
    const userData = { name: 'Test User' /* ... */ };
    jest.spyOn(prismaService.users, 'create').mockResolvedValue(expectedUser);

    // Act
    const result = await service.create(userData);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data.user).toBeDefined();
  });
});
```

## Development Workflow

### Environment Setup

1. Copy `.env.example` to `.env` and configure database
2. Run `npm install` to install dependencies
3. Run `npx prisma generate` to generate client
4. Run `npx prisma db push` to sync database schema

### API Documentation

- Swagger UI available at: `http://localhost:5000/api/docs`
- API prefix: `/api/v1`
- Use `@ApiTags()` for controller organization
- Use `@ApiOperation()` for endpoint descriptions
- Use `@ApiResponse()` for response documentation

### Common Development Tasks

#### Creating New Module

```bash
nest generate module modules/new-feature
nest generate controller modules/new-feature
nest generate service modules/new-feature
```

#### Adding New Endpoint

1. Define DTO with validation decorators
2. Add Swagger documentation
3. Implement business logic in service
4. Add appropriate error handling
5. Write unit tests
6. Update module exports if needed

#### Database Schema Changes

1. Update `prisma/schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push` for development
4. Create migration for production: `npx prisma migrate dev`

## Code Quality Standards

### ESLint Configuration

- Modern flat config (ESLint 9.x)
- TypeScript support with type checking
- Prettier integration
- Custom rules: `no-explicit-any` disabled, floating promises as warnings

### Prettier Configuration

- Single quotes: `true`
- Trailing commas: `all`
- End of line: `auto`

### TypeScript Configuration

- Target: ES2023
- Strict mode enabled
- Decorators enabled
- Generated types in `src/generated/prisma`

## Important Notes

- **No comments in production code** (unless specifically requested)
- **Always use Spanish for user-facing messages** in DTOs and responses
- **Follow established patterns** when adding new features
- **Run linting and tests** before committing changes
- **Use proper error handling** with NestJS exceptions
- **Maintain consistent response format** across all endpoints
