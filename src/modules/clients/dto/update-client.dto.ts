import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';

// No se permite cambiar tipo y número de documento una vez creado
export class UpdateClientDto extends PartialType(
  OmitType(CreateClientDto, ['tipo_documento', 'numero_documento'] as const),
) {}
