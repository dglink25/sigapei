import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChiffrementService } from './chiffrement.service';

@Global()
@Module({
  providers: [{ provide: ChiffrementService, inject: [ConfigService], useFactory: (c: ConfigService) => ChiffrementService.depuisConfig(c) }],
  exports: [ChiffrementService],
})
export class SecuriteModule {}
