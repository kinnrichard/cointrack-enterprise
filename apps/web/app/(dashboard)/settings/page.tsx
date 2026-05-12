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
  { id: 'company', label: 'Tenant Info', icon: Building2 },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'leave', label: 'Leaves', icon: CalendarOff },
  { id: 'holiday', label: 'Holiday', icon: CalendarDays },
  { id: 'overtime', label: 'Overtime', icon: Timer },
  { id: 'payroll-periods', label: 'Timekeeping', icon: Clock },
  { id: 'rate-calculation', label: 'Rate', icon: Calculator },
  { id: 'gov-contributions', label: 'Government', icon: Landmark },
  { id: 'tax-table', label: 'Tax', icon: Receipt },
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
            <TenantInfoTab />
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
            <LeavesSettingsTab settings={s} saveLeave={saveLeave} saveLeaveCredit={saveLeaveCredit} />
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
            <SettingsCard title="Rate Calculation" description="Configure rate multipliers for payroll calculations. All values are percentages."
              onSave={() => {
                const form = document.getElementById('rate-calc-form') as HTMLFormElement;
                const fd = new FormData(form);
                const payload: Record<string, any> = {};
                for (const [key, val] of fd.entries()) payload[key] = Number(val) / 100;
                saveRateCalc.mutate(payload);
              }}
              isSaving={saveRateCalc.isPending}
            >
              <form id="rate-calc-form" className="space-y-5">
                <p className="text-sm font-medium text-muted-foreground">Rate Multipliers</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { name: 'nightDiffMultiplier', label: 'Night Diff', def: 0.10 },
                    { name: 'overtimeMultiplier', label: 'Overtime', def: 1.25 },
                    { name: 'overtimeNightDiffMultiplier', label: 'Overtime Night Diff', def: 0.10 },
                    { name: 'restdayOrSpecialHolidayMultiplier', label: 'Restday/Special Holiday', def: 1.30 },
                    { name: 'restdayOrSpecialHolidayNightDiffMultiplier', label: 'Restday/Special Night Diff', def: 0.10 },
                    { name: 'restdayOrSpecialHolidayOvertimeMultiplier', label: 'Restday/Special Overtime', def: 1.69 },
                    { name: 'restdayOrSpecialHolidayOvertimeNDMultiplier', label: 'Restday/Special OT Night Diff', def: 0.10 },
                    { name: 'legalHolidayMultiplier', label: 'Legal Holiday', def: 2.00 },
                    { name: 'legalHolidayNightDiffMultiplier', label: 'Legal Night Diff', def: 0.10 },
                    { name: 'legalHolidayOvertimeMultiplier', label: 'Legal Overtime', def: 2.50 },
                    { name: 'legalHolidayOvertimeNDMultiplier', label: 'Legal OT Night Diff', def: 0.10 },
                    { name: 'legalOnSpecialHolidayMultiplier', label: 'Legal on Special Holiday', def: 2.60 },
                    { name: 'legalOnSpecialHolidayNightDiffMultiplier', label: 'Legal on Special Night Diff', def: 0.10 },
                    { name: 'legalOnSpecialHolidayOvertimeMultiplier', label: 'Legal on Special Overtime', def: 3.38 },
                    { name: 'legalOnSpecialHolidayOvertimeNDMultiplier', label: 'Legal on Special OT Night Diff', def: 0.10 },
                  ].map(f => (
                    <div key={f.name} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{f.label}</Label>
                      <div className="relative">
                        <Input name={f.name} type="number" step="0.01" defaultValue={((Number(s.rateCalc?.[f.name]) || f.def) * 100).toFixed(2)} className="pr-8" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>
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
          {/* ─── Timekeeping / Payroll Periods ─────────────── */}
          {activeTab === 'payroll-periods' && (
            <TimekeepingSettingsTab periods={payrollPeriods.data ?? []} queryClient={queryClient} toast={toast} />
          )}

          {/* ─── Tax Table ────────────────────────────────── */}
          {activeTab === 'tax-table' && (
            <TaxTableTab brackets={taxTables.data ?? []} queryClient={queryClient} toast={toast} />
          )}

          {/* ─── Employee Levels ─────────────────────────── */}
          {activeTab === 'employee-levels' && (
            <EmployeeLevelsTab levels={employeeLevels.data ?? []} queryClient={queryClient} toast={toast} />
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

function TaxTableTab({ brackets, queryClient, toast }: { brackets: any[]; queryClient: any; toast: any }) {
  const currentYear = new Date().getFullYear();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterYear, setFilterYear] = useState('');

  // Form state
  const [fYear, setFYear] = useState(currentYear);
  const [fOrder, setFOrder] = useState(1);
  const [fName, setFName] = useState('');
  const [fMinIncome, setFMinIncome] = useState('');
  const [fMaxIncome, setFMaxIncome] = useState('');
  const [fBaseTax, setFBaseTax] = useState('');
  const [fRate, setFRate] = useState('');

  const years = [...new Set(brackets.map((b: any) => b.year))].sort((a: number, b: number) => b - a);
  const filtered = filterYear ? brackets.filter((b: any) => b.year === Number(filterYear)) : brackets;

  function resetForm() { setFYear(currentYear); setFOrder(brackets.length + 1); setFName(''); setFMinIncome(''); setFMaxIncome(''); setFBaseTax('0'); setFRate(''); }
  function startEdit(b: any) { setEditingId(b.id); setFYear(b.year); setFOrder(b.bracketOrder); setFName(b.name); setFMinIncome(String(Number(b.minIncome))); setFMaxIncome(b.maxIncome ? String(Number(b.maxIncome)) : ''); setFBaseTax(String(Number(b.baseTax))); setFRate(String(Number(b.rate) * 100)); setAdding(false); }

  function getPayload() {
    return {
      year: fYear, bracketOrder: fOrder, name: fName,
      minIncome: Number(fMinIncome) || 0,
      maxIncome: fMaxIncome ? Number(fMaxIncome) : null,
      baseTax: Number(fBaseTax) || 0,
      rate: (Number(fRate) || 0) / 100,
    };
  }

  async function handleAdd() {
    setSaving(true);
    try { await api.post('/settings/tax-tables', getPayload()); queryClient.invalidateQueries({ queryKey: ['tax-tables'] }); toast({ title: 'Tax bracket created' }); setAdding(false); resetForm(); }
    catch (e: any) { toast({ title: 'Error', description: e?.response?.data?.message || 'Failed', variant: 'destructive' }); }
    setSaving(false);
  }

  async function handleUpdate() {
    if (!editingId) return;
    setSaving(true);
    try { await api.put(`/settings/tax-tables/${editingId}`, getPayload()); queryClient.invalidateQueries({ queryKey: ['tax-tables'] }); toast({ title: 'Tax bracket updated' }); setEditingId(null); resetForm(); }
    catch (e: any) { toast({ title: 'Error', variant: 'destructive' }); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    try { await api.delete(`/settings/tax-tables/${id}`); queryClient.invalidateQueries({ queryKey: ['tax-tables'] }); toast({ title: 'Tax bracket deleted' }); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
  }

  const formRow = (
    <tr className="border-b bg-accent/20">
      <td className="px-3 py-2"><Input type="number" value={fYear} onChange={(e) => setFYear(Number(e.target.value))} className="h-8 w-16" /></td>
      <td className="px-3 py-2"><Input type="number" value={fOrder} onChange={(e) => setFOrder(Number(e.target.value))} className="h-8 w-14" /></td>
      <td className="px-3 py-2"><Input value={fName} onChange={(e) => setFName(e.target.value)} className="h-8" placeholder="Bracket name" /></td>
      <td className="px-3 py-2"><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₱</span><Input value={fMinIncome} onChange={(e) => setFMinIncome(e.target.value)} className="h-8 pl-5 text-right" placeholder="0" /></div></td>
      <td className="px-3 py-2"><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₱</span><Input value={fMaxIncome} onChange={(e) => setFMaxIncome(e.target.value)} className="h-8 pl-5 text-right" placeholder="No limit" /></div></td>
      <td className="px-3 py-2"><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₱</span><Input value={fBaseTax} onChange={(e) => setFBaseTax(e.target.value)} className="h-8 pl-5 text-right" placeholder="0" /></div></td>
      <td className="px-3 py-2"><div className="relative"><Input value={fRate} onChange={(e) => setFRate(e.target.value)} className="h-8 pr-6 text-right" placeholder="0" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span></div></td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" onClick={editingId ? handleUpdate : handleAdd} disabled={saving || !fName} className="h-7 px-2 bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          </Button>
          <button onClick={() => { setAdding(false); setEditingId(null); resetForm(); }} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      </td>
    </tr>
  );

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">BIR Tax Table</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Income tax brackets for withholding tax calculation (TRAIN Law).</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
            <option value="">All Years</option>
            {years.map((y: number) => <option key={y} value={y}>{y}</option>)}
          </select>
          {!adding && !editingId && (
            <Button size="sm" onClick={() => { setAdding(true); resetForm(); }} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Bracket
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 border-b">
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-[70px]">Year</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-[60px]">Order</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Description</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground w-[120px]">Min Income</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground w-[120px]">Max Income</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground w-[110px]">Base Tax</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-[80px]">Rate</th>
              <th className="px-3 py-2 w-[90px]"></th>
            </tr></thead>
            <tbody>
              {adding && formRow}
              {filtered.length === 0 && !adding ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No tax brackets. Click &quot;Add Bracket&quot; to create one.</td></tr>
              ) : filtered.map((t: any) => (
                editingId === t.id ? formRow : (
                  <tr key={t.id} className="border-b hover:bg-accent/20">
                    <td className="px-3 py-2 font-medium">{t.year}</td>
                    <td className="px-3 py-2 text-center"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{t.bracketOrder}</span></td>
                    <td className="px-3 py-2 uppercase text-xs">{t.name}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">₱{Number(t.minIncome).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{t.maxIncome ? `₱${Number(t.maxIncome).toLocaleString()}` : <span className="text-muted-foreground">No Limit</span>}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">₱{Number(t.baseTax).toLocaleString()}</td>
                    <td className="px-3 py-2 text-center"><span className="inline-flex px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">{(Number(t.rate) * 100).toFixed(0)}%</span></td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(t)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TimekeepingSettingsTab({ periods, queryClient, toast }: { periods: any[]; queryClient: any; toast: any }) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [biMonthly, setBiMonthly] = useState(true);
  const [f1Start, setF1Start] = useState('');
  const [f1End, setF1End] = useState('');
  const [f1Pay, setF1Pay] = useState('');
  const [f2Start, setF2Start] = useState('');
  const [f2End, setF2End] = useState('');
  const [f2Pay, setF2Pay] = useState('');

  function prefill(m: number, y: number) {
    setMonth(m); setYear(y);
    const lastDay = new Date(y, m, 0).getDate();
    setF1Start(`${y}-${String(m).padStart(2, '0')}-01`);
    setF1End(`${y}-${String(m).padStart(2, '0')}-15`);
    setF1Pay(`${y}-${String(m).padStart(2, '0')}-20`);
    setF2Start(`${y}-${String(m).padStart(2, '0')}-16`);
    setF2End(`${y}-${String(m).padStart(2, '0')}-${lastDay}`);
    // Pay date: 5th of next month
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    setF2Pay(`${nextY}-${String(nextM).padStart(2, '0')}-05`);
  }

  async function handleAdd() {
    if (!f1Start || !f1End || !f1Pay) return;
    setSaving(true);
    try {
      await api.post('/settings/payroll-periods', {
        month, year, isBiMonthly: biMonthly,
        firstPeriodStart: f1Start, firstPeriodEnd: f1End, firstPayDate: f1Pay,
        ...(biMonthly ? { secondPeriodStart: f2Start, secondPeriodEnd: f2End, secondPayDate: f2Pay } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      toast({ title: 'Payroll period created' });
      setAdding(false);
    } catch (e: any) { toast({ title: 'Error', description: e?.response?.data?.message || 'Failed', variant: 'destructive' }); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/settings/payroll-periods/${id}`);
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      toast({ title: 'Period deleted' });
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Timekeeping Settings</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Configure payroll cutoff periods, dates, and pay schedules.</p>
        </div>
        {!adding && (
          <Button size="sm" onClick={() => { setAdding(true); prefill(currentMonth, currentYear); }} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Period
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {adding && (
          <div className="rounded-lg border p-4 bg-accent/20 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SettingsField label="Month">
                <select value={month} onChange={(e) => { const m = Number(e.target.value); prefill(m, year); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {monthNames.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
                </select>
              </SettingsField>
              <SettingsField label="Year">
                <select value={year} onChange={(e) => { const y = Number(e.target.value); prefill(month, y); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </SettingsField>
              <div className="col-span-2 flex items-end">
                <div className="flex items-center gap-2 pb-2">
                  <Switch checked={biMonthly} onCheckedChange={setBiMonthly} />
                  <Label className="text-sm">Bi-Monthly (2 cutoffs)</Label>
                </div>
              </div>
            </div>

            <p className="text-xs font-medium text-muted-foreground">1st Cutoff Period</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SettingsField label="Start Date"><Input type="date" value={f1Start} onChange={(e) => setF1Start(e.target.value)} /></SettingsField>
              <SettingsField label="End Date"><Input type="date" value={f1End} onChange={(e) => setF1End(e.target.value)} /></SettingsField>
              <SettingsField label="Pay Date"><Input type="date" value={f1Pay} onChange={(e) => setF1Pay(e.target.value)} /></SettingsField>
            </div>

            {biMonthly && (
              <>
                <p className="text-xs font-medium text-muted-foreground">2nd Cutoff Period</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <SettingsField label="Start Date"><Input type="date" value={f2Start} onChange={(e) => setF2Start(e.target.value)} /></SettingsField>
                  <SettingsField label="End Date"><Input type="date" value={f2End} onChange={(e) => setF2End(e.target.value)} /></SettingsField>
                  <SettingsField label="Pay Date"><Input type="date" value={f2Pay} onChange={(e) => setF2Pay(e.target.value)} /></SettingsField>
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !f1Start} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null} Create
              </Button>
              <button onClick={() => setAdding(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          </div>
        )}

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 border-b">
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Period</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">1st Cutoff</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">1st Pay Date</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">2nd Cutoff</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">2nd Pay Date</th>
              <th className="px-4 py-2 w-[50px]"></th>
            </tr></thead>
            <tbody>
              {periods.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No payroll periods configured. Click &quot;Add Period&quot; to create one.</td></tr>
              ) : periods.map((p: any) => (
                <tr key={p.id} className="border-b hover:bg-accent/20">
                  <td className="px-4 py-2 font-medium">{monthNames[(p.month || 1) - 1]} {p.year}</td>
                  <td className="px-4 py-2 text-xs">{p.firstPeriodStart?.slice(0, 10)} → {p.firstPeriodEnd?.slice(0, 10)}</td>
                  <td className="px-4 py-2 text-xs">{p.firstPayDate?.slice(0, 10)}</td>
                  <td className="px-4 py-2 text-xs">{p.secondPeriodStart ? `${p.secondPeriodStart.slice(0, 10)} → ${p.secondPeriodEnd?.slice(0, 10)}` : '—'}</td>
                  <td className="px-4 py-2 text-xs">{p.secondPayDate?.slice(0, 10) || '—'}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleDelete(p.id)} className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function LeavesSettingsTab({ settings: s, saveLeave, saveLeaveCredit }: { settings: any; saveLeave: any; saveLeaveCredit: any }) {
  const [allowCarryOver, setAllowCarryOver] = useState(s.leaveCredit?.allowCarryOver ?? true);
  const [allowCashConversion, setAllowCashConversion] = useState(s.leaveCredit?.allowCashConversion ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const form = document.getElementById('leaves-form') as HTMLFormElement;
    const fd = new FormData(form);
    try {
      await Promise.all([
        saveLeave.mutateAsync({
          vacationLeaveAdvanceNoticeDays: Number(fd.get('vacationLeaveAdvanceNoticeDays')),
          sickLeaveAdvanceNoticeDays: Number(fd.get('sickLeaveAdvanceNoticeDays')),
        }),
        saveLeaveCredit.mutateAsync({
          vacationLeavePerYear: Number(fd.get('vacationLeavePerYear')),
          sickLeavePerYear: Number(fd.get('sickLeavePerYear')),
          accrualMethod: fd.get('accrualMethod'),
          allowCarryOver,
          maxCarryOverDays: Number(fd.get('maxCarryOverDays')),
          allowCashConversion,
        }),
      ]);
    } catch {}
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Leave Settings</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Leave types, advance notice, accrual and carry-over policies.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg" size="sm">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        <form id="leaves-form" className="space-y-5">
          {/* Section 1: Leave Types */}
          <p className="text-sm font-medium text-muted-foreground">Leave Types</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SettingsField label="Vacation Leave Days" hint="Annual vacation leave allocation (default: 5)">
              <Input name="vacationLeavePerYear" type="number" defaultValue={s.leaveCredit?.vacationLeavePerYear ?? 5} />
            </SettingsField>
            <SettingsField label="Sick Leave Days" hint="Annual sick leave allocation (default: 5)">
              <Input name="sickLeavePerYear" type="number" defaultValue={s.leaveCredit?.sickLeavePerYear ?? 5} />
            </SettingsField>
          </div>

          {/* Section 2: Leave Advance Notice */}
          <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Leave Advance Notice</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SettingsField label="Vacation Leave" hint="Days before leave date to file (default: 7)">
              <Input name="vacationLeaveAdvanceNoticeDays" type="number" defaultValue={s.leave?.vacationLeaveAdvanceNoticeDays ?? 7} />
            </SettingsField>
            <SettingsField label="Sick Leave" hint="Set to 0 for same-day filing (default: 0)">
              <Input name="sickLeaveAdvanceNoticeDays" type="number" defaultValue={s.leave?.sickLeaveAdvanceNoticeDays ?? 0} />
            </SettingsField>
            <SettingsField label="Time Unit">
              <select name="leaveNoticeUnit" defaultValue="days" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="days">Days</option>
                <option value="hours">Hours</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </SettingsField>
          </div>

          {/* Section 3: Accrual & Policy */}
          <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Accrual & Policy Config</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SettingsField label="Accrual Method">
              <select name="accrualMethod" defaultValue={s.leaveCredit?.accrualMethod || 'annual'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="annual">Annual (all at once)</option>
                <option value="monthly">Monthly (pro-rated)</option>
              </select>
            </SettingsField>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-sm">Allow Carry Over</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Unused leave credits roll over to next year</p>
            </div>
            <Switch checked={allowCarryOver} onCheckedChange={setAllowCarryOver} />
          </div>

          {allowCarryOver && (
            <SettingsField label="Max Carry Over Days" hint="0 = unlimited">
              <Input name="maxCarryOverDays" type="number" defaultValue={s.leaveCredit?.maxCarryOverDays ?? 0} />
            </SettingsField>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-sm">Allow Cash Conversion</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Employees can convert unused leave to cash</p>
            </div>
            <Switch checked={allowCashConversion} onCheckedChange={setAllowCashConversion} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TenantInfoTab() {
  const tenant = useQuery({ queryKey: ['tenant-info'], queryFn: () => api.get('/auth/tenant').then(r => r.data) });
  const health = useQuery({ queryKey: ['api-health'], queryFn: () => api.get('/health').then(r => r.data).catch(() => null) });

  const t = tenant.data;
  const h = health.data;

  const infoRows = [
    { section: 'Tenant Information', items: [
      { label: 'Company Name', value: t?.companyName || '-' },
      { label: 'Company Code', value: t?.companyCode || '-' },
      { label: 'Domain', value: t?.domain || '-' },
      { label: 'Status', value: t?.status || '-' },
      { label: 'Tenant ID', value: t?.id ? t.id.slice(0, 8) + '...' : '-', mono: true },
    ]},
    { section: 'Database', items: [
      { label: 'Connection', value: h ? 'Connected' : 'Unknown', color: h ? 'text-green-600' : 'text-muted-foreground' },
      { label: 'Provider', value: 'PostgreSQL 16' },
      { label: 'Host', value: 'localhost:5448' },
      { label: 'Database', value: 'cointrack_enterprise' },
    ]},
    { section: 'Software Information', items: [
      { label: 'Application', value: 'CoinTrack Enterprise' },
      { label: 'Version', value: '1.0.0' },
      { label: 'API Framework', value: 'NestJS 10' },
      { label: 'Frontend', value: 'Next.js 14' },
      { label: 'ORM', value: 'Prisma 5' },
      { label: 'API URL', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3009/api', mono: true },
    ]},
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Tenant Info</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">System information, database connection, and software details.</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {infoRows.map((section) => (
          <div key={section.section}>
            <p className="text-sm font-medium text-muted-foreground mb-3">{section.section}</p>
            <div className="rounded-lg border divide-y">
              {section.items.map((item: any) => (
                <div key={item.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={cn('text-sm font-medium', item.mono && 'font-mono text-xs', item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmployeeLevelsTab({ levels, queryClient, toast }: { levels: any[]; queryClient: any; toast: any }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [order, setOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/settings/employee-levels', { name: name.trim(), order });
      queryClient.invalidateQueries({ queryKey: ['employee-levels'] });
      toast({ title: 'Level created' });
      setAdding(false); setName(''); setOrder(0);
    } catch (e: any) { toast({ title: 'Error', description: e?.response?.data?.message || 'Failed', variant: 'destructive' }); }
    setSaving(false);
  }

  async function handleUpdate(id: string) {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.put(`/settings/employee-levels/${id}`, { name: name.trim(), order });
      queryClient.invalidateQueries({ queryKey: ['employee-levels'] });
      toast({ title: 'Level updated' });
      setEditingId(null); setName(''); setOrder(0);
    } catch (e: any) { toast({ title: 'Error', description: e?.response?.data?.message || 'Failed', variant: 'destructive' }); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      await api.delete(`/settings/employee-levels/${id}`);
      queryClient.invalidateQueries({ queryKey: ['employee-levels'] });
      queryClient.invalidateQueries({ queryKey: ['approval-chains'] });
      toast({ title: 'Level deleted' });
    } catch (e: any) { toast({ title: 'Error', description: e?.response?.data?.message || 'Cannot delete — level may be in use', variant: 'destructive' }); }
    setSaving(false);
  }

  function startEdit(l: any) { setEditingId(l.id); setName(l.name); setOrder(l.order); setAdding(false); }
  function cancelEdit() { setEditingId(null); setAdding(false); setName(''); setOrder(0); }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Employee Levels</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Define your hierarchy levels. Higher order = more senior. These are used in Employee form and Approval Chain.</p>
        </div>
        {!adding && !editingId && (
          <Button size="sm" onClick={() => { setAdding(true); setName(''); setOrder(levels.length); }} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Level
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 border-b">
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground w-[80px]">Order</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Level Name</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground w-[100px]">Actions</th>
            </tr></thead>
            <tbody>
              {levels.length === 0 && !adding && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No employee levels defined yet. Click &quot;Add Level&quot; to create one.
                </td></tr>
              )}
              {levels.map((l: any) => (
                editingId === l.id ? (
                  <tr key={l.id} className="border-b bg-accent/30">
                    <td className="px-4 py-2"><Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className="h-8 w-16" /></td>
                    <td className="px-4 py-2"><Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" placeholder="Level name" /></td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" onClick={() => handleUpdate(l.id)} disabled={saving || !name.trim()} className="h-7 px-2 bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        </Button>
                        <button onClick={cancelEdit} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={l.id} className="border-b hover:bg-accent/20">
                    <td className="px-4 py-2 font-mono text-muted-foreground">{l.order}</td>
                    <td className="px-4 py-2 font-medium">{l.name}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(l)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(l.id)} disabled={saving} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
              {adding && (
                <tr className="border-b bg-accent/30">
                  <td className="px-4 py-2"><Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className="h-8 w-16" /></td>
                  <td className="px-4 py-2"><Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" placeholder="e.g., Team Lead" autoFocus /></td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" onClick={handleAdd} disabled={saving || !name.trim()} className="h-7 px-2 bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                      </Button>
                      <button onClick={cancelEdit} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
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
                          {levels.filter((l: any) => l.id !== level.id && l.order > level.order && !levelChains.some((c: any) => c.approverLevelId === l.id)).map((l: any) => (
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
