import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { PositionsModule } from './modules/positions/positions.module';
import { SitesModule } from './modules/sites/sites.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { RatesModule } from './modules/rates/rates.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { TimekeepingModule } from './modules/timekeeping/timekeeping.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { DeductionsModule } from './modules/deductions/deductions.module';
import { LoansModule } from './modules/loans/loans.module';
import { RolesModule } from './modules/roles/roles.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CompaniesModule } from './modules/companies/companies.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    HealthModule,
    CompaniesModule,
    DepartmentsModule,
    PositionsModule,
    SitesModule,
    EmployeesModule,
    SchedulesModule,
    RatesModule,
    HolidaysModule,
    AttendanceModule,
    TimekeepingModule,
    PayrollModule,
    LeavesModule,
    OvertimeModule,
    DeductionsModule,
    LoansModule,
    RolesModule,
    DashboardModule,
    SettingsModule,
    AuditModule,
    NotificationsModule,
  ],
})
export class AppModule {}
