'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Loader2, Building2, Landmark, Clock, CalendarOff, CalendarPlus, Timer, CalendarDays, Calculator, DollarSign, Receipt, Image, Pencil, Trash2, Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const TABS = [
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'rate-calculation', label: 'Rate Multipliers', icon: Calculator },
  { id: 'gov-contributions', label: 'Gov Contributions', icon: Landmark },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'leave', label: 'Leave', icon: CalendarOff },
  { id: 'leave-credits', label: 'Leave Credits', icon: CalendarPlus },
  { id: 'overtime', label: 'Overtime', icon: Timer },
  { id: 'holiday', label: 'Holiday', icon: CalendarDays },
  { id: 'payroll-periods', label: 'Payroll Periods', icon: DollarSign },
  { id: 'tax-table', label: 'Tax Table', icon: Receipt },
  { id: 'employee-levels', label: 'Employee Levels', icon: Users },
  { id: 'approval-chains', label: 'Approval Chain', icon: Users },
  { id: 'adjustment-types', label: 'Adjustment Types', icon: Plus },
] as const;

type TabId = typeof TABS[number]['id'];

function SettingsField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('company');

  // Fetch all settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['all-settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  });

  // Generic save mutation
  function useSave(endpoint: string) {
    return useMutation({
      mutationFn: (data: Record<string, any>) => api.put(`/settings/${endpoint}`, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['all-settings'] });
        toast({ title: 'Settings saved' });
      },
      onError: () => toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' }),
    });
  }

  const saveCompany = useSave('company');
  const saveRateCalc = useSave('rate-calculation');
  const saveGov = useSave('gov-contributions');
  const saveAttendance = useSave('attendance');
  const saveLeave = useSave('leave');
  const saveLeaveCredit = useSave('leave-credits');
  const saveOvertime = useSave('overtime');
  const saveHoliday = useSave('holiday');

  // CRUD queries for list-based settings
  const taxTables = useQuery({ queryKey: ['tax-tables'], queryFn: () => api.get('/settings/tax-tables').then(r => r.data) });
  const employeeLevels = useQuery({ queryKey: ['employee-levels'], queryFn: () => api.get('/settings/employee-levels').then(r => r.data) });
  const approvalChains = useQuery({ queryKey: ['approval-chains'], queryFn: () => api.get('/settings/approval-chains').then(r => r.data) });
  const adjustmentTypes = useQuery({ queryKey: ['adjustment-types'], queryFn: () => api.get('/settings/adjustment-types').then(r => r.data) });
  const payrollPeriods = useQuery({ queryKey: ['payroll-periods'], queryFn: () => api.get('/settings/payroll-periods').then(r => r.data) });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Settings" description="System configuration and preferences" />
        <div className="flex h-[400px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      </div>
    );
  }

  const s = settings || {};

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="System configuration and preferences" />

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-[220px] shrink-0 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ─── Company Settings ──────────────────────────── */}
          {activeTab === 'company' && (
            <SettingsCard title="Company & Payroll Settings" description="Payroll divisors and government registration numbers"
              onSave={() => {
                const form = document.getElementById('company-form') as HTMLFormElement;
                const fd = new FormData(form);
                saveCompany.mutate({
                  payrollDaysDivisor: Number(fd.get('payrollDaysDivisor')),
                  payrollHourlyDivisor: Number(fd.get('payrollHourlyDivisor')),
                  tinNumber: fd.get('tinNumber') || null,
                  sssEmployerNumber: fd.get('sssEmployerNumber') || null,
                  philhealthNumber: fd.get('philhealthNumber') || null,
                  pagibigNumber: fd.get('pagibigNumber') || null,
                  birRegistrationNumber: fd.get('birRegistrationNumber') || null,
                  rdoCode: fd.get('rdoCode') || null,
                });
              }}
              isSaving={saveCompany.isPending}
            >
              <form id="company-form" className="space-y-5">
                <p className="text-sm font-medium text-muted-foreground">Payroll Divisors</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Days Divisor" hint="Working days per month (default: 26)">
                    <Input name="payrollDaysDivisor" type="number" defaultValue={s.company?.payrollDaysDivisor ?? 26} />
                  </SettingsField>
                  <SettingsField label="Hourly Divisor" hint="Working hours per day (default: 8)">
                    <Input name="payrollHourlyDivisor" type="number" defaultValue={s.company?.payrollHourlyDivisor ?? 8} />
                  </SettingsField>
                </div>
                <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Government Registration</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="TIN Number"><Input name="tinNumber" defaultValue={s.company?.tinNumber || ''} /></SettingsField>
                  <SettingsField label="SSS Employer Number"><Input name="sssEmployerNumber" defaultValue={s.company?.sssEmployerNumber || ''} /></SettingsField>
                  <SettingsField label="PhilHealth Number"><Input name="philhealthNumber" defaultValue={s.company?.philhealthNumber || ''} /></SettingsField>
                  <SettingsField label="Pag-IBIG Number"><Input name="pagibigNumber" defaultValue={s.company?.pagibigNumber || ''} /></SettingsField>
                  <SettingsField label="BIR Registration Number"><Input name="birRegistrationNumber" defaultValue={s.company?.birRegistrationNumber || ''} /></SettingsField>
                  <SettingsField label="RDO Code"><Input name="rdoCode" defaultValue={s.company?.rdoCode || ''} /></SettingsField>
                </div>
              </form>
            </SettingsCard>
          )}

          {/* ─── Gov Contribution Settings ────────────────── */}
          {activeTab === 'gov-contributions' && (
            <SettingsCard title="Government Contribution Settings" description="Configure SSS, PhilHealth, and Pag-IBIG deduction methods"
              onSave={() => {
                const form = document.getElementById('gov-form') as HTMLFormElement;
                const fd = new FormData(form);
                saveGov.mutate({
                  useActualEarnings: fd.get('useActualEarnings') === 'on',
                  deductionFrequency: fd.get('deductionFrequency'),
                  monthlyDeductionCutoff: fd.get('monthlyDeductionCutoff'),
                });
              }}
              isSaving={saveGov.isPending}
            >
              <form id="gov-form" className="space-y-5">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label className="text-sm">Use Actual Earnings</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Calculate contributions based on actual combined earnings instead of fixed salary</p>
                  </div>
                  <Switch name="useActualEarnings" defaultChecked={s.govContrib?.useActualEarnings ?? false} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Deduction Frequency" hint="How often to deduct contributions">
                    <select name="deductionFrequency" defaultValue={s.govContrib?.deductionFrequency || 'PER_CUTOFF'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="PER_CUTOFF">Per Cutoff (twice/month)</option>
                      <option value="MONTHLY">Monthly (once/month)</option>
                    </select>
                  </SettingsField>
                  <SettingsField label="Monthly Deduction Cutoff" hint="Which cutoff to deduct (if monthly)">
                    <select name="monthlyDeductionCutoff" defaultValue={s.govContrib?.monthlyDeductionCutoff || 'SECOND'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="FIRST">1st Cutoff</option>
                      <option value="SECOND">2nd Cutoff</option>
                    </select>
                  </SettingsField>
                </div>
              </form>
            </SettingsCard>
          )}

          {/* ─── Attendance Settings ──────────────────────── */}
          {activeTab === 'attendance' && (
            <SettingsCard title="Attendance Settings" description="Time tracking rules, breaks, night differential, and grace periods"
              onSave={() => {
                const form = document.getElementById('att-form') as HTMLFormElement;
                const fd = new FormData(form);
                saveAttendance.mutate({
                  breakDurationMinutes: Number(fd.get('breakDurationMinutes')),
                  minimumHoursForBreak: Number(fd.get('minimumHoursForBreak')),
                  nightDiffStartHour: Number(fd.get('nightDiffStartHour')),
                  nightDiffEndHour: Number(fd.get('nightDiffEndHour')),
                  lateGracePeriodMinutes: Number(fd.get('lateGracePeriodMinutes')),
                  undertimeGracePeriodMinutes: Number(fd.get('undertimeGracePeriodMinutes')),
                  minimumOvertimeMinutes: Number(fd.get('minimumOvertimeMinutes')),
                  timeRoundingInterval: Number(fd.get('timeRoundingInterval')),
                  roundingMethod: fd.get('roundingMethod'),
                });
              }}
              isSaving={saveAttendance.isPending}
            >
              <form id="att-form" className="space-y-5">
                <p className="text-sm font-medium text-muted-foreground">Break Time</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Break Duration (minutes)"><Input name="breakDurationMinutes" type="number" defaultValue={s.attendance?.breakDurationMinutes ?? 60} /></SettingsField>
                  <SettingsField label="Minimum Hours for Break"><Input name="minimumHoursForBreak" type="number" defaultValue={s.attendance?.minimumHoursForBreak ?? 6} /></SettingsField>
                </div>
                <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Night Differential</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Start Hour (24h)" hint="e.g., 22 = 10:00 PM"><Input name="nightDiffStartHour" type="number" min="0" max="23" defaultValue={s.attendance?.nightDiffStartHour ?? 22} /></SettingsField>
                  <SettingsField label="End Hour (24h)" hint="e.g., 6 = 6:00 AM"><Input name="nightDiffEndHour" type="number" min="0" max="23" defaultValue={s.attendance?.nightDiffEndHour ?? 6} /></SettingsField>
                </div>
                <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Grace Periods & Rounding</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <SettingsField label="Late Grace (min)"><Input name="lateGracePeriodMinutes" type="number" defaultValue={s.attendance?.lateGracePeriodMinutes ?? 0} /></SettingsField>
                  <SettingsField label="Undertime Grace (min)"><Input name="undertimeGracePeriodMinutes" type="number" defaultValue={s.attendance?.undertimeGracePeriodMinutes ?? 0} /></SettingsField>
                  <SettingsField label="Min OT Minutes"><Input name="minimumOvertimeMinutes" type="number" defaultValue={s.attendance?.minimumOvertimeMinutes ?? 0} /></SettingsField>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Rounding Interval (min)">
                    <select name="timeRoundingInterval" defaultValue={s.attendance?.timeRoundingInterval ?? 1} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="1">1 minute</option><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option>
                    </select>
                  </SettingsField>
                  <SettingsField label="Rounding Method">
                    <select name="roundingMethod" defaultValue={s.attendance?.roundingMethod || 'nearest'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="nearest">Nearest</option><option value="up">Round Up</option><option value="down">Round Down</option>
                    </select>
                  </SettingsField>
                </div>
              </form>
            </SettingsCard>
          )}

          {/* ─── Leave Settings ───────────────────────────── */}
          {activeTab === 'leave' && (
            <SettingsCard title="Leave Settings" description="Advance notice requirements for leave filing"
              onSave={() => {
                const form = document.getElementById('leave-form') as HTMLFormElement;
                const fd = new FormData(form);
                saveLeave.mutate({
                  vacationLeaveAdvanceNoticeDays: Number(fd.get('vacationLeaveAdvanceNoticeDays')),
                  sickLeaveAdvanceNoticeDays: Number(fd.get('sickLeaveAdvanceNoticeDays')),
                });
              }}
              isSaving={saveLeave.isPending}
            >
              <form id="leave-form" className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Vacation Leave Advance Notice (days)" hint="How many days before the leave date must an employee file">
                    <Input name="vacationLeaveAdvanceNoticeDays" type="number" defaultValue={s.leave?.vacationLeaveAdvanceNoticeDays ?? 3} />
                  </SettingsField>
                  <SettingsField label="Sick Leave Advance Notice (days)" hint="Set to 0 for emergency/same-day filing">
                    <Input name="sickLeaveAdvanceNoticeDays" type="number" defaultValue={s.leave?.sickLeaveAdvanceNoticeDays ?? 0} />
                  </SettingsField>
                </div>
              </form>
            </SettingsCard>
          )}

          {/* ─── Leave Credit Settings ────────────────────── */}
          {activeTab === 'leave-credits' && (
            <SettingsCard title="Leave Credit Settings" description="Annual allocations, accrual methods, and carry-over rules"
              onSave={() => {
                const form = document.getElementById('lc-form') as HTMLFormElement;
                const fd = new FormData(form);
                saveLeaveCredit.mutate({
                  vacationLeavePerYear: Number(fd.get('vacationLeavePerYear')),
                  sickLeavePerYear: Number(fd.get('sickLeavePerYear')),
                  accrualMethod: fd.get('accrualMethod'),
                  allowCarryOver: fd.get('allowCarryOver') === 'on',
                  maxCarryOverDays: Number(fd.get('maxCarryOverDays')),
                  allowCashConversion: fd.get('allowCashConversion') === 'on',
                });
              }}
              isSaving={saveLeaveCredit.isPending}
            >
              <form id="lc-form" className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Vacation Leave / Year"><Input name="vacationLeavePerYear" type="number" defaultValue={s.leaveCredit?.vacationLeavePerYear ?? 15} /></SettingsField>
                  <SettingsField label="Sick Leave / Year"><Input name="sickLeavePerYear" type="number" defaultValue={s.leaveCredit?.sickLeavePerYear ?? 15} /></SettingsField>
                </div>
                <SettingsField label="Accrual Method">
                  <select name="accrualMethod" defaultValue={s.leaveCredit?.accrualMethod || 'annual'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="annual">Annual (all at start of year)</option><option value="monthly">Monthly (pro-rated)</option>
                  </select>
                </SettingsField>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div><Label className="text-sm">Allow Carry Over</Label><p className="text-xs text-muted-foreground mt-0.5">Unused leave credits roll over to next year</p></div>
                  <Switch name="allowCarryOver" defaultChecked={s.leaveCredit?.allowCarryOver ?? true} />
                </div>
                <SettingsField label="Max Carry Over Days" hint="0 = unlimited"><Input name="maxCarryOverDays" type="number" defaultValue={s.leaveCredit?.maxCarryOverDays ?? 0} /></SettingsField>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div><Label className="text-sm">Allow Cash Conversion</Label><p className="text-xs text-muted-foreground mt-0.5">Employees can convert unused leave to cash</p></div>
                  <Switch name="allowCashConversion" defaultChecked={s.leaveCredit?.allowCashConversion ?? false} />
                </div>
              </form>
            </SettingsCard>
          )}

          {/* ─── Overtime Settings ────────────────────────── */}
          {activeTab === 'overtime' && (
            <SettingsCard title="Overtime Settings" description="OT filing requirements and calculation thresholds"
              onSave={() => {
                const form = document.getElementById('ot-form') as HTMLFormElement;
                const fd = new FormData(form);
                saveOvertime.mutate({
                  minimumOvertimeHours: Number(fd.get('minimumOvertimeHours')),
                  minimumOvertimeMinutes: Number(fd.get('minimumOvertimeMinutes')),
                  mustNotBeLate: fd.get('mustNotBeLate') === 'on',
                  requireOvertimeFiling: fd.get('requireOvertimeFiling') === 'on',
                  maxLateFilingDays: Number(fd.get('maxLateFilingDays')),
                });
              }}
              isSaving={saveOvertime.isPending}
            >
              <form id="ot-form" className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Minimum OT Hours to File" hint="Minimum hours to file an OT application">
                    <Input name="minimumOvertimeHours" type="number" step="0.5" defaultValue={Number(s.overtime?.minimumOvertimeHours ?? 1)} />
                  </SettingsField>
                  <SettingsField label="Minimum OT Minutes (Attendance)" hint="Minimum minutes of OT to count in attendance">
                    <Input name="minimumOvertimeMinutes" type="number" defaultValue={s.overtime?.minimumOvertimeMinutes ?? 0} />
                  </SettingsField>
                </div>
                <SettingsField label="Max Late Filing Days" hint="How many days after OT date can employee file">
                  <Input name="maxLateFilingDays" type="number" defaultValue={s.overtime?.maxLateFilingDays ?? 30} />
                </SettingsField>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div><Label className="text-sm">Must Not Be Late</Label><p className="text-xs text-muted-foreground mt-0.5">Employee cannot file OT if they were late that day</p></div>
                  <Switch name="mustNotBeLate" defaultChecked={s.overtime?.mustNotBeLate ?? true} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div><Label className="text-sm">Require OT Filing</Label><p className="text-xs text-muted-foreground mt-0.5">If disabled, OT is auto-calculated from attendance</p></div>
                  <Switch name="requireOvertimeFiling" defaultChecked={s.overtime?.requireOvertimeFiling ?? true} />
                </div>
              </form>
            </SettingsCard>
          )}

          {/* ─── Rate Calculation Settings ─────────────────── */}
          {activeTab === 'rate-calculation' && (
            <SettingsCard title="Rate Calculation Multipliers" description="Philippine labor law pay multipliers for all hour types"
              onSave={() => {
                const form = document.getElementById('rate-calc-form') as HTMLFormElement;
                const fd = new FormData(form);
                const payload: Record<string, any> = {};
                for (const [key, val] of fd.entries()) payload[key] = Number(val);
                saveRateCalc.mutate(payload);
              }}
              isSaving={saveRateCalc.isPending}
            >
              <form id="rate-calc-form" className="space-y-5">
                {[
                  { section: 'Regular', fields: [
                    { name: 'nightDiffMultiplier', label: 'Night Differential', def: 0.10 },
                    { name: 'overtimeMultiplier', label: 'Overtime', def: 1.25 },
                    { name: 'overtimeNightDiffMultiplier', label: 'OT + Night Diff', def: 0.10 },
                  ]},
                  { section: 'Rest Day / Special Holiday', fields: [
                    { name: 'restdayOrSpecialHolidayMultiplier', label: 'Base', def: 1.30 },
                    { name: 'restdayOrSpecialHolidayNightDiffMultiplier', label: '+ Night Diff', def: 0.10 },
                    { name: 'restdayOrSpecialHolidayOvertimeMultiplier', label: '+ Overtime', def: 1.69 },
                    { name: 'restdayOrSpecialHolidayOvertimeNDMultiplier', label: '+ OT + ND', def: 0.10 },
                  ]},
                  { section: 'Legal Holiday', fields: [
                    { name: 'legalHolidayMultiplier', label: 'Base', def: 2.00 },
                    { name: 'legalHolidayNightDiffMultiplier', label: '+ Night Diff', def: 0.10 },
                    { name: 'legalHolidayOvertimeMultiplier', label: '+ Overtime', def: 2.50 },
                    { name: 'legalHolidayOvertimeNDMultiplier', label: '+ OT + ND', def: 0.10 },
                  ]},
                  { section: 'Legal + Special Holiday (Double)', fields: [
                    { name: 'legalOnSpecialHolidayMultiplier', label: 'Base', def: 2.60 },
                    { name: 'legalOnSpecialHolidayNightDiffMultiplier', label: '+ Night Diff', def: 0.10 },
                    { name: 'legalOnSpecialHolidayOvertimeMultiplier', label: '+ Overtime', def: 3.38 },
                    { name: 'legalOnSpecialHolidayOvertimeNDMultiplier', label: '+ OT + ND', def: 0.10 },
                  ]},
                ].map((group, gi) => (
                  <div key={group.section}>
                    {gi > 0 && <div className="border-t pt-4" />}
                    <p className="text-sm font-medium text-muted-foreground mb-3">{group.section}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {group.fields.map(f => (
                        <SettingsField key={f.name} label={f.label}>
                          <Input name={f.name} type="number" step="0.01" defaultValue={Number(s.rateCalc?.[f.name] ?? f.def)} />
                        </SettingsField>
                      ))}
                    </div>
                  </div>
                ))}
              </form>
            </SettingsCard>
          )}

          {/* ─── Holiday Settings ─────────────────────────── */}
          {activeTab === 'holiday' && (
            <SettingsCard title="Holiday Settings" description="Attendance requirements for holiday pay eligibility"
              onSave={() => {
                const form = document.getElementById('hol-form') as HTMLFormElement;
                const fd = new FormData(form);
                saveHoliday.mutate({
                  beforeHolidayValue: Number(fd.get('beforeHolidayValue')),
                  beforeHolidayUnit: fd.get('beforeHolidayUnit'),
                  afterHolidayValue: Number(fd.get('afterHolidayValue')),
                  afterHolidayUnit: fd.get('afterHolidayUnit'),
                });
              }}
              isSaving={saveHoliday.isPending}
            >
              <form id="hol-form" className="space-y-5">
                <p className="text-sm text-muted-foreground">Employee must work before and after a holiday to qualify for holiday pay.</p>
                <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Before Holiday</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Value"><Input name="beforeHolidayValue" type="number" defaultValue={s.holiday?.beforeHolidayValue ?? 1} /></SettingsField>
                  <SettingsField label="Unit">
                    <select name="beforeHolidayUnit" defaultValue={s.holiday?.beforeHolidayUnit || 'days'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="days">Days</option><option value="hours">Hours</option>
                    </select>
                  </SettingsField>
                </div>
                <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">After Holiday</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SettingsField label="Value"><Input name="afterHolidayValue" type="number" defaultValue={s.holiday?.afterHolidayValue ?? 1} /></SettingsField>
                  <SettingsField label="Unit">
                    <select name="afterHolidayUnit" defaultValue={s.holiday?.afterHolidayUnit || 'days'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="days">Days</option><option value="hours">Hours</option>
                    </select>
                  </SettingsField>
                </div>
              </form>
            </SettingsCard>
          )}
          {/* ─── Payroll Periods ─────────────────────────── */}
          {activeTab === 'payroll-periods' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Payroll Period Settings</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Configure monthly cutoff dates and pay dates</p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-muted/50 border-b">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Month/Year</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">1st Period</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">1st Pay Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">2nd Period</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">2nd Pay Date</th>
                    </tr></thead>
                    <tbody>
                      {(payrollPeriods.data ?? []).length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No payroll periods configured. Use the API to create periods.</td></tr>
                      ) : (payrollPeriods.data ?? []).map((p: any) => (
                        <tr key={p.id} className="border-b">
                          <td className="px-4 py-2 font-medium">{p.month}/{p.year}</td>
                          <td className="px-4 py-2">{p.firstPeriodStart?.slice(0, 10)} — {p.firstPeriodEnd?.slice(0, 10)}</td>
                          <td className="px-4 py-2">{p.firstPayDate?.slice(0, 10)}</td>
                          <td className="px-4 py-2">{p.secondPeriodStart?.slice(0, 10) || '-'} {p.secondPeriodEnd ? `— ${p.secondPeriodEnd.slice(0, 10)}` : ''}</td>
                          <td className="px-4 py-2">{p.secondPayDate?.slice(0, 10) || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Tax Table ────────────────────────────────── */}
          {activeTab === 'tax-table' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">BIR Tax Table</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Income tax brackets for withholding tax calculation</p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-muted/50 border-b">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Year</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Bracket</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Min Income</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Max Income</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Base Tax</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Rate</th>
                    </tr></thead>
                    <tbody>
                      {(taxTables.data ?? []).length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No tax brackets configured. Use the API to create brackets.</td></tr>
                      ) : (taxTables.data ?? []).map((t: any) => (
                        <tr key={t.id} className="border-b">
                          <td className="px-4 py-2">{t.year}</td>
                          <td className="px-4 py-2 font-medium">{t.name}</td>
                          <td className="px-4 py-2 text-right">{Number(t.minIncome).toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">{t.maxIncome ? Number(t.maxIncome).toLocaleString() : '∞'}</td>
                          <td className="px-4 py-2 text-right">{Number(t.baseTax).toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">{(Number(t.rate) * 100).toFixed(0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Employee Levels ─────────────────────────── */}
          {activeTab === 'employee-levels' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Employee Levels</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Define your organization&apos;s hierarchy levels. Higher order = more senior. Used in the Employee form for &quot;Employee Level&quot; and &quot;Reports To&quot;.</p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-muted/50 border-b">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Order</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Level Name</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    </tr></thead>
                    <tbody>
                      {(employeeLevels.data ?? []).length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                          No employee levels defined yet.
                          <br /><span className="text-xs">Examples: Rank and File (0), Team Lead (1), Supervisor (2), Manager (3), Director (4)</span>
                        </td></tr>
                      ) : (employeeLevels.data ?? []).map((l: any) => (
                        <tr key={l.id} className="border-b">
                          <td className="px-4 py-2 font-mono text-muted-foreground">{l.order}</td>
                          <td className="px-4 py-2 font-medium">{l.name}</td>
                          <td className="px-4 py-2">{l.isActive ? 'Active' : 'Inactive'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Approval Chain ──────────────────────────── */}
          {activeTab === 'approval-chains' && (
            <ApprovalChainTab
              levels={employeeLevels.data ?? []}
              chains={approvalChains.data ?? []}
              queryClient={queryClient}
              toast={toast}
            />
          )}

          {/* ─── Adjustment Types ─────────────────────────── */}
          {activeTab === 'adjustment-types' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Adjustment Types</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Custom payroll earnings and deductions</p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-muted/50 border-b">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    </tr></thead>
                    <tbody>
                      {(adjustmentTypes.data ?? []).length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No adjustment types configured. Use the API to create types.</td></tr>
                      ) : (adjustmentTypes.data ?? []).map((a: any) => (
                        <tr key={a.id} className="border-b">
                          <td className="px-4 py-2 font-medium">{a.name}</td>
                          <td className="px-4 py-2"><span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', a.type === 'EARNING' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>{a.type}</span></td>
                          <td className="px-4 py-2">{a.isActive ? 'Active' : 'Inactive'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalChainTab({ levels, chains, queryClient, toast }: {
  levels: any[]; chains: any[]; queryClient: any; toast: any;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newApproverLevel, setNewApproverLevel] = useState('');

  async function addApprover(employeeLevelId: string) {
    if (!newApproverLevel) return;
    const existing = chains.filter((c: any) => c.employeeLevelId === employeeLevelId);
    const nextOrder = existing.length > 0 ? Math.max(...existing.map((c: any) => c.order)) + 1 : 1;
    const approvers = [
      ...existing.map((c: any) => ({ approverLevelId: c.approverLevelId, order: c.order })),
      { approverLevelId: newApproverLevel, order: nextOrder },
    ];
    setSaving(employeeLevelId);
    try {
      await api.post('/settings/approval-chains', { employeeLevelId, approvers });
      queryClient.invalidateQueries({ queryKey: ['approval-chains'] });
      toast({ title: 'Approver added' });
      setAddingTo(null);
      setNewApproverLevel('');
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    setSaving(null);
  }

  async function removeApprover(chainId: string, employeeLevelId: string) {
    setSaving(employeeLevelId);
    try {
      await api.delete(`/settings/approval-chains/${chainId}`);
      queryClient.invalidateQueries({ queryKey: ['approval-chains'] });
      toast({ title: 'Approver removed' });
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    setSaving(null);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Approval Chain</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Define who approves for each employee level. Example: Rank and File → 1st: Supervisor, 2nd: Manager.
        </p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {levels.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Create Employee Levels first in the &quot;Employee Levels&quot; tab.</p>
        ) : (
          levels.map((level: any) => {
            const levelChains = chains.filter((c: any) => c.employeeLevelId === level.id).sort((a: any, b: any) => a.order - b.order);
            const isSaving = saving === level.id;
            return (
              <div key={level.id} className="rounded-lg border overflow-hidden">
                <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-6">{level.order}</span>
                    <span className="text-sm font-semibold">{level.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{levelChains.length} approver{levelChains.length !== 1 ? 's' : ''}</span>
                    {addingTo !== level.id && (
                      <button onClick={() => { setAddingTo(level.id); setNewApproverLevel(''); }}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Add approver">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="divide-y">
                  {levelChains.map((chain: any) => (
                    <div key={chain.id} className="px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{chain.order}</span>
                        <span className="text-sm">{chain.approverLevel.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{chain.order === 1 ? '1st Approver' : chain.order === 2 ? '2nd Approver' : `${chain.order}th Approver`}</span>
                        <button onClick={() => removeApprover(chain.id, level.id)} disabled={isSaving}
                          className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {levelChains.length === 0 && addingTo !== level.id && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No approvers — click + to add one.</div>
                  )}
                  {addingTo === level.id && (
                    <div className="px-4 py-3 flex items-center gap-2">
                      <Select value={newApproverLevel} onValueChange={setNewApproverLevel}>
                        <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Select approver level" /></SelectTrigger>
                        <SelectContent>
                          {levels.filter((l: any) => l.id !== level.id && !levelChains.some((c: any) => c.approverLevelId === l.id)).map((l: any) => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => addApprover(level.id)} disabled={!newApproverLevel || isSaving}
                        className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 h-9">
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
                      </Button>
                      <button onClick={() => setAddingTo(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function SettingsCard({ title, description, children, onSave, isSaving }: {
  title: string; description: string; children: React.ReactNode;
  onSave: () => void; isSaving: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Button onClick={onSave} disabled={isSaving} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg" size="sm">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  );
}
