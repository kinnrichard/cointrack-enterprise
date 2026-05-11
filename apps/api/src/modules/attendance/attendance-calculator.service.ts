import { Injectable } from '@nestjs/common';

export interface AttendanceCalcInput {
  timeIn: Date;
  timeOut: Date;
  scheduleTimeIn: string;  // "07:00"
  scheduleTimeOut: string; // "16:00"
  noBreak: boolean;
  payType: 'MONTHLY' | 'DAILY';
  // Settings
  breakDurationMinutes: number;
  minimumHoursForBreak: number;
  nightDiffStartHour: number;
  nightDiffEndHour: number;
  lateGracePeriodMinutes: number;
  undertimeGracePeriodMinutes: number;
  minimumOvertimeMinutes: number;
  timeRoundingInterval: number;
  roundingMethod: 'up' | 'down' | 'nearest';
  // Day type
  isRestDay: boolean;
  isSpecialHoliday: boolean;
  isRegularHoliday: boolean;
  isDoubleHoliday: boolean;
}

export interface AttendanceCalcResult {
  workedHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  overtimeHours: number;
  nightDiffHours: number;
  status: string;
}

@Injectable()
export class AttendanceCalculatorService {
  calculate(input: AttendanceCalcInput): AttendanceCalcResult {
    const { timeIn, timeOut, scheduleTimeIn, scheduleTimeOut, noBreak, payType } = input;

    // Parse schedule times into Date objects on the same day as timeIn
    const schedIn = this.parseScheduleTime(scheduleTimeIn, timeIn);
    let schedOut = this.parseScheduleTime(scheduleTimeOut, timeIn);

    // Handle overnight schedules (e.g., 22:00-07:00)
    if (schedOut <= schedIn) {
      schedOut = new Date(schedOut.getTime() + 24 * 60 * 60 * 1000);
    }

    const expectedMinutes = (schedOut.getTime() - schedIn.getTime()) / 60000;

    // Total raw minutes worked
    let totalMinutes = (timeOut.getTime() - timeIn.getTime()) / 60000;
    if (totalMinutes < 0) totalMinutes += 24 * 60; // next day

    // Deduct break
    const totalHoursRaw = totalMinutes / 60;
    let breakMinutes = 0;
    if (!noBreak && totalHoursRaw >= input.minimumHoursForBreak) {
      breakMinutes = input.breakDurationMinutes;
    }
    totalMinutes = Math.max(0, totalMinutes - breakMinutes);

    // Expected hours (after break)
    let expectedHours = expectedMinutes / 60;
    if (!noBreak && expectedHours >= input.minimumHoursForBreak) {
      expectedHours -= input.breakDurationMinutes / 60;
    }

    const workedHours = Math.round(Math.min(totalMinutes / 60, expectedHours + 8) * 100) / 100;

    // Late minutes (MONTHLY employees only)
    let lateMinutes = 0;
    if (payType === 'MONTHLY' && timeIn > schedIn) {
      const rawLate = (timeIn.getTime() - schedIn.getTime()) / 60000;
      lateMinutes = Math.max(0, rawLate - input.lateGracePeriodMinutes);
      lateMinutes = this.applyRounding(lateMinutes, input.timeRoundingInterval, input.roundingMethod);
    }

    // Undertime minutes (MONTHLY employees only)
    let undertimeMinutes = 0;
    if (payType === 'MONTHLY' && timeOut < schedOut) {
      const rawUndertime = (schedOut.getTime() - timeOut.getTime()) / 60000;
      undertimeMinutes = Math.max(0, rawUndertime - input.undertimeGracePeriodMinutes);
      undertimeMinutes = this.applyRounding(undertimeMinutes, input.timeRoundingInterval, input.roundingMethod);
    }

    // Overtime hours
    let overtimeHours = 0;
    const overtimeMinutes = totalMinutes - (expectedHours * 60);
    if (overtimeMinutes >= input.minimumOvertimeMinutes) {
      overtimeHours = Math.round(overtimeMinutes / 60 * 100) / 100;
    }

    // Night differential hours (hours between nightDiffStart and nightDiffEnd)
    const nightDiffHours = this.calculateNightDiff(
      timeIn, timeOut,
      input.nightDiffStartHour, input.nightDiffEndHour,
    );

    // Status
    let status = 'PRESENT';
    if (lateMinutes > 0) status = 'LATE';
    if (workedHours < expectedHours / 2) status = 'HALF_DAY';

    return {
      workedHours,
      lateMinutes: Math.round(lateMinutes),
      undertimeMinutes: Math.round(undertimeMinutes),
      overtimeHours,
      nightDiffHours,
      status,
    };
  }

  private parseScheduleTime(time: string, referenceDate: Date): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const d = new Date(referenceDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  private applyRounding(minutes: number, interval: number, method: string): number {
    if (interval <= 1) return minutes;
    if (method === 'up') return Math.ceil(minutes / interval) * interval;
    if (method === 'down') return Math.floor(minutes / interval) * interval;
    return Math.round(minutes / interval) * interval;
  }

  private calculateNightDiff(
    timeIn: Date, timeOut: Date,
    ndStartHour: number, ndEndHour: number,
  ): number {
    // Night diff window spans midnight (e.g., 22:00-06:00)
    let totalNDMinutes = 0;
    const startMs = timeIn.getTime();
    const endMs = timeOut.getTime();

    // Check each minute (simplified but accurate)
    // For performance, calculate overlap with ND windows
    const dayStart = new Date(timeIn);
    dayStart.setHours(0, 0, 0, 0);

    // ND windows that could overlap with the work period
    // Window 1: ndStartHour on the day of timeIn to ndEndHour next day
    // Window 2: ndStartHour on the previous day to ndEndHour on the day of timeIn
    for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
      const ndStart = new Date(dayStart);
      ndStart.setDate(ndStart.getDate() + dayOffset);
      ndStart.setHours(ndStartHour, 0, 0, 0);

      const ndEnd = new Date(ndStart);
      if (ndEndHour <= ndStartHour) {
        // Spans midnight
        ndEnd.setDate(ndEnd.getDate() + 1);
      }
      ndEnd.setHours(ndEndHour, 0, 0, 0);

      // Calculate overlap
      const overlapStart = Math.max(startMs, ndStart.getTime());
      const overlapEnd = Math.min(endMs, ndEnd.getTime());

      if (overlapEnd > overlapStart) {
        totalNDMinutes += (overlapEnd - overlapStart) / 60000;
      }
    }

    return Math.round(totalNDMinutes / 60 * 100) / 100;
  }
}
