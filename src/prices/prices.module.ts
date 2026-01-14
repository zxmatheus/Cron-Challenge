import { Module } from '@nestjs/common';
import { PricesService } from './prices.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PricesController } from './prices.controller';

@Module({
  imports: [PrismaModule],
  providers: [PricesService],
  controllers: [PricesController],
})
export class PricesModule {}
