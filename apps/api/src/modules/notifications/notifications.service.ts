import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    tenantId: string,
    params: { page?: number; limit?: number; isRead?: boolean },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId, tenantId };
    if (params.isRead !== undefined) where.isRead = params.isRead;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async unreadCount(userId: string, tenantId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, tenantId, isRead: false },
    });
    return { count };
  }

  async markAsRead(userId: string, tenantId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, tenantId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string, tenantId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, tenantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  async create(
    tenantId: string,
    data: {
      userId: string;
      type: string;
      title: string;
      message: string;
      link?: string;
    },
  ) {
    return this.prisma.notification.create({
      data: {
        tenantId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
      },
    });
  }
}
