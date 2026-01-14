import { Test, TestingModule } from '@nestjs/testing';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';

describe('PricesController', () => {
  //o controller real de prices utiliza o service real, portanto esse controller utilizando mocks foi criado para os testes
  let controller: PricesController;

  const mockPricesService = {
    listCoins: jest.fn(),
    getPricesWithReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PricesController],
      providers: [
        {
          provide: PricesService,
          useValue: mockPricesService,
        },
      ],
    }).compile();

    controller = module.get<PricesController>(PricesController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return list of coins', async () => {
    mockPricesService.listCoins.mockResolvedValue([
      { id: 1, nome: 'Bitcoin', symbol: 'btc' },
    ]);

    const result = await controller.listCoins();

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('btc');
  });

  it('should return prices report', async () => {
    mockPricesService.getPricesWithReport.mockResolvedValue({
      asset: { name: 'Bitcoin', symbol: 'btc' },
      period: { from: null, to: null },
      summary: null,
      history: [],
    });

    const result = await controller.getPrices('btc');

    expect(result.asset.symbol).toBe('btc');
  });
});
