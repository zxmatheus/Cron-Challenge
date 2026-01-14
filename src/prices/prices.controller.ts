import { Controller, Get, Param, Query } from '@nestjs/common';
import { PricesService } from './prices.service';

@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}
  @Get('coins')
  async listCoins() {
    return this.pricesService.listCoins();
  }

  @Get(':symbol')
  async getPrices(
    @Param('symbol') symbol: string,
    @Query('from') from?: string, // essa parte permite adicionar período em data no request, podendo ser o começo, o fim ou ambos
    @Query('to') to?: string,
  ) {
    return this.pricesService.getPricesWithReport(symbol, from, to);
  }
}
