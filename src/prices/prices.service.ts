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

    await this.savePrice('bitcoin', 'btc', data.bitcoin.usd);
    await this.savePrice('ethereum', 'eth', data.ethereum.usd);
    } catch (error: any) {
  if (error.response?.status === 429) {
    console.warn('Rate limit atingido, pulando execução');
    return;
  }

  console.error('Erro ao buscar preços:', error.message);
}

    private async savePrice(
  nome: string,
  symbol: string,
  valor: number,
) {
  // 1. Garantir moeda
  const moeda = await this.prisma.moeda.upsert({
    where: { symbol },
    update: {},
    create: {
      nome,
      symbol,
    },
  });

  // 2. Buscar último preço
  const ultimoPreco = await this.prisma.preco.findFirst({
    where: { moedaId: moeda.id },
    orderBy: { dataDoValor: 'desc' },
  });

  // 3. Evitar duplicidade
  if (ultimoPreco && ultimoPreco.valor.equals(valor)) {
    return;
  }

  // 4. Salvar novo preço
  await this.prisma.preco.create({
    data: {
      moedaId: moeda.id,
      valor,
      dataDoValor: new Date(),
    },
  });
}

  }

