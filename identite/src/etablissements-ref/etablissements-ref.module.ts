import { Module } from '@nestjs/common';
import { EtablissementsRefService } from './etablissements-ref.service';

@Module({
  providers: [EtablissementsRefService],
  exports: [EtablissementsRefService],
})
export class EtablissementsRefModule {}
