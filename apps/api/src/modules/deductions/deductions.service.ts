import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DeductionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      employeeId?: string;
      type?: string;
      isActive?: boolean;
    },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.type) where.type = params.type;
    if (params.isActive !== undefined) where.isActive = params.isActive;

    const [data, total] = await Promise.all([
      this.prisma.deduction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true },
          },
        },
      }),
      this.prisma.deduction.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const deduction = await this.prisma.deduction.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
      },
    });
    if (!deduction) throw new NotFoundException('Deduction not found');
    return deduction;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.deduction.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        type: data.type,
        name: data.name || null,
        amount: data.amount,
        amountPerCutoff: data.amountPerCutoff || 0,
        balance: data.balance ?? data.amount,
        isActive: data.isActive ?? true,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        remarks: data.remarks || null,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const deduction = await this.prisma.deduction.findFirst({ where: { id, tenantId } });
    if (!deduction) throw new NotFoundException('Deduction not found');

    const updateData: any = {};
    const fields = ['type', 'name', 'amount', 'amountPerCutoff', 'balance', 'isActive', 'remarks'];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

    return this.prisma.deduction.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const deduction = await this.prisma.deduction.findFirst({ where: { id, tenantId } });
    if (!deduction) throw new NotFoundException('Deduction not found');

    await this.prisma.deduction.delete({ where: { id } });
    return { message: 'Deduction deleted' };
  }
}
