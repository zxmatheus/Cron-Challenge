import { Test, TestingModule } from '@nestjs/testing';
import { PricesService } from './prices.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('PricesService', () => {
  let service: PricesService;

  const mockPrisma = {
    moeda: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    preco: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PricesService>(PricesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty history and null summary when no prices exist', async () => {
    mockPrisma.moeda.findUnique.mockResolvedValue({
      id: 1,
      nome: 'Bitcoin',
      symbol: 'btc',
    });

    mockPrisma.preco.findMany.mockResolvedValue([]);

    const result = await service.getPricesWithReport('btc');

    expect(result.asset.symbol).toBe('btc');
    expect(result.summary).toBeNull();
    expect(result.history).toEqual([]);
  });

  it('should calculate min, max, average and variation correctly', async () => {
    mockPrisma.moeda.findUnique.mockResolvedValue({
      id: 1,
      nome: 'Bitcoin',
      symbol: 'btc',
    });

    mockPrisma.preco.findMany.mockResolvedValue([
      {
        valor: new Prisma.Decimal(100),
        dataDoValor: new Date('2024-01-01'),
      },
      {
        valor: new Prisma.Decimal(150),
        dataDoValor: new Date('2024-01-02'),
      },
      {
        valor: new Prisma.Decimal(120),
        dataDoValor: new Date('2024-01-03'),
      },
    ]);

    const result = await service.getPricesWithReport('btc');

    expect(result.asset.name).toBe('Bitcoin');

    expect(result.summary).not.toBeNull();
    expect(result.summary?.min.value.toNumber()).toBe(100);
    expect(result.summary?.max.value.toNumber()).toBe(150);

    expect(result.summary?.average).toBeCloseTo(123.33, 2);
    expect(result.summary?.variationPercent).toBeCloseTo(20, 2);

    expect(result.history).toHaveLength(3);
  });

  it('should throw error when coin does not exist', async () => {
    mockPrisma.moeda.findUnique.mockResolvedValue(null);

    await expect(service.getPricesWithReport('unknown')).rejects.toThrow(
      'Moeda unknown não encontrada',
    );
  });
});
