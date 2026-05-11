import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PayrollCalculatorService, TimekeepingHours } from './payroll-calculator.service';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: PayrollCalculatorService,
  ) {}

  async findAll(
    tenantId: string,
    params: {
      page?: number; limit?: number; employeeId?: string;
      status?: string; startDate?: string; endDate?: string;
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
        where, skip, take: limit,
        orderBy: { periodStart: 'desc' },
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } } },
      }),
      this.prisma.payroll.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id, tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        adjustments: true,
      },
    });
    if (!payroll) throw new NotFoundException('Payroll record not found');
    return payroll;
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

  /**
   * Process payroll from a completed timekeeping period.
   * Creates payroll records for all employees in the timekeeping.
   */
  async processFromTimekeeping(tenantId: string, timekeepingId: string) {
    const timekeeping = await this.prisma.timekeeping.findFirst({
      where: { id: timekeepingId, tenantId },
    });
    if (!timekeeping) throw new NotFoundException('Timekeeping not found');
    if (timekeeping.status !== 'COMPLETED') throw new BadRequestException('Timekeeping must be completed first');

    // Get all timekeeping data with employee info
    const tkData = await this.prisma.timekeepingData.findMany({
      where: { timekeepingId },
      include: {
        employee: {
          select: {
            id: true, payType: true, payFrequency: true,
            basicSalary: true, dailyRate: true, hourlyRate: true,
            riceAllowance: true, clothingAllowance: true,
            laundryAllowance: true, otherAllowance: true,
            sssExempt: true, philhealthExempt: true,
            pagibigExempt: true, taxExempt: true,
          },
        },
      },
    });

    // Determine if first or second cutoff
    const startDay = timekeeping.startDate.getDate();
    const isFirstCutoff = startDay <= 15;

    // Delete existing payroll for this period
    await this.prisma.payroll.deleteMany({
      where: {
        tenantId,
        periodStart: timekeeping.startDate,
        periodEnd: timekeeping.endDate,
      },
    });

    const results = [];

    for (const td of tkData) {
      const emp = td.employee;
      const hours: TimekeepingHours = {
        regularHours: Number(td.regularHours),
        overtimeHours: Number(td.overtimeHours),
        nightDiffHours: Number(td.nightDiffHours),
        nightDiffOTHours: Number(td.nightDiffOTHours),
        restDaySpecialHours: Number(td.restDaySpecialHours),
        restDaySpecialOTHours: Number(td.restDaySpecialOTHours),
        restDaySpecialNDHours: Number(td.restDaySpecialNDHours),
        restDaySpecialNDOTHours: Number(td.restDaySpecialNDOTHours),
        legalHolidayHours: Number(td.legalHolidayHours),
        legalHolidayOTHours: Number(td.legalHolidayOTHours),
        legalHolidayNDHours: Number(td.legalHolidayNDHours),
        legalHolidayNDOTHours: Number(td.legalHolidayNDOTHours),
        doubleHolidayHours: Number(td.doubleHolidayHours),
        doubleHolidayOTHours: Number(td.doubleHolidayOTHours),
        doubleHolidayNDHours: Number(td.doubleHolidayNDHours),
        doubleHolidayNDOTHours: Number(td.doubleHolidayNDOTHours),
        totalLateMinutes: Number(td.totalLateMinutes),
        totalUndertimeMinutes: Number(td.totalUndertimeMinutes),
        daysWorked: Number(td.daysWorked),
        daysAbsent: Number(td.daysAbsent),
      };

      const result = await this.calculator.calculate({
        employeeId: emp.id,
        payType: emp.payType as any,
        payFrequency: emp.payFrequency as any,
        basicSalary: Number(emp.basicSalary),
        dailyRate: Number(emp.dailyRate),
        hourlyRate: Number(emp.hourlyRate),
        riceAllowance: Number(emp.riceAllowance),
        clothingAllowance: Number(emp.clothingAllowance),
        laundryAllowance: Number(emp.laundryAllowance),
        otherAllowance: Number(emp.otherAllowance),
        sssExempt: emp.sssExempt,
        philhealthExempt: emp.philhealthExempt,
        pagibigExempt: emp.pagibigExempt,
        taxExempt: emp.taxExempt,
        hours,
        isFirstCutoff,
      }, tenantId);

      const payroll = await this.prisma.payroll.create({
        data: {
          tenantId,
          employeeId: emp.id,
          periodStart: timekeeping.startDate,
          periodEnd: timekeeping.endDate,
          payDate: timekeeping.payDate,
          cutoffType: timekeeping.cutoffType,
          status: 'DRAFT',
          basicPay: result.basicPay,
          daysWorked: result.daysWorked,
          regularOTPay: result.regularOTPay,
          nightDiffPay: result.nightDiffPay,
          nightDiffOTPay: result.nightDiffOTPay,
          restDayPay: result.restDayPay,
          restDayOTPay: result.restDayOTPay,
          restDayNDPay: result.restDayNDPay,
          restDayNDOTPay: result.restDayNDOTPay,
          specialHolidayPay: result.specialHolidayPay,
          specialHolidayOTPay: result.specialHolidayOTPay,
          legalHolidayPay: result.legalHolidayPay,
          legalHolidayOTPay: result.legalHolidayOTPay,
          doubleHolidayPay: result.doubleHolidayPay,
          doubleHolidayOTPay: result.doubleHolidayOTPay,
          riceAllowance: result.riceAllowance,
          clothingAllowance: result.clothingAllowance,
          laundryAllowance: result.laundryAllowance,
          otherAllowance: result.otherAllowance,
          lateDeduction: result.lateDeduction,
          undertimeDeduction: result.undertimeDeduction,
          absentDeduction: result.absentDeduction,
          sssContribution: result.sssContribution,
          philhealthContribution: result.philhealthContribution,
          pagibigContribution: result.pagibigContribution,
          withholdingTax: result.withholdingTax,
          grossPay: result.grossPay,
          totalDeductions: result.totalDeductions,
          netPay: result.netPay,
        },
      });

      results.push(payroll);
    }

    return {
      message: 'Payroll processed',
      employeesProcessed: results.length,
      periodStart: timekeeping.startDate,
      periodEnd: timekeeping.endDate,
    };
  }
}
