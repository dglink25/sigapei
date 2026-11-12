import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('sante')
export class SanteController {
  constructor(private readonly ds: DataSource) {}

  @Get()
  async sante() {
    try {
      await this.ds.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ code: 'BASE_INDISPONIBLE', message: 'Base de donnees indisponible.' });
    }
    return { service: 'api-paiement', statut: 'ok' };
  }
}
