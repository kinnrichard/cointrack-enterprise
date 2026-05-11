import { Injectable } from '@nestjs/common';

export interface PagIBIGResult {
  employeeShare: number;
  employerShare: number;
  total: number;
}

@Injectable()
export class PagIBIGContributionService {
  private readonly MAX_CONTRIBUTION = 100;

  calculate(monthlySalary: number): PagIBIGResult {
    const eeRate = monthlySalary <= 1500 ? 0.01 : 0.02;
    const erRate = 0.02;

    const eeRaw = monthlySalary * eeRate;
    const erRaw = monthlySalary * erRate;

    const employeeShare = Math.min(Math.round(eeRaw * 100) / 100, this.MAX_CONTRIBUTION);
    const employerShare = Math.min(Math.round(erRaw * 100) / 100, this.MAX_CONTRIBUTION);

    return {
      employeeShare,
      employerShare,
      total: employeeShare + employerShare,
    };
  }

  calculateSemiMonthly(monthlySalary: number, isFirstCutoff: boolean): PagIBIGResult {
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
