'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarCheck, Users, Clock, Filter, X, Loader2, Pencil, Trash2, CalendarIcon } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface AttendanceRecord {
  id: string; employeeId: string; date: string; timeIn: string | null; timeOut: string | null;
  status: string; workedHours: number; lateMinutes: number; undertimeMinutes: number;
  overtimeHours: number; nightDiffHours: number; isRestDay: boolean;
  isSpecialHoliday: boolean; isRegularHoliday: boolean; isDoubleHoliday: boolean;
  remarks: string | null;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string | null };
}

const schema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  date: z.string().min(1, 'Date is required'),
  timeIn: z.string().optional().or(z.literal('')),
  timeOut: z.string().optional().or(z.literal('')),
  status: z.string().default('PRESENT'),
  workedHours: z.coerce.number().default(0),
  lateMinutes: z.coerce.number().default(0),
  undertimeMinutes: z.coerce.number().default(0),
  overtimeHours: z.coerce.number().default(0),
  nightDiffHours: z.coerce.number().default(0),
  isRestDay: z.boolean().default(false),
  isSpecialHoliday: z.boolean().default(false),
  isRegularHoliday: z.boolean().default(false),
  remarks: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 50;
const STATUS_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'PRESENT', label: 'Present' },
  { id: 'ABSENT', label: 'Absent' }, { id: 'LATE', label: 'Late' },
  { id: 'ON_LEAVE', label: 'On Leave' }, { id: 'REST_DAY', label: 'Rest Day' },
] as const;

function fmtTime(val: string | null) { if (!val) return '-'; try { return format(new Date(val), 'hh:mm a'); } catch { return val; } }

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(today);
  const [filterEndDate, setFilterEndDate] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);

  const activeFilterCount = [filterEmployee, filterStartDate !== today ? filterStartDate : '', filterEndDate !== today ? filterEndDate : ''].filter(Boolean).length;
  function clearFilters() { setFilterEmployee(''); setFilterStartDate(today); setFilterEndDate(today); setPage(1); }

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { employeeId: '', date: today, timeIn: '', timeOut: '', status: 'PRESENT', workedHours: 8, lateMinutes: 0, undertimeMinutes: 0, overtimeHours: 0, nightDiffHours: 0, isRestDay: false, isSpecialHoliday: false, isRegularHoliday: false, remarks: '' },
    mode: 'onChange',
  });

  const employees = useQuery({ queryKey: ['employees-lookup'], queryFn: async () => (await api.get('/employees?limit=999')).data.data as { id: string; firstName: string; lastName: string; employeeNumber: string | null }[] });

  const { data: response, isLoading } = useQuery({
    queryKey: ['attendance', page, statusFilter, filterEmployee, filterStartDate, filterEndDate],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (filterEmployee) q.set('employeeId', filterEmployee);
      if (filterStartDate) q.set('startDate', filterStartDate);
      if (filterEndDate) q.set('endDate', filterEndDate);
      return (await api.get(`/attendance?${q}`)).data;
    },
  });

  const records = (response?.data ?? []) as AttendanceRecord[];
  const total = response?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const p: Record<string, any> = { ...data };
      // Convert time strings to ISO datetime using the date
      if (p.timeIn) p.timeIn = new Date(`${p.date}T${p.timeIn}`).toISOString();
      else p.timeIn = null;
      if (p.timeOut) p.timeOut = new Date(`${p.date}T${p.timeOut}`).toISOString();
      else p.timeOut = null;
      if (!p.remarks) p.remarks = null;
      return api.post('/attendance', p);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance'] }); closeModal(); toast({ title: 'Attendance recorded' }); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message || 'Failed.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => {
      const p: Record<string, any> = { ...data };
      if (p.timeIn) p.timeIn = new Date(`${p.date}T${p.timeIn}`).toISOString();
      else p.timeIn = null;
      if (p.timeOut) p.timeOut = new Date(`${p.date}T${p.timeOut}`).toISOString();
      else p.timeOut = null;
      if (!p.remarks) p.remarks = null;
      return api.put(`/attendance/${id}`, p);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance'] }); closeModal(); toast({ title: 'Attendance updated' }); },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/attendance/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance'] }); setDeleteTarget(null); toast({ title: 'Deleted' }); },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  function openAdd() {
    reset({ employeeId: '', date: today, timeIn: '08:00', timeOut: '17:00', status: 'PRESENT', workedHours: 8, lateMinutes: 0, undertimeMinutes: 0, overtimeHours: 0, nightDiffHours: 0, isRestDay: false, isSpecialHoliday: false, isRegularHoliday: false, remarks: '' });
    setEditing(null); setModalOpen(true);
  }

  function openEdit(r: AttendanceRecord) {
    const timeIn = r.timeIn ? format(new Date(r.timeIn), 'HH:mm') : '';
    const timeOut = r.timeOut ? format(new Date(r.timeOut), 'HH:mm') : '';
    reset({
      employeeId: r.employeeId, date: r.date.slice(0, 10), timeIn, timeOut,
      status: r.status, workedHours: Number(r.workedHours), lateMinutes: Number(r.lateMinutes),
      undertimeMinutes: Number(r.undertimeMinutes), overtimeHours: Number(r.overtimeHours),
      nightDiffHours: Number(r.nightDiffHours), isRestDay: r.isRestDay,
      isSpecialHoliday: r.isSpecialHoliday, isRegularHoliday: r.isRegularHoliday, remarks: r.remarks || '',
    });
    setEditing(r); setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }
  function onSubmit(data: FormData) { if (editing) updateMutation.mutate({ id: editing.id, data }); else createMutation.mutate(data); }
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'employee', label: 'Employee', sortable: true, sortKey: (r) => r.employee.lastName,
      render: (_: any, row: AttendanceRecord) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.employee.firstName[0]}{row.employee.lastName[0]}</div>
          <div><p className="font-medium truncate">{row.employee.lastName}, {row.employee.firstName}</p>{row.employee.employeeNumber && <p className="text-xs text-muted-foreground">{row.employee.employeeNumber}</p>}</div>
        </div>
      ),
    },
    { key: 'date', label: 'Date', sortable: true, render: (v: string) => format(new Date(v), 'MMM d, yyyy (EEE)') },
    { key: 'timeIn', label: 'Time In', render: (v: string | null) => fmtTime(v) },
    { key: 'timeOut', label: 'Time Out', render: (v: string | null) => fmtTime(v) },
    { key: 'workedHours', label: 'Hours', render: (v: number) => Number(v) > 0 ? Number(v).toFixed(2) : '-' },
    { key: 'lateMinutes', label: 'Late', render: (v: number) => Number(v) > 0 ? <span className="text-amber-600">{Number(v).toFixed(0)}m</span> : '-' },
    { key: 'overtimeHours', label: 'OT', render: (v: number) => Number(v) > 0 ? `${Number(v).toFixed(2)}h` : '-' },
    { key: 'status', label: 'Status', render: (v: string) => <StatusBadge status={v} /> },
    {
      key: 'actions', label: '', className: 'w-[80px]',
      render: (_: any, row: AttendanceRecord) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Attendance" description="View and manage employee attendance records">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">Add Record</Button>
      </PageHeader>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Records" value={total} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard title="Present" value={records.filter(r => r.status === 'PRESENT').length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Absent" value={records.filter(r => r.status === 'ABSENT').length} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Late" value={records.filter(r => r.status === 'LATE').length} icon={<Clock className="h-5 w-5" />} />
      </div>
      <DataTable<AttendanceRecord> columns={columns} data={records} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} onRowClick={openEdit} isLoading={isLoading}
        emptyMessage="No attendance records found." emptyIcon={<CalendarCheck className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-3 flex-wrap">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild><Button variant="outline" size="sm" className="relative"><Filter className="h-3.5 w-3.5 mr-1.5" /> Filters{activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</Button></PopoverTrigger>
              <PopoverContent className="w-[340px] p-0" align="start">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50"><p className="text-sm font-semibold">Filters</p>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear all</button>}</div>
                <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
                  <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Employee</Label>
                    <Select value={filterEmployee || 'ALL'} onValueChange={(v) => { setFilterEmployee(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent><SelectItem value="ALL">All employees</SelectItem>{(employees.data ?? []).map(e => <SelectItem key={e.id} value={e.id}>{e.lastName}, {e.firstName}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Date Range</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <DatePicker value={filterStartDate ? new Date(filterStartDate) : undefined} onChange={(d) => { setFilterStartDate(d ? format(d, 'yyyy-MM-dd') : ''); setPage(1); }} placeholder="From" className="h-9 text-xs" />
                      <DatePicker value={filterEndDate ? new Date(filterEndDate) : undefined} onChange={(d) => { setFilterEndDate(d ? format(d, 'yyyy-MM-dd') : ''); setPage(1); }} placeholder="To" className="h-9 text-xs" />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-1.5">
              {STATUS_CHIPS.map(c => <button key={c.id} onClick={() => { setStatusFilter(c.id); setPage(1); }} className={cn('shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors', statusFilter === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-accent')}>{c.label}</button>)}
            </div>
          </div>
        }
      />

      {/* Add/Edit Attendance Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">{editing ? 'Edit Attendance' : 'Add Attendance Record'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">{editing ? 'Update attendance record.' : 'Manually enter an attendance record.'}</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="att-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">Employee <span className="text-red-500">*</span></Label>
                  <Controller control={control} name="employeeId" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!editing}>
                      <SelectTrigger className={cn(errors.employeeId && 'border-red-300')}><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{(employees.data ?? []).map(e => <SelectItem key={e.id} value={e.id}>{e.lastName}, {e.firstName}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5"><Label className="text-sm">Date <span className="text-red-500">*</span></Label>
                  <Input type="date" {...register('date')} disabled={!!editing} className={cn(errors.date && 'border-red-300')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">Time In</Label><Input type="time" {...register('timeIn')} /></div>
                <div className="space-y-1.5"><Label className="text-sm">Time Out</Label><Input type="time" {...register('timeOut')} /></div>
                <div className="space-y-1.5"><Label className="text-sm">Status</Label>
                  <Controller control={control} name="status" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="PRESENT">Present</SelectItem><SelectItem value="ABSENT">Absent</SelectItem><SelectItem value="LATE">Late</SelectItem><SelectItem value="HALF_DAY">Half Day</SelectItem><SelectItem value="ON_LEAVE">On Leave</SelectItem><SelectItem value="REST_DAY">Rest Day</SelectItem></SelectContent>
                    </Select>
                  )} />
                </div>
              </div>

              <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Hours Breakdown</p></div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Worked Hrs</Label><Input type="number" step="0.01" {...register('workedHours')} /></div>
                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Late (min)</Label><Input type="number" {...register('lateMinutes')} /></div>
                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">UT (min)</Label><Input type="number" {...register('undertimeMinutes')} /></div>
                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">OT Hrs</Label><Input type="number" step="0.01" {...register('overtimeHours')} /></div>
                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">ND Hrs</Label><Input type="number" step="0.01" {...register('nightDiffHours')} /></div>
              </div>

              <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Day Type Flags</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Controller control={control} name="isRestDay" render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-3"><Label className="text-sm">Rest Day</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>
                )} />
                <Controller control={control} name="isSpecialHoliday" render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-3"><Label className="text-sm">Special Holiday</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>
                )} />
                <Controller control={control} name="isRegularHoliday" render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-3"><Label className="text-sm">Legal Holiday</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>
                )} />
              </div>

              <div className="space-y-1.5"><Label className="text-sm">Remarks</Label><Textarea {...register('remarks')} placeholder="Notes..." className="min-h-[60px]" /></div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={closeModal} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="att-form" disabled={!isValid || isSubmitting} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Record'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Attendance" description="Are you sure you want to delete this attendance record?"
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
