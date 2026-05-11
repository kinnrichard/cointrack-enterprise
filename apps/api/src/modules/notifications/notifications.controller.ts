import { Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isRead') isRead?: string,
  ) {
    return this.notificationsService.findAll(req.user.id, req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
    });
  }

  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.notificationsService.unreadCount(req.user.id, req.user.tenantId);
  }

  @Patch(':id/read')
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(req.user.id, req.user.tenantId, id);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id, req.user.tenantId);
  }
}
