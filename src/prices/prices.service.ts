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
            ids: 'bitcoin,ethereum,solana,binancecoin', // dessa forma são os ids na plataforma da coingecko
            vs_currencies: 'usd', // filtrando preços em dolar
          },
        },
      );

      await this.savePrice('bitcoin', 'btc', data.bitcoin.usd);
      await this.savePrice('ethereum', 'eth', data.ethereum.usd);
      await this.savePrice('solana', 'sol', data.solana.usd);
      await this.savePrice('binance coin', 'bnb', data.binancecoin.usd); // 4 moedas apresentadas na plataforma coin gecko como as mais relevantes
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('Rate limit da API Coin Gecko atingido, pulando execução'); // API gratuito da coingecko tem limites para chamadas por minuto
        return;
      }

      console.error('Erro ao buscar preços:', error.message);
    }
  }

  private async savePrice(nome: string, symbol: string, valor: number) {
    const moeda = await this.prisma.moeda.upsert({
      where: { symbol }, // o símbolo é utilizado para identificar a moeda vinda da API, não pode haver duas moedas com o mesmo símbolo no nosso banco
      update: {},
      create: {
        nome,
        symbol,
      },
    });

    const ultimoPreco = await this.prisma.preco.findFirst({
      // Pega o preço mais recente da moeda contido no banco de dados
      where: { moedaId: moeda.id },
      orderBy: { dataDoValor: 'desc' },
    });

    if (ultimoPreco && ultimoPreco.valor.equals(valor)) {
      // Se o preço atual for igual ao preço mais recente, retorna, para evitar duplicação
      return;
    }

    await this.prisma.preco.create({
      // Gera instância do preço da moeda em dólares
      data: {
        moedaId: moeda.id,
        valor,
        dataDoValor: new Date(),
      },
    });
  }

  async listCoins() {
    // Retorna todas as moedas cadastradas
    return this.prisma.moeda.findMany();
  }

  async getPricesWithReport(symbol: string, from?: string, to?: string) {
    // Retorna o relatório de preços de uma moeda, incluindo o menor, maior, média e variação percentual. Traz também o histórico dos preços.
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
              }, // Filtrando preços pelo período desejado
            }
          : {}),
      },
      orderBy: { dataDoValor: 'asc' },
    });
    if (precos.length === 0) {
      //retorno se não houver preços registrados ainda
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
      // retorno do relatório
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
