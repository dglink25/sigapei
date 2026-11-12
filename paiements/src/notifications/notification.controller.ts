import {
  Controller, Get, Post, Param, Query, Req, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  /** Notifications in-app non lues de l'utilisateur connecté */
  @Get()
  async listerNonLues(
    @Req() req: Request,
    @Query('etablissementUuid') etablissementUuid?: string,
  ) {
    const utilisateurUuid = (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
    return this.service.listerNonLues(utilisateurUuid, etablissementUuid);
  }

  /** Marquer une notification comme lue */
  @Post(':uuid/lire')
  @HttpCode(HttpStatus.NO_CONTENT)
  async marquerLu(@Param('uuid', ParseUUIDPipe) uuid: string, @Req() req: Request) {
    const utilisateurUuid = (req as unknown as Record<string, unknown>).utilisateurUuid as string ?? 'system';
    await this.service.marquerLu(uuid, utilisateurUuid);
  }
}
