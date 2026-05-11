import { Injectable } from '@nestjs/common';

export interface PhilHealthResult {
  employeeShare: number;
  employerShare: number;
  total: number;
}

@Injectable()
export class PhilHealthContributionService {
  private readonly RATE = 0.05; // 5% total (2.5% EE + 2.5% ER)
  private readonly MIN_SALARY = 10000;
  private readonly MAX_SALARY = 100000;

  calculate(monthlySalary: number): PhilHealthResult {
    const base = Math.min(Math.max(monthlySalary, this.MIN_SALARY), this.MAX_SALARY);
    const total = Math.round(base * this.RATE * 100) / 100;
    const employeeShare = Math.round(total / 2 * 100) / 100;
    const employerShare = total - employeeShare;

    return { employeeShare, employerShare, total };
  }

  calculateSemiMonthly(monthlySalary: number, isFirstCutoff: boolean): PhilHealthResult {
    const monthly = this.calculate(monthlySalary);
    if (isFirstCutoff) {
      return {
        employeeShare: Math.round(monthly.employeeShare / 2 * 100) / 100,
        employerShare: Math.round(monthly.employerShare / 2 * 100) / 100,
        total: Math.round(monthly.total / 2 * 100) / 100,
      };
    }
    const firstHalf = Math.round(monthly.employeeShare / 2 * 100) / 100;
    return {
      employeeShare: monthly.employeeShare - firstHalf,
      employerShare: monthly.employerShare - Math.round(monthly.employerShare / 2 * 100) / 100,
      total: monthly.total - Math.round(monthly.total / 2 * 100) / 100,
    };
  }
}
