import {
  IsUUID,
  IsString,
  IsEmail,
  IsDateString,
  IsInt,
  IsOptional,
  IsNotEmpty,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({
    description: 'UUID de la mesa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  table_id: string;

  @ApiProperty({
    description: 'Nombre del cliente',
    example: 'Carlos Rodríguez',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  client_name: string;

  @ApiProperty({
    description: 'Teléfono del cliente',
    example: '999888777',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'El teléfono debe contener solo números y caracteres válidos',
  })
  client_phone: string;

  @ApiPropertyOptional({
    description: 'Email del cliente',
    example: 'carlos@email.com',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  client_email?: string;

  @ApiProperty({
    description: 'Fecha de la reservación (YYYY-MM-DD)',
    example: '2024-01-20',
  })
  @IsDateString()
  reservation_date: string;

  @ApiProperty({
    description: 'Hora de la reservación (HH:MM)',
    example: '20:00',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'La hora debe estar en formato HH:MM (24 horas)',
  })
  reservation_time: string;

  @ApiProperty({
    description: 'Duración en horas',
    example: 2,
    minimum: 1,
    maximum: 8,
  })
  @IsInt()
  @Min(1)
  @Max(8)
  duration_hours: number;

  @ApiProperty({
    description: 'Número de comensales',
    example: 6,
    minimum: 1,
    maximum: 20,
  })
  @IsInt()
  @Min(1)
  @Max(20)
  diners_count: number;

  @ApiPropertyOptional({
    description: 'Notas adicionales',
    example: 'Cumpleaños, traer torta',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
