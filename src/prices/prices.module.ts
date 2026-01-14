import { Module } from '@nestjs/common';
import { PricesService } from './prices.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PricesController } from './prices.controller';

@Module({
  imports: [PrismaModule], //Necessário importar módulo do prisma para podermos usar o PrismaService, permitindo trazer dados da API Coin Gecko para o banco de dados
  providers: [PricesService],
  controllers: [PricesController],
})
export class PricesModule {}
