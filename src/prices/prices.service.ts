import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PricesService {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async collectPrices() {
    try {
      console.log('Coletando preços...');

      const { data } = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'bitcoin,ethereum,solana,binancecoin',
            vs_currencies: 'usd',
          },
        },
      );

      await this.savePrice('bitcoin', 'btc', data.bitcoin.usd);
      await this.savePrice('ethereum', 'eth', data.ethereum.usd);
      await this.savePrice('solana', 'sol', data.solana.usd);
      await this.savePrice('binance coin', 'bnb', data.binancecoin.usd);
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('Rate limit da API Coin Gecko atingido, pulando execução');
        return;
      }

      console.error('Erro ao buscar preços:', error.message);
    }
  }

  private async savePrice(nome: string, symbol: string, valor: number) {
    const moeda = await this.prisma.moeda.upsert({
      where: { symbol },
      update: {},
      create: {
        nome,
        symbol,
      },
    });

    const ultimoPreco = await this.prisma.preco.findFirst({
      where: { moedaId: moeda.id },
      orderBy: { dataDoValor: 'desc' },
    });

    if (ultimoPreco && ultimoPreco.valor.equals(valor)) {
      return;
    }

    await this.prisma.preco.create({
      data: {
        moedaId: moeda.id,
        valor,
        dataDoValor: new Date(),
      },
    });
  }

  async listCoins() {
    return this.prisma.moeda.findMany();
  }

  async getPricesWithReport(symbol: string, from?: string, to?: string) {
    const moeda = await this.prisma.moeda.findUnique({
      where: { symbol },
    });

    if (!moeda) {
      throw new NotFoundException(`Moeda ${symbol} não encontrada`);
    }
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const precos = await this.prisma.preco.findMany({
      where: {
        moedaId: moeda.id,
        ...(fromDate || toDate
          ? {
              dataDoValor: {
                ...(fromDate && { gte: fromDate }),
                ...(toDate && { lte: toDate }),
              },
            }
          : {}),
      },
      orderBy: { dataDoValor: 'asc' },
    });
    if (precos.length === 0) {
      return {
        asset: {
          name: moeda.nome,
          symbol: moeda.symbol,
        },
        period: { from, to },
        summary: null,
        history: [],
      };
    }
    let min = precos[0];
    let max = precos[0];
    const first = precos[0].valor.toNumber();
    const last = precos[precos.length - 1].valor.toNumber();
    let sum = 0;
    for (const preco of precos) {
      if (preco.valor.lessThan(min.valor)) min = preco;
      if (preco.valor.greaterThan(max.valor)) max = preco;
      sum += preco.valor.toNumber();
    }

    const average = sum / precos.length;
    const variationPercent = ((last - first) / first) * 100;

    return {
      asset: {
        name: moeda.nome,
        symbol: moeda.symbol,
      },
      period: {
        from: fromDate ?? null,
        to: toDate ?? null,
      },
      summary: {
        min: {
          value: min.valor,
          date: min.dataDoValor,
        },
        max: {
          value: max.valor,
          date: max.dataDoValor,
        },
        average,
        variationPercent,
      },
      history: precos.map((p) => ({
        value: p.valor,
        date: p.dataDoValor,
      })),
    };
  }
}
