import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Tenant Info ──────────────────────────────────────────────

  async getTenantInfo(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, companyName: true, companyCode: true, domain: true, logo: true, status: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  // ─── Company Settings ─────────────────────────────────────────

  async getCompanySettings(tenantId: string) {
    let setting = await this.prisma.companySetting.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!setting) {
      setting = await this.prisma.companySetting.create({
        data: { tenantId },
      });
    }
    return setting;
  }

  async updateCompanySettings(tenantId: string, data: any) {
    const setting = await this.getCompanySettings(tenantId);
    const fields = [
      'payrollDaysDivisor', 'payrollHourlyDivisor',
      'tinNumber', 'sssEmployerNumber', 'philhealthNumber', 'pagibigNumber',
      'birRegistrationNumber', 'rdoCode',
    ];
    const updateData: any = {};
    for (const f of fields) if (data[f] !== undefined) updateData[f] = data[f];
    return this.prisma.companySetting.update({ where: { id: setting.id }, data: updateData });
  }

  // ─── Government Contribution Settings ─────────────────────────

  async getGovContribSettings(tenantId: string) {
    let setting = await this.prisma.governmentContributionSetting.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!setting) {
      setting = await this.prisma.governmentContributionSetting.create({
        data: { tenantId },
      });
    }
    return setting;
  }

  async updateGovContribSettings(tenantId: string, data: any) {
    const setting = await this.getGovContribSettings(tenantId);
    const fields = ['useActualEarnings', 'deductionFrequency', 'monthlyDeductionCutoff'];
    const updateData: any = {};
    for (const f of fields) if (data[f] !== undefined) updateData[f] = data[f];
    return this.prisma.governmentContributionSetting.update({ where: { id: setting.id }, data: updateData });
  }

  // ─── Attendance Settings ──────────────────────────────────────

  async getAttendanceSettings(tenantId: string) {
    let setting = await this.prisma.attendanceSetting.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!setting) {
      setting = await this.prisma.attendanceSetting.create({
        data: { tenantId },
      });
    }
    return setting;
  }

  async updateAttendanceSettings(tenantId: string, data: any) {
    const setting = await this.getAttendanceSettings(tenantId);
    const fields = [
      'breakDurationMinutes', 'minimumHoursForBreak', 'nightDiffStartHour', 'nightDiffEndHour',
      'lateGracePeriodMinutes', 'undertimeGracePeriodMinutes', 'minimumOvertimeMinutes',
      'timeRoundingInterval', 'roundingMethod',
    ];
    const updateData: any = {};
    for (const f of fields) if (data[f] !== undefined) updateData[f] = data[f];
    return this.prisma.attendanceSetting.update({ where: { id: setting.id }, data: updateData });
  }

  // ─── Leave Settings ───────────────────────────────────────────

  async getLeaveSettings(tenantId: string) {
    let setting = await this.prisma.leaveSetting.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!setting) {
      setting = await this.prisma.leaveSetting.create({
        data: { tenantId },
      });
    }
    return setting;
  }

  async updateLeaveSettings(tenantId: string, data: any) {
    const setting = await this.getLeaveSettings(tenantId);
    const fields = ['vacationLeaveAdvanceNoticeDays', 'sickLeaveAdvanceNoticeDays'];
    const updateData: any = {};
    for (const f of fields) if (data[f] !== undefined) updateData[f] = data[f];
    return this.prisma.leaveSetting.update({ where: { id: setting.id }, data: updateData });
  }

  // ─── Leave Credit Settings ────────────────────────────────────

  async getLeaveCreditSettings(tenantId: string) {
    let setting = await this.prisma.leaveCreditSetting.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!setting) {
      setting = await this.prisma.leaveCreditSetting.create({
        data: { tenantId },
      });
    }
    return setting;
  }

  async updateLeaveCreditSettings(tenantId: string, data: any) {
    const setting = await this.getLeaveCreditSettings(tenantId);
    const fields = ['vacationLeavePerYear', 'sickLeavePerYear', 'accrualMethod', 'allowCarryOver', 'maxCarryOverDays', 'allowCashConversion'];
    const updateData: any = {};
    for (const f of fields) if (data[f] !== undefined) updateData[f] = data[f];
    return this.prisma.leaveCreditSetting.update({ where: { id: setting.id }, data: updateData });
  }

  // ─── Overtime Settings ────────────────────────────────────────

  async getOvertimeSettings(tenantId: string) {
    let setting = await this.prisma.overtimeSetting.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!setting) {
      setting = await this.prisma.overtimeSetting.create({
        data: { tenantId },
      });
    }
    return setting;
  }

  async updateOvertimeSettings(tenantId: string, data: any) {
    const setting = await this.getOvertimeSettings(tenantId);
    const fields = ['minimumOvertimeHours', 'minimumOvertimeMinutes', 'mustNotBeLate', 'requireOvertimeFiling', 'maxLateFilingDays'];
    const updateData: any = {};
    for (const f of fields) if (data[f] !== undefined) updateData[f] = data[f];
    return this.prisma.overtimeSetting.update({ where: { id: setting.id }, data: updateData });
  }

  // ─── Holiday Settings ─────────────────────────────────────────

  async getHolidaySettings(tenantId: string) {
    let setting = await this.prisma.holidaySetting.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!setting) {
      setting = await this.prisma.holidaySetting.create({
        data: { tenantId },
      });
    }
    return setting;
  }

  async updateHolidaySettings(tenantId: string, data: any) {
    const setting = await this.getHolidaySettings(tenantId);
    const fields = ['beforeHolidayValue', 'beforeHolidayUnit', 'afterHolidayValue', 'afterHolidayUnit'];
    const updateData: any = {};
    for (const f of fields) if (data[f] !== undefined) updateData[f] = data[f];
    return this.prisma.holidaySetting.update({ where: { id: setting.id }, data: updateData });
  }

  // ─── Rate Calculation Settings ──────────────────────────────

  async getRateCalcSettings(tenantId: string) {
    let setting = await this.prisma.rateCalculationSetting.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!setting) {
      setting = await this.prisma.rateCalculationSetting.create({ data: { tenantId } });
    }
    return setting;
  }

  async updateRateCalcSettings(tenantId: string, data: any) {
    const setting = await this.getRateCalcSettings(tenantId);
    const fields = [
      'nightDiffMultiplier', 'overtimeMultiplier', 'overtimeNightDiffMultiplier',
      'restdayOrSpecialHolidayMultiplier', 'restdayOrSpecialHolidayNightDiffMultiplier',
      'restdayOrSpecialHolidayOvertimeMultiplier', 'restdayOrSpecialHolidayOvertimeNDMultiplier',
      'legalHolidayMultiplier', 'legalHolidayNightDiffMultiplier',
      'legalHolidayOvertimeMultiplier', 'legalHolidayOvertimeNDMultiplier',
      'legalOnSpecialHolidayMultiplier', 'legalOnSpecialHolidayNightDiffMultiplier',
      'legalOnSpecialHolidayOvertimeMultiplier', 'legalOnSpecialHolidayOvertimeNDMultiplier',
    ];
    const updateData: any = {};
    for (const f of fields) if (data[f] !== undefined) updateData[f] = data[f];
    return this.prisma.rateCalculationSetting.update({ where: { id: setting.id }, data: updateData });
  }

  // ─── Payroll Period Settings ──────────────────────────────────

  async getPayrollPeriods(tenantId: string, year?: number) {
    const where: any = { tenantId };
    if (year) where.year = year;
    return this.prisma.payrollPeriodSetting.findMany({ where, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  }

  async createPayrollPeriod(tenantId: string, data: any) {
    return this.prisma.payrollPeriodSetting.create({
      data: {
        tenantId,
        name: data.name || null,
        month: data.month,
        year: data.year,
        isBiMonthly: data.isBiMonthly ?? true,
        firstPeriodStart: new Date(data.firstPeriodStart),
        firstPeriodEnd: new Date(data.firstPeriodEnd),
        firstPayDate: new Date(data.firstPayDate),
        secondPeriodStart: data.secondPeriodStart ? new Date(data.secondPeriodStart) : null,
        secondPeriodEnd: data.secondPeriodEnd ? new Date(data.secondPeriodEnd) : null,
        secondPayDate: data.secondPayDate ? new Date(data.secondPayDate) : null,
      },
    });
  }

  async deletePayrollPeriod(tenantId: string, id: string) {
    const period = await this.prisma.payrollPeriodSetting.findFirst({ where: { id, tenantId } });
    if (!period) throw new NotFoundException('Payroll period not found');
    await this.prisma.payrollPeriodSetting.delete({ where: { id } });
    return { message: 'Payroll period deleted' };
  }

  // ─── Adjustment Types ─────────────────────────────────────────

  async getAdjustmentTypes(tenantId: string) {
    return this.prisma.adjustmentType.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async createAdjustmentType(tenantId: string, data: any) {
    return this.prisma.adjustmentType.create({
      data: { tenantId, name: data.name, type: data.type, isActive: data.isActive ?? true },
    });
  }

  async updateAdjustmentType(tenantId: string, id: string, data: any) {
    const adj = await this.prisma.adjustmentType.findFirst({ where: { id, tenantId } });
    if (!adj) throw new NotFoundException('Adjustment type not found');
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    return this.prisma.adjustmentType.update({ where: { id }, data: updateData });
  }

  async deleteAdjustmentType(tenantId: string, id: string) {
    const adj = await this.prisma.adjustmentType.findFirst({ where: { id, tenantId } });
    if (!adj) throw new NotFoundException('Adjustment type not found');
    await this.prisma.adjustmentType.delete({ where: { id } });
    return { message: 'Adjustment type deleted' };
  }

  // ─── Tax Table ────────────────────────────────────────────────

  async getTaxTables(tenantId: string, year?: number) {
    const where: any = { tenantId, isActive: true };
    if (year) where.year = year;
    return this.prisma.taxTable.findMany({ where, orderBy: { bracketOrder: 'asc' } });
  }

  async createTaxBracket(tenantId: string, data: any) {
    return this.prisma.taxTable.create({
      data: {
        tenantId,
        name: data.name,
        year: data.year,
        minIncome: data.minIncome,
        maxIncome: data.maxIncome || null,
        baseTax: data.baseTax || 0,
        rate: data.rate,
        bracketOrder: data.bracketOrder,
      },
    });
  }

  async updateTaxBracket(tenantId: string, id: string, data: any) {
    const bracket = await this.prisma.taxTable.findFirst({ where: { id, tenantId } });
    if (!bracket) throw new NotFoundException('Tax bracket not found');
    const updateData: any = {};
    const fields = ['name', 'year', 'minIncome', 'maxIncome', 'baseTax', 'rate', 'bracketOrder', 'isActive'];
    for (const f of fields) if (data[f] !== undefined) updateData[f] = data[f];
    return this.prisma.taxTable.update({ where: { id }, data: updateData });
  }

  async deleteTaxBracket(tenantId: string, id: string) {
    const bracket = await this.prisma.taxTable.findFirst({ where: { id, tenantId } });
    if (!bracket) throw new NotFoundException('Tax bracket not found');
    await this.prisma.taxTable.delete({ where: { id } });
    return { message: 'Tax bracket deleted' };
  }

  // ─── All Settings (aggregated) ────────────────────────────────

  async getAllSettings(tenantId: string) {
    const [company, rateCalc, govContrib, attendance, leave, leaveCredit, overtime, holiday] = await Promise.all([
      this.getCompanySettings(tenantId),
      this.getRateCalcSettings(tenantId),
      this.getGovContribSettings(tenantId),
      this.getAttendanceSettings(tenantId),
      this.getLeaveSettings(tenantId),
      this.getLeaveCreditSettings(tenantId),
      this.getOvertimeSettings(tenantId),
      this.getHolidaySettings(tenantId),
    ]);
    return { company, rateCalc, govContrib, attendance, leave, leaveCredit, overtime, holiday };
  }
}
