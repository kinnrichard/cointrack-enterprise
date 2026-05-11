import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TimekeepingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: { page?: number; limit?: number; status?: string; cutoffType?: string },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.status) where.status = params.status;
    if (params.cutoffType) where.cutoffType = params.cutoffType;

    const [data, total] = await Promise.all([
      this.prisma.timekeeping.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          _count: { select: { data: true } },
        },
      }),
      this.prisma.timekeeping.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const timekeeping = await this.prisma.timekeeping.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { data: true } },
      },
    });
    if (!timekeeping) throw new NotFoundException('Timekeeping not found');
    return timekeeping;
  }

  async findData(
    tenantId: string,
    timekeepingId: string,
    params: { page?: number; limit?: number },
  ) {
    const timekeeping = await this.prisma.timekeeping.findFirst({
      where: { id: timekeepingId, tenantId },
    });
    if (!timekeeping) throw new NotFoundException('Timekeeping not found');

    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.timekeepingData.findMany({
        where: { timekeepingId },
        skip,
        take: limit,
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true },
          },
        },
      }),
      this.prisma.timekeepingData.count({ where: { timekeepingId } }),
    ]);

    return { data, total, page, limit };
  }

  async create(tenantId: string, data: any) {
    return this.prisma.timekeeping.create({
      data: {
        tenantId,
        name: data.name || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        payDate: data.payDate ? new Date(data.payDate) : null,
        cutoffType: data.cutoffType || 'SEMI_MONTHLY',
        status: 'DRAFT',
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const timekeeping = await this.prisma.timekeeping.findFirst({ where: { id, tenantId } });
    if (!timekeeping) throw new NotFoundException('Timekeeping not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.payDate !== undefined) updateData.payDate = data.payDate ? new Date(data.payDate) : null;
    if (data.cutoffType !== undefined) updateData.cutoffType = data.cutoffType;
    if (data.status !== undefined) updateData.status = data.status;

    return this.prisma.timekeeping.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const timekeeping = await this.prisma.timekeeping.findFirst({ where: { id, tenantId } });
    if (!timekeeping) throw new NotFoundException('Timekeeping not found');

    await this.prisma.timekeeping.delete({ where: { id } });
    return { message: 'Timekeeping deleted' };
  }
}
