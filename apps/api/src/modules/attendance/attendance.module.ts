import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceCalculatorService } from './attendance-calculator.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceCalculatorService],
  exports: [AttendanceService, AttendanceCalculatorService],
})
export class AttendanceModule {}
