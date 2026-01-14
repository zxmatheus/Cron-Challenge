import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PricesService {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async collectPrices() {
    console.log('Collecting prices...');

    const { data } = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        params: {
          ids: 'bitcoin,ethereum',
          vs_currencies: 'usd',
        },
      },
    );

    console.log(data);
    } catch (error: any) {
  if (error.response?.status === 429) {
    console.warn('Rate limit atingido, pulando execução');
    return;
  }

  console.error('Erro ao buscar preços:', error.message);
}

    

  }

