import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      employeeId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    },
  ) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.status) where.status = params.status;

    if (params.startDate || params.endDate) {
      where.date = {};
      if (params.startDate) where.date.gte = new Date(params.startDate);
      if (params.endDate) where.date.lte = new Date(params.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
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
      this.prisma.attendance.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
      },
    });
    if (!attendance) throw new NotFoundException('Attendance record not found');
    return attendance;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.attendance.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        date: new Date(data.date),
        scheduleId: data.scheduleId || null,
        timeIn: data.timeIn ? new Date(data.timeIn) : null,
        timeOut: data.timeOut ? new Date(data.timeOut) : null,
        status: data.status || 'PRESENT',
        workedHours: data.workedHours || 0,
        lateMinutes: data.lateMinutes || 0,
        undertimeMinutes: data.undertimeMinutes || 0,
        overtimeHours: data.overtimeHours || 0,
        nightDiffHours: data.nightDiffHours || 0,
        isRestDay: data.isRestDay ?? false,
        isSpecialHoliday: data.isSpecialHoliday ?? false,
        isRegularHoliday: data.isRegularHoliday ?? false,
        isDoubleHoliday: data.isDoubleHoliday ?? false,
        holidayName: data.holidayName || null,
        holidayType: data.holidayType || null,
        remarks: data.remarks || null,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const attendance = await this.prisma.attendance.findFirst({ where: { id, tenantId } });
    if (!attendance) throw new NotFoundException('Attendance record not found');

    const updateData: any = {};

    if (data.timeIn !== undefined) updateData.timeIn = data.timeIn ? new Date(data.timeIn) : null;
    if (data.timeOut !== undefined) updateData.timeOut = data.timeOut ? new Date(data.timeOut) : null;

    const stringFields = ['status', 'scheduleId', 'holidayName', 'holidayType', 'remarks'];
    for (const field of stringFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    const numericFields = ['workedHours', 'lateMinutes', 'undertimeMinutes', 'overtimeHours', 'nightDiffHours'];
    for (const field of numericFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    const booleanFields = ['isRestDay', 'isSpecialHoliday', 'isRegularHoliday', 'isDoubleHoliday'];
    for (const field of booleanFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return this.prisma.attendance.update({ where: { id }, data: updateData });
  }

  async delete(tenantId: string, id: string) {
    const attendance = await this.prisma.attendance.findFirst({ where: { id, tenantId } });
    if (!attendance) throw new NotFoundException('Attendance record not found');

    await this.prisma.attendance.delete({ where: { id } });
    return { message: 'Attendance record deleted' };
  }
}
