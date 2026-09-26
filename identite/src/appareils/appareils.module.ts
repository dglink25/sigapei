import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appareil } from './appareil.entity';
import { AppareilsService } from './appareils.service';
import { AppareilsController } from './appareils.controller';
import { JetonsModule } from '../jetons/jetons.module';

@Module({
  imports: [TypeOrmModule.forFeature([Appareil]), JetonsModule],
  controllers: [AppareilsController],
  providers: [AppareilsService],
  exports: [AppareilsService],
})
export class AppareilsModule {}
