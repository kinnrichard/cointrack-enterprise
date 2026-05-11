import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SSSContributionService } from './sss-contribution.service';
import { PhilHealthContributionService } from './philhealth-contribution.service';
import { PagIBIGContributionService } from './pagibig-contribution.service';
import { WithholdingTaxService } from './withholding-tax.service';

export interface TimekeepingHours {
  regularHours: number;
  overtimeHours: number;
  nightDiffHours: number;
  nightDiffOTHours: number;
  // Rest Day / Special Holiday
  restDaySpecialHours: number;
  restDaySpecialOTHours: number;
  restDaySpecialNDHours: number;
  restDaySpecialNDOTHours: number;
  // Legal Holiday
  legalHolidayHours: number;
  legalHolidayOTHours: number;
  legalHolidayNDHours: number;
  legalHolidayNDOTHours: number;
  // Double Holiday
  doubleHolidayHours: number;
  doubleHolidayOTHours: number;
  doubleHolidayNDHours: number;
  doubleHolidayNDOTHours: number;
  // Late / Undertime
  totalLateMinutes: number;
  totalUndertimeMinutes: number;
  // Summary
  daysWorked: number;
  daysAbsent: number;
}

export interface EmployeePayrollInput {
  employeeId: string;
  payType: 'MONTHLY' | 'DAILY';
  payFrequency: 'SEMI_MONTHLY' | 'MONTHLY' | 'WEEKLY';
  basicSalary: number;  // monthly salary
  dailyRate: number;
  hourlyRate: number;
  // Allowances (per cutoff)
  riceAllowance: number;
  clothingAllowance: number;
  laundryAllowance: number;
  otherAllowance: number;
  // Exemptions
  sssExempt: boolean;
  philhealthExempt: boolean;
  pagibigExempt: boolean;
  taxExempt: boolean;
  // Timekeeping data
  hours: TimekeepingHours;
  isFirstCutoff: boolean;
}

export interface PayrollResult {
  // Earnings
  basicPay: number;
  regularOTPay: number;
  nightDiffPay: number;
  nightDiffOTPay: number;
  restDayPay: number;
  restDayOTPay: number;
  restDayNDPay: number;
  restDayNDOTPay: number;
  specialHolidayPay: number;
  specialHolidayOTPay: number;
  legalHolidayPay: number;
  legalHolidayOTPay: number;
  doubleHolidayPay: number;
  doubleHolidayOTPay: number;
  // Allowances
  riceAllowance: number;
  clothingAllowance: number;
  laundryAllowance: number;
  otherAllowance: number;
  // Deductions
  lateDeduction: number;
  undertimeDeduction: number;
  absentDeduction: number;
  // Government
  sssContribution: number;
  philhealthContribution: number;
  pagibigContribution: number;
  withholdingTax: number;
  // Totals
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  daysWorked: number;
}

@Injectable()
export class PayrollCalculatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sssService: SSSContributionService,
    private readonly philhealthService: PhilHealthContributionService,
    private readonly pagibigService: PagIBIGContributionService,
    private readonly taxService: WithholdingTaxService,
  ) {}

  async calculate(input: EmployeePayrollInput, tenantId: string): Promise<PayrollResult> {
    const { hours, payType, payFrequency, basicSalary, dailyRate, hourlyRate } = input;

    // Get rate calculation settings
    const rateSettings = await this.getRateSettings(tenantId);
    const companySettings = await this.getCompanySettings(tenantId);

    const daysDivisor = companySettings?.payrollDaysDivisor ?? 26;
    const hoursDivisor = companySettings?.payrollHourlyDivisor ?? 8;

    // Compute hourly rate
    let effectiveHourlyRate = Number(hourlyRate) || 0;
    if (payType === 'MONTHLY' && basicSalary > 0) {
      effectiveHourlyRate = Number(basicSalary) / daysDivisor / hoursDivisor;
    } else if (payType === 'DAILY' && dailyRate > 0) {
      effectiveHourlyRate = Number(dailyRate) / hoursDivisor;
    }

    const hr = effectiveHourlyRate;

    // ─── Basic Pay ──────────────────────────────────────────────
    let basicPay = 0;
    if (payType === 'MONTHLY') {
      // Semi-monthly: half of monthly salary minus absent deductions
      basicPay = Number(basicSalary) / 2;
    } else {
      // Daily: hours worked × hourly rate
      basicPay = Number(hours.regularHours) * hr;
    }

    // ─── Premium Pay (using multipliers) ────────────────────────
    const m = rateSettings;

    // Regular OT
    const regularOTPay = round(hours.overtimeHours * hr * num(m.overtimeMultiplier));
    // Night Diff
    const nightDiffPay = round(hours.nightDiffHours * hr * num(m.nightDiffMultiplier));
    // Night Diff OT
    const nightDiffOTPay = round(hours.nightDiffOTHours * (hr * num(m.overtimeMultiplier)) * num(m.overtimeNightDiffMultiplier));

    // Rest Day / Special Holiday
    const restDayPay = round(hours.restDaySpecialHours * hr * num(m.restdayOrSpecialHolidayMultiplier));
    const restDayOTPay = round(hours.restDaySpecialOTHours * hr * num(m.restdayOrSpecialHolidayOvertimeMultiplier));
    const restDayNDPay = round(hours.restDaySpecialNDHours * (hr * num(m.restdayOrSpecialHolidayMultiplier)) * num(m.restdayOrSpecialHolidayNightDiffMultiplier));
    const restDayNDOTPay = round(hours.restDaySpecialNDOTHours * (hr * num(m.restdayOrSpecialHolidayOvertimeMultiplier)) * num(m.restdayOrSpecialHolidayOvertimeNDMultiplier));

    // Legal Holiday
    const legalHolidayPay = round(hours.legalHolidayHours * hr * num(m.legalHolidayMultiplier));
    const legalHolidayOTPay = round(hours.legalHolidayOTHours * hr * num(m.legalHolidayOvertimeMultiplier));
    const specialHolidayPay = round(hours.legalHolidayNDHours * (hr * num(m.legalHolidayMultiplier)) * num(m.legalHolidayNightDiffMultiplier));
    const specialHolidayOTPay = round(hours.legalHolidayNDOTHours * (hr * num(m.legalHolidayOvertimeMultiplier)) * num(m.legalHolidayOvertimeNDMultiplier));

    // Double Holiday
    const doubleHolidayPay = round(hours.doubleHolidayHours * hr * num(m.legalOnSpecialHolidayMultiplier));
    const doubleHolidayOTPay = round(hours.doubleHolidayOTHours * hr * num(m.legalOnSpecialHolidayOvertimeMultiplier));

    // ─── Allowances ─────────────────────────────────────────────
    const riceAllowance = Number(input.riceAllowance) || 0;
    const clothingAllowance = Number(input.clothingAllowance) || 0;
    const laundryAllowance = Number(input.laundryAllowance) || 0;
    const otherAllowance = Number(input.otherAllowance) || 0;

    // ─── Late/Undertime Deductions (MONTHLY only) ───────────────
    let lateDeduction = 0;
    let undertimeDeduction = 0;
    let absentDeduction = 0;

    if (payType === 'MONTHLY') {
      const lateHours = hours.totalLateMinutes / 60;
      const undertimeHours = hours.totalUndertimeMinutes / 60;
      lateDeduction = round(lateHours * hr);
      undertimeDeduction = round(undertimeHours * hr);
      absentDeduction = round(hours.daysAbsent * Number(dailyRate));
    }

    // ─── Gross Pay ──────────────────────────────────────────────
    const grossPay = round(
      basicPay + regularOTPay + nightDiffPay + nightDiffOTPay
      + restDayPay + restDayOTPay + restDayNDPay + restDayNDOTPay
      + legalHolidayPay + legalHolidayOTPay + specialHolidayPay + specialHolidayOTPay
      + doubleHolidayPay + doubleHolidayOTPay
      + riceAllowance + clothingAllowance + laundryAllowance + otherAllowance,
    );

    // ─── Government Contributions ───────────────────────────────
    const monthlySalary = payType === 'MONTHLY'
      ? Number(basicSalary)
      : Number(dailyRate) * daysDivisor;

    let sssContribution = 0;
    if (!input.sssExempt) {
      const sss = this.sssService.calculateSemiMonthly(monthlySalary, input.isFirstCutoff);
      sssContribution = sss.employeeShare;
    }

    let philhealthContribution = 0;
    if (!input.philhealthExempt) {
      const ph = this.philhealthService.calculateSemiMonthly(monthlySalary, input.isFirstCutoff);
      philhealthContribution = ph.employeeShare;
    }

    let pagibigContribution = 0;
    if (!input.pagibigExempt) {
      const pi = this.pagibigService.calculateSemiMonthly(monthlySalary, input.isFirstCutoff);
      pagibigContribution = pi.employeeShare;
    }

    // ─── Withholding Tax ────────────────────────────────────────
    let withholdingTax = 0;
    if (!input.taxExempt) {
      withholdingTax = this.taxService.calculateForPayroll({
        monthlySalary,
        sssContribution,
        philhealthContribution,
        pagibigContribution,
        payFrequency: payFrequency as any,
      });
    }

    // ─── Total Deductions ───────────────────────────────────────
    const totalDeductions = round(
      lateDeduction + undertimeDeduction + absentDeduction
      + sssContribution + philhealthContribution + pagibigContribution + withholdingTax,
    );

    // ─── Net Pay ────────────────────────────────────────────────
    const netPay = round(grossPay - totalDeductions);

    return {
      basicPay: round(basicPay),
      regularOTPay, nightDiffPay, nightDiffOTPay,
      restDayPay, restDayOTPay, restDayNDPay, restDayNDOTPay,
      specialHolidayPay, specialHolidayOTPay,
      legalHolidayPay, legalHolidayOTPay,
      doubleHolidayPay, doubleHolidayOTPay,
      riceAllowance, clothingAllowance, laundryAllowance, otherAllowance,
      lateDeduction, undertimeDeduction, absentDeduction,
      sssContribution, philhealthContribution, pagibigContribution, withholdingTax,
      grossPay, totalDeductions, netPay,
      daysWorked: hours.daysWorked,
    };
  }

  private async getRateSettings(tenantId: string) {
    const setting = await this.prisma.rateCalculationSetting.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    // Return setting or defaults
    return setting || {
      nightDiffMultiplier: 0.10,
      overtimeMultiplier: 1.25,
      overtimeNightDiffMultiplier: 0.10,
      restdayOrSpecialHolidayMultiplier: 1.30,
      restdayOrSpecialHolidayNightDiffMultiplier: 0.10,
      restdayOrSpecialHolidayOvertimeMultiplier: 1.69,
      restdayOrSpecialHolidayOvertimeNDMultiplier: 0.10,
      legalHolidayMultiplier: 2.00,
      legalHolidayNightDiffMultiplier: 0.10,
      legalHolidayOvertimeMultiplier: 2.50,
      legalHolidayOvertimeNDMultiplier: 0.10,
      legalOnSpecialHolidayMultiplier: 2.60,
      legalOnSpecialHolidayNightDiffMultiplier: 0.10,
      legalOnSpecialHolidayOvertimeMultiplier: 3.38,
      legalOnSpecialHolidayOvertimeNDMultiplier: 0.10,
    };
  }

  private async getCompanySettings(tenantId: string) {
    return this.prisma.companySetting.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function num(val: any): number {
  return Number(val) || 0;
}
