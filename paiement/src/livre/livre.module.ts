import { Module } from '@nestjs/common';
import { LivreService } from './livre.service';

@Module({ providers: [LivreService], exports: [LivreService] })
export class LivreModule {}
