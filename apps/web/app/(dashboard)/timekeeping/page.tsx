'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Clock, Filter, X, Loader2, Play, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Timekeeping {
  id: string; name: string | null; startDate: string; endDate: string;
  payDate: string | null; cutoffType: string; status: string;
  _count: { data: number };
}

const schema = z.object({
  name: z.string().optional().or(z.literal('')),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  payDate: z.string().optional().or(z.literal('')),
  cutoffType: z.string().default('SEMI_MONTHLY'),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 10;
const STATUS_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'DRAFT', label: 'Draft' },
  { id: 'PROCESSING', label: 'Processing' }, { id: 'COMPLETED', label: 'Completed' },
] as const;

export default function TimekeepingPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCutoff, setFilterCutoff] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Timekeeping | null>(null);

  const activeFilterCount = [filterCutoff].filter(Boolean).length;
  function clearFilters() { setFilterCutoff(''); setPage(1); }

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema), defaultValues: { name: '', startDate: '', endDate: '', payDate: '', cutoffType: 'SEMI_MONTHLY' }, mode: 'onChange',
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['timekeeping', page, statusFilter, filterCutoff],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (filterCutoff) q.set('cutoffType', filterCutoff);
      return (await api.get(`/timekeeping?${q}`)).data;
    },
  });

  const records = (response?.data ?? []) as Timekeeping[];
  const total = response?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: (data: FormData) => { const p: Record<string, any> = { ...data }; if (!p.name) p.name = null; if (!p.payDate) p.payDate = null; return api.post('/timekeeping', p); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timekeeping'] }); setModalOpen(false); toast({ title: 'Timekeeping period created' }); },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  const processMutation = useMutation({
    mutationFn: (id: string) => api.post(`/timekeeping/${id}/process`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['timekeeping'] });
      toast({ title: 'Timekeeping processed', description: 'Attendance data has been aggregated.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message || 'Failed to process.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/timekeeping/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timekeeping'] }); setDeleteTarget(null); toast({ title: 'Deleted' }); },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  function openAdd() { reset({ name: '', startDate: '', endDate: '', payDate: '', cutoffType: 'SEMI_MONTHLY' }); setModalOpen(true); }

  const columns: Column<Timekeeping>[] = [
    {
      key: 'name', label: 'Period', sortable: true,
      render: (_: any, row: Timekeeping) => (
        <div>
          <p className="font-medium">{row.name || `${format(new Date(row.startDate), 'MMM d')} - ${format(new Date(row.endDate), 'MMM d, yyyy')}`}</p>
          <p className="text-xs text-muted-foreground">{row.cutoffType.replace('_', ' ')}</p>
        </div>
      ),
    },
    { key: 'startDate', label: 'Start', sortable: true, render: (v: string) => format(new Date(v), 'MMM d, yyyy') },
    { key: 'endDate', label: 'End', render: (v: string) => format(new Date(v), 'MMM d, yyyy') },
    { key: 'payDate', label: 'Pay Date', render: (v: string | null) => v ? format(new Date(v), 'MMM d, yyyy') : '-' },
    { key: '_count.data', label: 'Employees', render: (v: number) => v },
    { key: 'status', label: 'Status', render: (v: string) => <StatusBadge status={v} /> },
    {
      key: 'actions', label: '', className: 'w-[100px]',
      render: (_: any, row: Timekeeping) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
          {row.status === 'DRAFT' && (
            <button onClick={() => processMutation.mutate(row.id)} disabled={processMutation.isPending}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors" title="Process">
              {processMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          )}
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Timekeeping" description="Process timekeeping cutoff periods">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">New Period</Button>
      </PageHeader>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={total} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Draft" value={records.filter(r => r.status === 'DRAFT').length} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Processing" value={records.filter(r => r.status === 'PROCESSING').length} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Completed" value={records.filter(r => r.status === 'COMPLETED').length} icon={<Clock className="h-5 w-5" />} />
      </div>
      <DataTable<Timekeeping> columns={columns} data={records} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} isLoading={isLoading} emptyMessage="No timekeeping periods."
        emptyIcon={<Clock className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-3 flex-wrap">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild><Button variant="outline" size="sm" className="relative"><Filter className="h-3.5 w-3.5 mr-1.5" /> Filters{activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</Button></PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50"><p className="text-sm font-semibold">Filters</p>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear</button>}</div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Cutoff Type</Label>
                    <Select value={filterCutoff || 'ALL'} onValueChange={(v) => { setFilterCutoff(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent><SelectItem value="ALL">All types</SelectItem><SelectItem value="SEMI_MONTHLY">Semi-Monthly</SelectItem><SelectItem value="MONTHLY">Monthly</SelectItem><SelectItem value="WEEKLY">Weekly</SelectItem></SelectContent>
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
            <DialogTitle className="text-xl font-semibold">New Timekeeping Period</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">Create a cutoff period to process attendance data.</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="tk-form" onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-5">
              <div className="space-y-1.5"><Label className="text-sm">Period Name (optional)</Label><Input {...register('name')} placeholder="e.g., May 1-15, 2026" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">Start Date <span className="text-red-500">*</span></Label>
                  <Controller control={control} name="startDate" render={({ field }) => (
                    <DatePicker value={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')} placeholder="Start date" />
                  )} />
                </div>
                <div className="space-y-1.5"><Label className="text-sm">End Date <span className="text-red-500">*</span></Label>
                  <Controller control={control} name="endDate" render={({ field }) => (
                    <DatePicker value={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')} placeholder="End date" />
                  )} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">Pay Date</Label>
                  <Controller control={control} name="payDate" render={({ field }) => (
                    <DatePicker value={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')} placeholder="Pay date" />
                  )} />
                </div>
                <div className="space-y-1.5"><Label className="text-sm">Cutoff Type</Label>
                  <select {...register('cutoffType')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="SEMI_MONTHLY">Semi-Monthly</option><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={() => setModalOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="tk-form" disabled={!isValid || createMutation.isPending} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Period
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Timekeeping" description="Are you sure? This will also delete all associated timekeeping data."
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
