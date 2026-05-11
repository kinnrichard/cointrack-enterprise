'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Timer, Filter, X, Loader2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface OTApp {
  id: string; employeeId: string; date: string; requestedHours: number; actualHours: number | null;
  reason: string | null; status: string;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string | null };
}

const schema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  date: z.string().min(1, 'Date is required'),
  requestedHours: z.coerce.number().min(0.5, 'At least 0.5 hours'),
  reason: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 10;
const STATUS_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' }, { id: 'REJECTED', label: 'Rejected' },
] as const;

export default function OvertimePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OTApp | null>(null);

  const activeFilterCount = [filterEmployee].filter(Boolean).length;
  function clearFilters() { setFilterEmployee(''); setPage(1); }

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema), defaultValues: { employeeId: '', date: '', requestedHours: 1, reason: '' }, mode: 'onChange',
  });

  const employees = useQuery({ queryKey: ['employees-lookup'], queryFn: async () => (await api.get('/employees?limit=999')).data.data as { id: string; firstName: string; lastName: string }[] });

  const { data: response, isLoading } = useQuery({
    queryKey: ['overtime', page, statusFilter, filterEmployee],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (filterEmployee) q.set('employeeId', filterEmployee);
      return (await api.get(`/overtime?${q}`)).data;
    },
  });

  const records = (response?.data ?? []) as OTApp[];
  const total = response?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/overtime', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['overtime'] }); setModalOpen(false); toast({ title: 'OT application filed' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to create.', variant: 'destructive' }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/overtime/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['overtime'] }); toast({ title: 'Status updated' }); },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/overtime/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['overtime'] }); setDeleteTarget(null); toast({ title: 'Deleted' }); },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  function openAdd() { reset({ employeeId: '', date: '', requestedHours: 1, reason: '' }); setModalOpen(true); }

  const columns: Column<OTApp>[] = [
    {
      key: 'employee', label: 'Employee', sortable: true, sortKey: (r) => r.employee.lastName,
      render: (_: any, row: OTApp) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.employee.firstName[0]}{row.employee.lastName[0]}</div>
          <div><p className="font-medium truncate">{row.employee.lastName}, {row.employee.firstName}</p>{row.employee.employeeNumber && <p className="text-xs text-muted-foreground">{row.employee.employeeNumber}</p>}</div>
        </div>
      ),
    },
    { key: 'date', label: 'Date', sortable: true, render: (v: string) => format(new Date(v), 'MMM d, yyyy') },
    { key: 'requestedHours', label: 'Requested', render: (v: number) => `${Number(v).toFixed(1)} hrs` },
    { key: 'actualHours', label: 'Actual', render: (v: number | null) => v ? `${Number(v).toFixed(1)} hrs` : '-' },
    { key: 'reason', label: 'Reason', render: (v: string | null) => v || '-' },
    { key: 'status', label: 'Status', render: (v: string) => <StatusBadge status={v} /> },
    {
      key: 'actions', label: '', className: 'w-[120px]',
      render: (_: any, row: OTApp) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
          {row.status === 'PENDING' && (
            <>
              <button onClick={() => updateStatusMutation.mutate({ id: row.id, status: 'APPROVED' })} className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors" title="Approve"><CheckCircle className="h-3.5 w-3.5" /></button>
              <button onClick={() => updateStatusMutation.mutate({ id: row.id, status: 'REJECTED' })} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Reject"><XCircle className="h-3.5 w-3.5" /></button>
            </>
          )}
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Overtime Applications" description="Manage overtime requests and approvals">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">File Overtime</Button>
      </PageHeader>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={total} icon={<Timer className="h-5 w-5" />} />
        <StatCard title="Pending" value={records.filter(r => r.status === 'PENDING').length} icon={<Timer className="h-5 w-5" />} />
        <StatCard title="Approved" value={records.filter(r => r.status === 'APPROVED').length} icon={<Timer className="h-5 w-5" />} />
        <StatCard title="Rejected" value={records.filter(r => r.status === 'REJECTED').length} icon={<Timer className="h-5 w-5" />} />
      </div>
      <DataTable<OTApp> columns={columns} data={records} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} isLoading={isLoading} emptyMessage="No overtime applications found."
        emptyIcon={<Timer className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-3 flex-wrap">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild><Button variant="outline" size="sm" className="relative"><Filter className="h-3.5 w-3.5 mr-1.5" /> Filters{activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</Button></PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50"><p className="text-sm font-semibold">Filters</p>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear</button>}</div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Employee</Label>
                    <Select value={filterEmployee || 'ALL'} onValueChange={(v) => { setFilterEmployee(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All employees" /></SelectTrigger>
                      <SelectContent><SelectItem value="ALL">All employees</SelectItem>{(employees.data ?? []).map(e => <SelectItem key={e.id} value={e.id}>{e.lastName}, {e.firstName}</SelectItem>)}</SelectContent>
                    </Select>
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

      <Dialog open={modalOpen} onOpenChange={(open) => !open && setModalOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">File Overtime</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">Submit an overtime application for an employee.</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="ot-form" onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm">Employee <span className="text-red-500">*</span></Label>
                <Controller control={control} name="employeeId" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(errors.employeeId && 'border-red-300')}><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{(employees.data ?? []).map(e => <SelectItem key={e.id} value={e.id}>{e.lastName}, {e.firstName}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Date <span className="text-red-500">*</span></Label>
                  <Controller control={control} name="date" render={({ field }) => (
                    <DatePicker value={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')} placeholder="Select date" />
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Hours <span className="text-red-500">*</span></Label>
                  <Input type="number" step="0.5" {...register('requestedHours')} className={cn(errors.requestedHours && 'border-red-300')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Reason</Label>
                <Textarea {...register('reason')} placeholder="Reason for overtime..." className="min-h-[80px]" />
              </div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={() => setModalOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="ot-form" disabled={!isValid || createMutation.isPending} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit OT
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete OT Application" description="Are you sure you want to delete this overtime application?"
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
