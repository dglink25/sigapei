import { Module } from '@nestjs/common';
import { AccesCacheService } from './acces-cache.service';

@Module({
  providers: [AccesCacheService],
  exports: [AccesCacheService],
})
export class AccesCacheModule {}
