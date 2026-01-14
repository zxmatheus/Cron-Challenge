import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PricesService {
    @Cron(CronExpression.EVERY_MINUTE)
async collectPrices() {
  console.log('Collecting prices...');
}
}


