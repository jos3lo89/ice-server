import { Test, TestingModule } from '@nestjs/testing';
import { CashRegistersService } from './cash-registers.service';

describe('CashRegistersService', () => {
  let service: CashRegistersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CashRegistersService],
    }).compile();

    service = module.get<CashRegistersService>(CashRegistersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
