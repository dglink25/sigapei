import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtEmissionService } from './jwt.service';
import { TokenBlacklistRedis } from './token-blacklist.redis';
import { SessionRedisService } from './session.redis.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [JwtEmissionService, TokenBlacklistRedis, SessionRedisService],
  exports: [JwtEmissionService, TokenBlacklistRedis, SessionRedisService],
})
export class JetonsModule {}
