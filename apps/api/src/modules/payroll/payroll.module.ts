import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { SSSContributionService } from './sss-contribution.service';
import { PhilHealthContributionService } from './philhealth-contribution.service';
import { PagIBIGContributionService } from './pagibig-contribution.service';
import { WithholdingTaxService } from './withholding-tax.service';

@Module({
  controllers: [PayrollController],
  providers: [
    PayrollService,
    SSSContributionService,
    PhilHealthContributionService,
    PagIBIGContributionService,
    WithholdingTaxService,
  ],
  exports: [
    PayrollService,
    SSSContributionService,
    PhilHealthContributionService,
    PagIBIGContributionService,
    WithholdingTaxService,
  ],
})
export class PayrollModule {}
