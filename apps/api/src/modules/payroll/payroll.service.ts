import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      employeeId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.status) where.status = params.status;

    if (params.startDate || params.endDate) {
      where.periodStart = {};
      if (params.startDate) where.periodStart.gte = new Date(params.startDate);
      if (params.endDate) where.periodStart.lte = new Date(params.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.payroll.findMany({
        where,
        skip,
        take: limit,
        orderBy: { periodStart: 'desc' },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true },
          },
        },
      }),
      this.prisma.payroll.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
        adjustments: true,
      },
    });
    if (!payroll) throw new NotFoundException('Payroll record not found');
    return payroll;
  }

  async create(tenantId: string, data: any) {
    // Stub: payroll generation will be implemented later
    return this.prisma.payroll.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        payDate: data.payDate ? new Date(data.payDate) : null,
        cutoffType: data.cutoffType || 'SEMI_MONTHLY',
        status: 'DRAFT',
        basicPay: data.basicPay || 0,
        daysWorked: data.daysWorked || 0,
        grossPay: data.grossPay || 0,
        totalDeductions: data.totalDeductions || 0,
        netPay: data.netPay || 0,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const payroll = await this.prisma.payroll.findFirst({ where: { id, tenantId } });
    if (!payroll) throw new NotFoundException('Payroll record not found');

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;
    if (data.payDate !== undefined) updateData.payDate = data.payDate ? new Date(data.payDate) : null;

    return this.prisma.payroll.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const payroll = await this.prisma.payroll.findFirst({ where: { id, tenantId } });
    if (!payroll) throw new NotFoundException('Payroll record not found');

    await this.prisma.payroll.delete({ where: { id } });
    return { message: 'Payroll record deleted' };
  }
}
