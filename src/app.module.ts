import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { PricesModule } from './prices/prices.module';

@Module({
  imports: [ScheduleModule.forRoot(), PricesModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
