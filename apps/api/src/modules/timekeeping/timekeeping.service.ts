import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
        where, skip, take: limit,
        orderBy: { startDate: 'desc' },
        include: { _count: { select: { data: true } } },
      }),
      this.prisma.timekeeping.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const timekeeping = await this.prisma.timekeeping.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { data: true } } },
    });
    if (!timekeeping) throw new NotFoundException('Timekeeping not found');
    return timekeeping;
  }

  async findData(tenantId: string, timekeepingId: string, params: { page?: number; limit?: number }) {
    const timekeeping = await this.prisma.timekeeping.findFirst({ where: { id: timekeepingId, tenantId } });
    if (!timekeeping) throw new NotFoundException('Timekeeping not found');

    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.timekeepingData.findMany({
        where: { timekeepingId }, skip, take: limit,
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } } },
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

  /**
   * Process timekeeping: aggregate attendance records into TimekeepingData per employee.
   */
  async process(tenantId: string, id: string) {
    const timekeeping = await this.prisma.timekeeping.findFirst({ where: { id, tenantId } });
    if (!timekeeping) throw new NotFoundException('Timekeeping not found');
    if (timekeeping.status === 'COMPLETED') throw new BadRequestException('Already completed');

    // Get all active employees
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, employmentStatus: 'ACTIVE' },
      select: { id: true },
    });

    // Get attendance records for the period
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        date: { gte: timekeeping.startDate, lte: timekeeping.endDate },
      },
    });

    // Group by employee
    const byEmployee = new Map<string, typeof attendanceRecords>();
    for (const record of attendanceRecords) {
      const list = byEmployee.get(record.employeeId) || [];
      list.push(record);
      byEmployee.set(record.employeeId, list);
    }

    // Delete existing timekeeping data for this period
    await this.prisma.timekeepingData.deleteMany({ where: { timekeepingId: id } });

    // Create timekeeping data for each employee
    for (const emp of employees) {
      const records = byEmployee.get(emp.id) || [];

      let daysWorked = 0;
      let daysAbsent = 0;
      let regularHours = 0;
      let overtimeHours = 0;
      let nightDiffHours = 0;
      let nightDiffOTHours = 0;
      let restDaySpecialHours = 0;
      let restDaySpecialOTHours = 0;
      let restDaySpecialNDHours = 0;
      let restDaySpecialNDOTHours = 0;
      let legalHolidayHours = 0;
      let legalHolidayOTHours = 0;
      let legalHolidayNDHours = 0;
      let legalHolidayNDOTHours = 0;
      let doubleHolidayHours = 0;
      let doubleHolidayOTHours = 0;
      let doubleHolidayNDHours = 0;
      let doubleHolidayNDOTHours = 0;
      let totalLateMinutes = 0;
      let totalUndertimeMinutes = 0;

      for (const r of records) {
        const worked = Number(r.workedHours) || 0;
        const ot = Number(r.overtimeHours) || 0;
        const nd = Number(r.nightDiffHours) || 0;
        const late = Number(r.lateMinutes) || 0;
        const ut = Number(r.undertimeMinutes) || 0;

        if (r.status === 'ABSENT') { daysAbsent++; continue; }
        if (r.status === 'HALF_DAY') { daysWorked += 0.5; } else if (worked > 0) { daysWorked++; }

        totalLateMinutes += late;
        totalUndertimeMinutes += ut;

        // Categorize hours by day type
        if (r.isDoubleHoliday) {
          doubleHolidayHours += worked;
          doubleHolidayOTHours += ot;
          doubleHolidayNDHours += nd;
        } else if (r.isRegularHoliday) {
          legalHolidayHours += worked;
          legalHolidayOTHours += ot;
          legalHolidayNDHours += nd;
        } else if (r.isSpecialHoliday || r.isRestDay) {
          restDaySpecialHours += worked;
          restDaySpecialOTHours += ot;
          restDaySpecialNDHours += nd;
        } else {
          regularHours += worked;
          overtimeHours += ot;
          nightDiffHours += nd;
        }
      }

      await this.prisma.timekeepingData.create({
        data: {
          timekeepingId: id,
          employeeId: emp.id,
          daysWorked,
          daysAbsent,
          regularHours,
          overtimeHours,
          nightDiffHours,
          nightDiffOTHours,
          restDaySpecialHours,
          restDaySpecialOTHours,
          restDaySpecialNDHours,
          restDaySpecialNDOTHours,
          legalHolidayHours,
          legalHolidayOTHours,
          legalHolidayNDHours,
          legalHolidayNDOTHours,
          doubleHolidayHours,
          doubleHolidayOTHours,
          doubleHolidayNDHours,
          doubleHolidayNDOTHours,
          totalLateMinutes,
          totalUndertimeMinutes,
        },
      });
    }

    // Update status
    await this.prisma.timekeeping.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    return { message: 'Timekeeping processed', employeesProcessed: employees.length };
  }
}
