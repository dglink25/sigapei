import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UtilisateursModule } from '../utilisateurs/utilisateurs.module';
import { OtpModule } from '../otp/otp.module';
import { JetonsModule } from '../jetons/jetons.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AppareilsModule } from '../appareils/appareils.module';
import { BiometrieModule } from '../biometrie/biometrie.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UtilisateursModule,
    OtpModule,
    JetonsModule,
    IntegrationsModule,
    AppareilsModule,
    BiometrieModule,
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
