import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { EncaissementModule } from '../encaissements/encaissement.module';
import { DecaissementModule } from '../decaissements/decaissement.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [EncaissementModule, DecaissementModule, NotificationModule],
  providers: [SchedulerService],
})
export class TachesModule {}
