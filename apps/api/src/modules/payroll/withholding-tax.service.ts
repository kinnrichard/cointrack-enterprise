import { Injectable } from '@nestjs/common';

// TRAIN Law 2025 Tax Brackets (Annual)
const TAX_BRACKETS = [
  { min: 0, max: 250000, baseTax: 0, rate: 0 },
  { min: 250001, max: 400000, baseTax: 0, rate: 0.15 },
  { min: 400001, max: 800000, baseTax: 22500, rate: 0.20 },
  { min: 800001, max: 2000000, baseTax: 102500, rate: 0.25 },
  { min: 2000001, max: 8000000, baseTax: 402500, rate: 0.30 },
  { min: 8000001, max: Infinity, baseTax: 2202500, rate: 0.35 },
];

export interface WithholdingTaxResult {
  annualTaxableIncome: number;
  annualTax: number;
  monthlyTax: number;
  semiMonthlyTax: number;
}

@Injectable()
export class WithholdingTaxService {
  /**
   * Calculate withholding tax based on monthly taxable income.
   * taxableIncome = grossPay - SSS - PhilHealth - PagIBIG - non-taxable allowances
   */
  calculate(monthlyTaxableIncome: number): WithholdingTaxResult {
    const annualTaxableIncome = Math.max(0, monthlyTaxableIncome) * 12;

    let annualTax = 0;
    const bracket = TAX_BRACKETS.find(
      (b) => annualTaxableIncome >= b.min && annualTaxableIncome <= b.max,
    );

    if (bracket && bracket.rate > 0) {
      annualTax = bracket.baseTax + (annualTaxableIncome - bracket.min + 1) * bracket.rate;
    }

    annualTax = Math.round(annualTax * 100) / 100;
    const monthlyTax = Math.round(annualTax / 12 * 100) / 100;
    const semiMonthlyTax = Math.round(annualTax / 24 * 100) / 100;

    return {
      annualTaxableIncome,
      annualTax,
      monthlyTax,
      semiMonthlyTax,
    };
  }

  /**
   * Calculate tax for a specific semi-monthly period.
   * For MONTHLY employees: use basicSalary as base (stable withholding).
   * For DAILY employees: use dailyRate × 26 as monthly estimate.
   */
  calculateForPayroll(params: {
    monthlySalary: number;
    sssContribution: number;
    philhealthContribution: number;
    pagibigContribution: number;
    payFrequency: 'SEMI_MONTHLY' | 'MONTHLY' | 'WEEKLY';
  }): number {
    const { monthlySalary, sssContribution, philhealthContribution, pagibigContribution, payFrequency } = params;

    // Monthly contributions (convert semi-monthly to monthly)
    const monthlySSS = sssContribution * 2;
    const monthlyPH = philhealthContribution * 2;
    const monthlyPI = pagibigContribution * 2;

    const monthlyTaxableIncome = monthlySalary - monthlySSS - monthlyPH - monthlyPI;
    const result = this.calculate(monthlyTaxableIncome);

    if (payFrequency === 'SEMI_MONTHLY') return result.semiMonthlyTax;
    if (payFrequency === 'MONTHLY') return result.monthlyTax;
    // WEEKLY: divide monthly by ~4.33
    return Math.round(result.monthlyTax / 4.33 * 100) / 100;
  }
}
