'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Pencil, Trash2, Users, Loader2, Filter, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Schedule {
  id: string;
  name: string;
  code: string | null;
  timeIn: string;
  timeOut: string;
  noBreak: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  isActive: boolean;
  _count: { employees: number };
}

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().optional().or(z.literal('')),
  timeIn: z.string().min(1, 'Time in is required'),
  timeOut: z.string().min(1, 'Time out is required'),
  noBreak: z.boolean().default(false),
  monday: z.boolean().default(true),
  tuesday: z.boolean().default(true),
  wednesday: z.boolean().default(true),
  thursday: z.boolean().default(true),
  friday: z.boolean().default(true),
  saturday: z.boolean().default(false),
  sunday: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 10;
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatWorkDays(sched: Schedule) {
  const days = DAYS.filter((d) => sched[d]);
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && !sched.saturday && !sched.sunday) return 'Mon - Fri';
  if (days.length === 6 && !sched.sunday) return 'Mon - Sat';
  return days.map((d) => d.slice(0, 3).replace(/^./, (c) => c.toUpperCase())).join(', ');
}

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterHasEmployees, setFilterHasEmployees] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', timeIn: '07:00', timeOut: '16:00', noBreak: false, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false, isActive: true },
    mode: 'onChange',
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['schedules', page, search],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) q.set('search', search);
      return (await api.get(`/schedules?${q}`)).data;
    },
  });

  const schedules = (response?.data ?? []) as Schedule[];
  const total = response?.total ?? 0;
  let filtered = statusFilter === 'all' ? schedules : statusFilter === 'active' ? schedules.filter((s) => s.isActive) : schedules.filter((s) => !s.isActive);
  if (filterHasEmployees === 'with') filtered = filtered.filter(s => s._count.employees > 0);
  if (filterHasEmployees === 'without') filtered = filtered.filter(s => s._count.employees === 0);
  const activeFilterCount = [filterHasEmployees !== 'all' ? filterHasEmployees : ''].filter(Boolean).length;
  function clearFilters() { setFilterHasEmployees('all'); setPage(1); }
  const activeCount = schedules.filter((s) => s.isActive).length;
  const totalEmployees = schedules.reduce((sum, s) => sum + s._count.employees, 0);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => { const p: Record<string, any> = { ...data }; for (const k of Object.keys(p)) if (p[k] === '') p[k] = null; return api.post('/schedules', p); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['schedules'] }); closeModal(); toast({ title: 'Schedule created' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to create schedule.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => { const p: Record<string, any> = { ...data }; for (const k of Object.keys(p)) if (p[k] === '') p[k] = null; return api.put(`/schedules/${id}`, p); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['schedules'] }); closeModal(); toast({ title: 'Schedule updated' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to update schedule.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/schedules/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['schedules'] }); setDeleteTarget(null); toast({ title: 'Schedule deleted' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to delete schedule.', variant: 'destructive' }),
  });

  function openAdd() {
    reset({ name: '', code: '', timeIn: '07:00', timeOut: '16:00', noBreak: false, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false, isActive: true });
    setEditing(null); setModalOpen(true);
  }

  function openEdit(sched: Schedule) {
    reset({ name: sched.name, code: sched.code || '', timeIn: sched.timeIn, timeOut: sched.timeOut, noBreak: sched.noBreak, monday: sched.monday, tuesday: sched.tuesday, wednesday: sched.wednesday, thursday: sched.thursday, friday: sched.friday, saturday: sched.saturday, sunday: sched.sunday, isActive: sched.isActive });
    setEditing(sched); setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }
  function onSubmit(data: FormData) { if (editing) updateMutation.mutate({ id: editing.id, data }); else createMutation.mutate(data); }
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const columns: Column<Schedule>[] = [
    {
      key: 'name', label: 'Schedule', sortable: true,
      render: (_: any, row: Schedule) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.name.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{row.name}</p>
            {row.code && <p className="text-xs text-muted-foreground">{row.code}</p>}
          </div>
        </div>
      ),
    },
    { key: 'timeIn', label: 'Time In', render: (val: string) => val },
    { key: 'timeOut', label: 'Time Out', render: (val: string) => val },
    { key: 'monday', label: 'Work Days', render: (_: any, row: Schedule) => <span className="text-sm">{formatWorkDays(row)}</span> },
    { key: '_count.employees', label: 'Employees', sortable: true, render: (val: number) => val },
    { key: 'isActive', label: 'Status', render: (val: boolean) => <StatusBadge status={val ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions', label: '', className: 'w-[80px]',
      render: (_: any, row: Schedule) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  const STATUS_CHIPS = [{ id: 'all', label: 'All' }, { id: 'active', label: 'Active' }, { id: 'inactive', label: 'Inactive' }] as const;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Schedules" description="Manage work schedules and shift patterns">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">Add Schedule</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Schedules" value={total} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Active" value={activeCount} icon={<Calendar className="h-5 w-5" />} />
        <StatCard title="Total Employees" value={totalEmployees} icon={<Users className="h-5 w-5" />} />
      </div>

      <DataTable<Schedule>
        columns={columns} data={filtered} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search schedules..." onRowClick={openEdit} isLoading={isLoading}
        emptyMessage="No schedules found." emptyIcon={<Calendar className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-3 flex-wrap">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild><Button variant="outline" size="sm" className="relative"><Filter className="h-3.5 w-3.5 mr-1.5" /> Filters{activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</Button></PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50"><p className="text-sm font-semibold">Filters</p>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear</button>}</div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Employees</Label>
                    <select value={filterHasEmployees} onChange={(e) => { setFilterHasEmployees(e.target.value); setPage(1); }} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="all">All schedules</option><option value="with">With employees</option><option value="without">Without employees</option></select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-1.5">
              {STATUS_CHIPS.map((chip) => (
                <button key={chip.id} onClick={() => { setStatusFilter(chip.id); setPage(1); }}
                  className={cn('shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors', statusFilter === chip.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-accent')}
                >{chip.label}</button>
              ))}
            </div>
          </div>
        }
      />

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">{editing ? 'Edit Schedule' : 'Add New Schedule'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">{editing ? 'Update schedule information.' : 'Define a new work schedule.'}</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="sched-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Name <span className="text-red-500">*</span></Label>
                  <Input {...register('name')} placeholder="e.g., Regular Shift" className={cn(errors.name && 'border-red-300 focus-visible:ring-red-200')} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Code</Label>
                  <Input {...register('code')} placeholder="e.g., REG, MID" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Time In <span className="text-red-500">*</span></Label>
                  <Input type="time" {...register('timeIn')} className={cn(errors.timeIn && 'border-red-300 focus-visible:ring-red-200')} />
                  {errors.timeIn && <p className="text-xs text-red-500">{errors.timeIn.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Time Out <span className="text-red-500">*</span></Label>
                  <Input type="time" {...register('timeOut')} className={cn(errors.timeOut && 'border-red-300 focus-visible:ring-red-200')} />
                  {errors.timeOut && <p className="text-xs text-red-500">{errors.timeOut.message}</p>}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Work Days</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day, i) => (
                  <Controller key={day} control={control} name={day} render={({ field }) => (
                    <button type="button" onClick={() => field.onChange(!field.value)}
                      className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-colors', field.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-accent')}
                    >{DAY_LABELS[i]}</button>
                  )} />
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Controller control={control} name="noBreak" render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label className="text-sm">No Break</Label>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                )} />
                <Controller control={control} name="isActive" render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label className="text-sm">Active</Label>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                )} />
              </div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={closeModal} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="sched-form" disabled={!isValid || isSubmitting} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Schedule'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Schedule" description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
