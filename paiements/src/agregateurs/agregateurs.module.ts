import { Module } from '@nestjs/common';
import { FedapayAdapter } from './fedapay.adapter';
import { KkiapayAdapter } from './kkiapay.adapter';
import { CinetpayAdapter } from './cinetpay.adapter';
import { AgregateurRegistre } from './agregateur.registre';

@Module({
  providers: [FedapayAdapter, KkiapayAdapter, CinetpayAdapter, AgregateurRegistre],
  exports: [AgregateurRegistre],
})
export class AgregateurModule {}
