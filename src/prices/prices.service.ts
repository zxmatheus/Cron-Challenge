import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class PricesService {
    @Cron(CronExpression.EVERY_MINUTE)
async collectPrices() {
    console.log('Collecting prices...');
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        params: {
          ids: 'bitcoin,ethereum',
          vs_currencies: 'usd',
        },
      }
    );
    console.log(response.data);
}
}


