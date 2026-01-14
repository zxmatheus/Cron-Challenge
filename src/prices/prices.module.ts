import { Module } from '@nestjs/common';
import { PricesService } from './prices.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PricesService],
})
export class PricesModule {}
