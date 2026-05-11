import { Injectable } from '@nestjs/common';

// 2025 SSS Contribution Table
const SSS_TABLE = [
  { min: 0, max: 4249.99, msc: 4000, ee: 180, er: 380, ecc: 10 },
  { min: 4250, max: 4749.99, msc: 4500, ee: 202.5, er: 427.5, ecc: 10 },
  { min: 4750, max: 5249.99, msc: 5000, ee: 225, er: 475, ecc: 10 },
  { min: 5250, max: 5749.99, msc: 5500, ee: 247.5, er: 522.5, ecc: 10 },
  { min: 5750, max: 6249.99, msc: 6000, ee: 270, er: 570, ecc: 10 },
  { min: 6250, max: 6749.99, msc: 6500, ee: 292.5, er: 617.5, ecc: 10 },
  { min: 6750, max: 7249.99, msc: 7000, ee: 315, er: 665, ecc: 10 },
  { min: 7250, max: 7749.99, msc: 7500, ee: 337.5, er: 712.5, ecc: 10 },
  { min: 7750, max: 8249.99, msc: 8000, ee: 360, er: 760, ecc: 10 },
  { min: 8250, max: 8749.99, msc: 8500, ee: 382.5, er: 807.5, ecc: 10 },
  { min: 8750, max: 9249.99, msc: 9000, ee: 405, er: 855, ecc: 10 },
  { min: 9250, max: 9749.99, msc: 9500, ee: 427.5, er: 902.5, ecc: 10 },
  { min: 9750, max: 10249.99, msc: 10000, ee: 450, er: 950, ecc: 10 },
  { min: 10250, max: 10749.99, msc: 10500, ee: 472.5, er: 997.5, ecc: 10 },
  { min: 10750, max: 11249.99, msc: 11000, ee: 495, er: 1045, ecc: 10 },
  { min: 11250, max: 11749.99, msc: 11500, ee: 517.5, er: 1092.5, ecc: 10 },
  { min: 11750, max: 12249.99, msc: 12000, ee: 540, er: 1140, ecc: 10 },
  { min: 12250, max: 12749.99, msc: 12500, ee: 562.5, er: 1187.5, ecc: 10 },
  { min: 12750, max: 13249.99, msc: 13000, ee: 585, er: 1235, ecc: 10 },
  { min: 13250, max: 13749.99, msc: 13500, ee: 607.5, er: 1282.5, ecc: 10 },
  { min: 13750, max: 14249.99, msc: 14000, ee: 630, er: 1330, ecc: 10 },
  { min: 14250, max: 14749.99, msc: 14500, ee: 652.5, er: 1377.5, ecc: 10 },
  { min: 14750, max: 15249.99, msc: 15000, ee: 675, er: 1425, ecc: 10 },
  { min: 15250, max: 15749.99, msc: 15500, ee: 697.5, er: 1472.5, ecc: 10 },
  { min: 15750, max: 16249.99, msc: 16000, ee: 720, er: 1520, ecc: 10 },
  { min: 16250, max: 16749.99, msc: 16500, ee: 742.5, er: 1567.5, ecc: 10 },
  { min: 16750, max: 17249.99, msc: 17000, ee: 765, er: 1615, ecc: 10 },
  { min: 17250, max: 17749.99, msc: 17500, ee: 787.5, er: 1662.5, ecc: 10 },
  { min: 17750, max: 18249.99, msc: 18000, ee: 810, er: 1710, ecc: 10 },
  { min: 18250, max: 18749.99, msc: 18500, ee: 832.5, er: 1757.5, ecc: 10 },
  { min: 18750, max: 19249.99, msc: 19000, ee: 855, er: 1805, ecc: 10 },
  { min: 19250, max: 19749.99, msc: 19500, ee: 877.5, er: 1852.5, ecc: 10 },
  { min: 19750, max: 20249.99, msc: 20000, ee: 900, er: 1900, ecc: 10 },
  // Above 20k: Regular SS capped + MPF
  { min: 20250, max: 20749.99, msc: 20500, ee: 925, er: 1950, ecc: 30 },
  { min: 20750, max: 21249.99, msc: 21000, ee: 950, er: 2000, ecc: 30 },
  { min: 21250, max: 21749.99, msc: 21500, ee: 975, er: 2050, ecc: 30 },
  { min: 21750, max: 22249.99, msc: 22000, ee: 1000, er: 2100, ecc: 30 },
  { min: 22250, max: 22749.99, msc: 22500, ee: 1025, er: 2150, ecc: 30 },
  { min: 22750, max: 23249.99, msc: 23000, ee: 1050, er: 2200, ecc: 30 },
  { min: 23250, max: 23749.99, msc: 23500, ee: 1075, er: 2250, ecc: 30 },
  { min: 23750, max: 24249.99, msc: 24000, ee: 1100, er: 2300, ecc: 30 },
  { min: 24250, max: 24749.99, msc: 24500, ee: 1125, er: 2350, ecc: 30 },
  { min: 24750, max: 25249.99, msc: 25000, ee: 1150, er: 2400, ecc: 30 },
  { min: 25250, max: 25749.99, msc: 25500, ee: 1175, er: 2450, ecc: 30 },
  { min: 25750, max: 26249.99, msc: 26000, ee: 1200, er: 2500, ecc: 30 },
  { min: 26250, max: 26749.99, msc: 26500, ee: 1225, er: 2550, ecc: 30 },
  { min: 26750, max: 27249.99, msc: 27000, ee: 1250, er: 2600, ecc: 30 },
  { min: 27250, max: 27749.99, msc: 27500, ee: 1275, er: 2650, ecc: 30 },
  { min: 27750, max: 28249.99, msc: 28000, ee: 1300, er: 2700, ecc: 30 },
  { min: 28250, max: 28749.99, msc: 28500, ee: 1325, er: 2750, ecc: 30 },
  { min: 28750, max: 29249.99, msc: 29000, ee: 1350, er: 2800, ecc: 30 },
  { min: 29250, max: 29749.99, msc: 29500, ee: 1375, er: 2850, ecc: 30 },
  { min: 29750, max: Infinity, msc: 30000, ee: 1400, er: 2900, ecc: 30 },
];

export interface SSSResult {
  employeeShare: number;
  employerShare: number;
  ecc: number;
  total: number;
}

@Injectable()
export class SSSContributionService {
  calculate(monthlySalary: number): SSSResult {
    const salary = Math.max(0, monthlySalary);
    const bracket = SSS_TABLE.find((b) => salary >= b.min && salary <= b.max)
      || SSS_TABLE[SSS_TABLE.length - 1];

    return {
      employeeShare: bracket.ee,
      employerShare: bracket.er,
      ecc: bracket.ecc,
      total: bracket.ee + bracket.er + bracket.ecc,
    };
  }

  calculateSemiMonthly(monthlySalary: number, isFirstCutoff: boolean): SSSResult {
    const monthly = this.calculate(monthlySalary);
    if (isFirstCutoff) {
      return {
        employeeShare: Math.round(monthly.employeeShare / 2 * 100) / 100,
        employerShare: Math.round(monthly.employerShare / 2 * 100) / 100,
        ecc: Math.round(monthly.ecc / 2 * 100) / 100,
        total: Math.round(monthly.total / 2 * 100) / 100,
      };
    }
    // Second cutoff gets the remainder to avoid rounding errors
    const firstHalf = Math.round(monthly.employeeShare / 2 * 100) / 100;
    return {
      employeeShare: monthly.employeeShare - firstHalf,
      employerShare: monthly.employerShare - Math.round(monthly.employerShare / 2 * 100) / 100,
      ecc: monthly.ecc - Math.round(monthly.ecc / 2 * 100) / 100,
      total: monthly.total - Math.round(monthly.total / 2 * 100) / 100,
    };
  }
}
