import { Module } from '@nestjs/common';
import { RecuService } from './recu.service';
import { RecuController } from './recu.controller';

@Module({
  providers: [RecuService],
  controllers: [RecuController],
  exports: [RecuService],
})
export class RecuModule {}
