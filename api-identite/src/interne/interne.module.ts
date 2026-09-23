import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InterneController } from './interne.controller';
import { InterneRpcController } from './interne.rpc.controller';
import { JetonsModule } from '../jetons/jetons.module';

@Module({
  imports: [JwtModule.register({}), JetonsModule],
  controllers: [InterneController, InterneRpcController],
})
export class InterneModule {}
