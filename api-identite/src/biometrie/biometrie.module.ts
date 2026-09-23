import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpreinteBiometrique } from './empreinte-biometrique.entity';
import { Appareil } from '../appareils/appareil.entity';
import { BiometrieService } from './biometrie.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmpreinteBiometrique, Appareil])],
  providers: [BiometrieService],
  exports: [BiometrieService],
})
export class BiometrieModule {}
