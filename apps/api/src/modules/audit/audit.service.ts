import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      action?: string;
      entityType?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.action) where.action = params.action;
    if (params.entityType) where.entityType = params.entityType;
    if (params.userId) where.userId = params.userId;

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async log(
    tenantId: string,
    data: {
      userId?: string;
      action: string;
      entityType: string;
      entityId?: string;
      oldValues?: any;
      newValues?: any;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    return this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: data.userId || null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || null,
        oldValues: data.oldValues || null,
        newValues: data.newValues || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  }
}
