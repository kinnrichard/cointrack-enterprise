import { Controller, Get, Put, Post, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // All settings aggregated
  @Get()
  getAll(@Req() req: any) {
    return this.settingsService.getAllSettings(req.user.tenantId);
  }

  // Company Settings
  @Get('company')
  getCompanySettings(@Req() req: any) {
    return this.settingsService.getCompanySettings(req.user.tenantId);
  }

  @Put('company')
  updateCompanySettings(@Req() req: any, @Body() body: any) {
    return this.settingsService.updateCompanySettings(req.user.tenantId, body);
  }

  // Government Contribution Settings
  @Get('gov-contributions')
  getGovContribSettings(@Req() req: any) {
    return this.settingsService.getGovContribSettings(req.user.tenantId);
  }

  @Put('gov-contributions')
  updateGovContribSettings(@Req() req: any, @Body() body: any) {
    return this.settingsService.updateGovContribSettings(req.user.tenantId, body);
  }

  // Attendance Settings
  @Get('attendance')
  getAttendanceSettings(@Req() req: any) {
    return this.settingsService.getAttendanceSettings(req.user.tenantId);
  }

  @Put('attendance')
  updateAttendanceSettings(@Req() req: any, @Body() body: any) {
    return this.settingsService.updateAttendanceSettings(req.user.tenantId, body);
  }

  // Leave Settings
  @Get('leave')
  getLeaveSettings(@Req() req: any) {
    return this.settingsService.getLeaveSettings(req.user.tenantId);
  }

  @Put('leave')
  updateLeaveSettings(@Req() req: any, @Body() body: any) {
    return this.settingsService.updateLeaveSettings(req.user.tenantId, body);
  }

  // Leave Credit Settings
  @Get('leave-credits')
  getLeaveCreditSettings(@Req() req: any) {
    return this.settingsService.getLeaveCreditSettings(req.user.tenantId);
  }

  @Put('leave-credits')
  updateLeaveCreditSettings(@Req() req: any, @Body() body: any) {
    return this.settingsService.updateLeaveCreditSettings(req.user.tenantId, body);
  }

  // Overtime Settings
  @Get('overtime')
  getOvertimeSettings(@Req() req: any) {
    return this.settingsService.getOvertimeSettings(req.user.tenantId);
  }

  @Put('overtime')
  updateOvertimeSettings(@Req() req: any, @Body() body: any) {
    return this.settingsService.updateOvertimeSettings(req.user.tenantId, body);
  }

  // Holiday Settings
  @Get('holiday')
  getHolidaySettings(@Req() req: any) {
    return this.settingsService.getHolidaySettings(req.user.tenantId);
  }

  @Put('holiday')
  updateHolidaySettings(@Req() req: any, @Body() body: any) {
    return this.settingsService.updateHolidaySettings(req.user.tenantId, body);
  }

  // Rate Calculation Settings
  @Get('rate-calculation')
  getRateCalcSettings(@Req() req: any) {
    return this.settingsService.getRateCalcSettings(req.user.tenantId);
  }

  @Put('rate-calculation')
  updateRateCalcSettings(@Req() req: any, @Body() body: any) {
    return this.settingsService.updateRateCalcSettings(req.user.tenantId, body);
  }

  // Payroll Periods
  @Get('payroll-periods')
  getPayrollPeriods(@Req() req: any, @Query('year') year?: string) {
    return this.settingsService.getPayrollPeriods(req.user.tenantId, year ? parseInt(year) : undefined);
  }

  @Post('payroll-periods')
  createPayrollPeriod(@Req() req: any, @Body() body: any) {
    return this.settingsService.createPayrollPeriod(req.user.tenantId, body);
  }

  @Delete('payroll-periods/:id')
  deletePayrollPeriod(@Req() req: any, @Param('id') id: string) {
    return this.settingsService.deletePayrollPeriod(req.user.tenantId, id);
  }

  // Employee Levels
  @Get('employee-levels')
  getEmployeeLevels(@Req() req: any) {
    return this.settingsService.getEmployeeLevels(req.user.tenantId);
  }

  @Post('employee-levels')
  createEmployeeLevel(@Req() req: any, @Body() body: any) {
    return this.settingsService.createEmployeeLevel(req.user.tenantId, body);
  }

  @Put('employee-levels/:id')
  updateEmployeeLevel(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.settingsService.updateEmployeeLevel(req.user.tenantId, id, body);
  }

  @Delete('employee-levels/:id')
  deleteEmployeeLevel(@Req() req: any, @Param('id') id: string) {
    return this.settingsService.deleteEmployeeLevel(req.user.tenantId, id);
  }

  // Approval Chains
  @Get('approval-chains')
  getApprovalChains(@Req() req: any) {
    return this.settingsService.getApprovalChains(req.user.tenantId);
  }

  @Post('approval-chains')
  setApprovalChain(@Req() req: any, @Body() body: any) {
    return this.settingsService.setApprovalChain(req.user.tenantId, body);
  }

  @Delete('approval-chains/:id')
  deleteApprovalChain(@Req() req: any, @Param('id') id: string) {
    return this.settingsService.deleteApprovalChain(req.user.tenantId, id);
  }

  // Adjustment Types
  @Get('adjustment-types')
  getAdjustmentTypes(@Req() req: any) {
    return this.settingsService.getAdjustmentTypes(req.user.tenantId);
  }

  @Post('adjustment-types')
  createAdjustmentType(@Req() req: any, @Body() body: any) {
    return this.settingsService.createAdjustmentType(req.user.tenantId, body);
  }

  @Put('adjustment-types/:id')
  updateAdjustmentType(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.settingsService.updateAdjustmentType(req.user.tenantId, id, body);
  }

  @Delete('adjustment-types/:id')
  deleteAdjustmentType(@Req() req: any, @Param('id') id: string) {
    return this.settingsService.deleteAdjustmentType(req.user.tenantId, id);
  }

  // Tax Table
  @Get('tax-tables')
  getTaxTables(@Req() req: any, @Query('year') year?: string) {
    return this.settingsService.getTaxTables(req.user.tenantId, year ? parseInt(year) : undefined);
  }

  @Post('tax-tables')
  createTaxBracket(@Req() req: any, @Body() body: any) {
    return this.settingsService.createTaxBracket(req.user.tenantId, body);
  }

  @Put('tax-tables/:id')
  updateTaxBracket(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.settingsService.updateTaxBracket(req.user.tenantId, id, body);
  }

  @Delete('tax-tables/:id')
  deleteTaxBracket(@Req() req: any, @Param('id') id: string) {
    return this.settingsService.deleteTaxBracket(req.user.tenantId, id);
  }
}
