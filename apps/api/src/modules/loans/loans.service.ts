import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      employeeId?: string;
      type?: string;
      status?: string;
    },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.loan.findMany({
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
      this.prisma.loan.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
      },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.loan.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        type: data.type,
        principal: data.principal,
        interestRate: data.interestRate || 0,
        totalAmount: data.totalAmount,
        monthlyAmortization: data.monthlyAmortization,
        balance: data.balance ?? data.totalAmount,
        status: data.status || 'ACTIVE',
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        remarks: data.remarks || null,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const loan = await this.prisma.loan.findFirst({ where: { id, tenantId } });
    if (!loan) throw new NotFoundException('Loan not found');

    const updateData: any = {};
    const fields = ['type', 'principal', 'interestRate', 'totalAmount', 'monthlyAmortization', 'balance', 'status', 'remarks'];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

    return this.prisma.loan.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({ where: { id, tenantId } });
    if (!loan) throw new NotFoundException('Loan not found');

    await this.prisma.loan.delete({ where: { id } });
    return { message: 'Loan deleted' };
  }
}
