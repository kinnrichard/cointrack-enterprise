import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LeavesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Leave Types ---
  async findAllTypes(tenantId: string) {
    return this.prisma.leaveType.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createType(tenantId: string, data: any) {
    return this.prisma.leaveType.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        isPaid: data.isPaid ?? true,
        maxDays: data.maxDays || 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateType(tenantId: string, id: string, data: any) {
    const leaveType = await this.prisma.leaveType.findFirst({ where: { id, tenantId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    const updateData: any = {};
    const fields = ['name', 'code', 'isPaid', 'maxDays', 'isActive'];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return this.prisma.leaveType.update({ where: { id }, data: updateData });
  }

  async deleteType(tenantId: string, id: string) {
    const leaveType = await this.prisma.leaveType.findFirst({ where: { id, tenantId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    await this.prisma.leaveType.delete({ where: { id } });
    return { message: 'Leave type deleted' };
  }

  // --- Leave Credits ---
  async findAllCredits(
    tenantId: string,
    params: { employeeId?: string; year?: number },
  ) {
    const where: any = { tenantId };
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.year) where.year = params.year;

    return this.prisma.leaveCredit.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        leaveType: { select: { id: true, name: true, code: true } },
      },
      orderBy: { year: 'desc' },
    });
  }

  async createCredit(tenantId: string, data: any) {
    return this.prisma.leaveCredit.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        year: data.year,
        allocated: data.allocated || 0,
        used: data.used || 0,
        adjusted: data.adjusted || 0,
        balance: data.balance || data.allocated || 0,
      },
    });
  }

  async updateCredit(tenantId: string, id: string, data: any) {
    const credit = await this.prisma.leaveCredit.findFirst({ where: { id, tenantId } });
    if (!credit) throw new NotFoundException('Leave credit not found');

    const updateData: any = {};
    const fields = ['allocated', 'used', 'adjusted', 'balance'];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return this.prisma.leaveCredit.update({ where: { id }, data: updateData });
  }

  // --- Leave Applications ---
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
      this.prisma.leaveApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
          leaveType: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.leaveApplication.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const leave = await this.prisma.leaveApplication.findFirst({
      where: { id, tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        leaveType: { select: { id: true, name: true, code: true } },
      },
    });
    if (!leave) throw new NotFoundException('Leave application not found');
    return leave;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.leaveApplication.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        days: data.days,
        reason: data.reason || null,
        status: 'PENDING',
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const leave = await this.prisma.leaveApplication.findFirst({ where: { id, tenantId } });
    if (!leave) throw new NotFoundException('Leave application not found');

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.rejectedReason !== undefined) updateData.rejectedReason = data.rejectedReason;
    if (data.approvedBy !== undefined) updateData.approvedBy = data.approvedBy;
    if (data.status === 'APPROVED' || data.status === 'REJECTED') {
      updateData.approvedAt = new Date();
    }

    return this.prisma.leaveApplication.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const leave = await this.prisma.leaveApplication.findFirst({ where: { id, tenantId } });
    if (!leave) throw new NotFoundException('Leave application not found');

    await this.prisma.leaveApplication.delete({ where: { id } });
    return { message: 'Leave application deleted' };
  }
}
