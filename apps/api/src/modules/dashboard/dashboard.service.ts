import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalEmployees,
      activeEmployees,
      totalDepartments,
      totalSites,
      todayAttendance,
      pendingLeaves,
      pendingOvertime,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { tenantId } }),
      this.prisma.employee.count({ where: { tenantId, employmentStatus: 'ACTIVE' } }),
      this.prisma.department.count({ where: { tenantId } }),
      this.prisma.site.count({ where: { tenantId } }),
      this.prisma.attendance.count({
        where: { tenantId, date: today },
      }),
      this.prisma.leaveApplication.count({
        where: { tenantId, status: 'PENDING' },
      }),
      this.prisma.overtimeApplication.count({
        where: { tenantId, status: 'PENDING' },
      }),
    ]);

    return {
      totalEmployees,
      activeEmployees,
      totalDepartments,
      totalSites,
      todayAttendance,
      pendingLeaves,
      pendingOvertime,
    };
  }
}
