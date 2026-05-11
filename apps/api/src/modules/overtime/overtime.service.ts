import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OvertimeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: { page?: number; limit?: number; employeeId?: string; status?: string },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.overtimeApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true },
          },
        },
      }),
      this.prisma.overtimeApplication.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const overtime = await this.prisma.overtimeApplication.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
      },
    });
    if (!overtime) throw new NotFoundException('Overtime application not found');
    return overtime;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.overtimeApplication.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        date: new Date(data.date),
        requestedHours: data.requestedHours,
        actualHours: data.actualHours || null,
        reason: data.reason || null,
        status: 'PENDING',
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const overtime = await this.prisma.overtimeApplication.findFirst({ where: { id, tenantId } });
    if (!overtime) throw new NotFoundException('Overtime application not found');

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.actualHours !== undefined) updateData.actualHours = data.actualHours;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.approvedBy !== undefined) updateData.approvedBy = data.approvedBy;
    if (data.status === 'APPROVED' || data.status === 'REJECTED') {
      updateData.approvedAt = new Date();
    }

    return this.prisma.overtimeApplication.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const overtime = await this.prisma.overtimeApplication.findFirst({ where: { id, tenantId } });
    if (!overtime) throw new NotFoundException('Overtime application not found');

    await this.prisma.overtimeApplication.delete({ where: { id } });
    return { message: 'Overtime application deleted' };
  }
}
