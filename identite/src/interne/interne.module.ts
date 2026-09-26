import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InterneController } from './interne.controller';
import { InterneRpcController } from './interne.rpc.controller';
import { JetonsModule } from '../jetons/jetons.module';
import { RolesModule } from '../roles/roles.module';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';

@Module({
  imports: [JwtModule.register({}), JetonsModule, RolesModule, UtilisateursModule],
  controllers: [InterneController, InterneRpcController],
})
export class InterneModule {}
