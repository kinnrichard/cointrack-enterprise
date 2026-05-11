'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign, Pencil, Trash2, Users, Loader2, Filter, X } from 'lucide-react';
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

interface Rate {
  id: string;
  name: string;
  code: string | null;
  dailyRate: number;
  hourlyRate: number;
  regularOTMultiplier: number;
  nightDiffMultiplier: number;
  specialHolidayMultiplier: number;
  specialHolidayOTMultiplier: number;
  legalHolidayMultiplier: number;
  legalHolidayOTMultiplier: number;
  restDayMultiplier: number;
  restDayOTMultiplier: number;
  doubleHolidayMultiplier: number;
  doubleHolidayOTMultiplier: number;
  isActive: boolean;
  _count: { employees: number };
}

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().optional().or(z.literal('')),
  dailyRate: z.coerce.number().min(0).default(0),
  hourlyRate: z.coerce.number().min(0).default(0),
  regularOTMultiplier: z.coerce.number().default(1.25),
  nightDiffMultiplier: z.coerce.number().default(0.10),
  specialHolidayMultiplier: z.coerce.number().default(1.30),
  specialHolidayOTMultiplier: z.coerce.number().default(1.69),
  legalHolidayMultiplier: z.coerce.number().default(2.00),
  legalHolidayOTMultiplier: z.coerce.number().default(2.60),
  restDayMultiplier: z.coerce.number().default(1.30),
  restDayOTMultiplier: z.coerce.number().default(1.69),
  doubleHolidayMultiplier: z.coerce.number().default(2.60),
  doubleHolidayOTMultiplier: z.coerce.number().default(3.38),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 10;

function fmt(val: number | string) {
  return Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RatesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterHasEmployees, setFilterHasEmployees] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rate | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', dailyRate: 0, hourlyRate: 0, regularOTMultiplier: 1.25, nightDiffMultiplier: 0.10, specialHolidayMultiplier: 1.30, specialHolidayOTMultiplier: 1.69, legalHolidayMultiplier: 2.00, legalHolidayOTMultiplier: 2.60, restDayMultiplier: 1.30, restDayOTMultiplier: 1.69, doubleHolidayMultiplier: 2.60, doubleHolidayOTMultiplier: 3.38, isActive: true },
    mode: 'onChange',
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['rates', page, search],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) q.set('search', search);
      return (await api.get(`/rates?${q}`)).data;
    },
  });

  const rates = (response?.data ?? []) as Rate[];
  const total = response?.total ?? 0;
  let filtered = statusFilter === 'all' ? rates : statusFilter === 'active' ? rates.filter((r) => r.isActive) : rates.filter((r) => !r.isActive);
  if (filterHasEmployees === 'with') filtered = filtered.filter(r => r._count.employees > 0);
  if (filterHasEmployees === 'without') filtered = filtered.filter(r => r._count.employees === 0);
  const activeFilterCount = [filterHasEmployees !== 'all' ? filterHasEmployees : ''].filter(Boolean).length;
  function clearFilters() { setFilterHasEmployees('all'); setPage(1); }
  const activeCount = rates.filter((r) => r.isActive).length;
  const totalEmployees = rates.reduce((sum, r) => sum + r._count.employees, 0);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => { const p: Record<string, any> = { ...data }; for (const k of Object.keys(p)) if (p[k] === '') p[k] = null; return api.post('/rates', p); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rates'] }); closeModal(); toast({ title: 'Rate created' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to create rate.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => { const p: Record<string, any> = { ...data }; for (const k of Object.keys(p)) if (p[k] === '') p[k] = null; return api.put(`/rates/${id}`, p); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rates'] }); closeModal(); toast({ title: 'Rate updated' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to update rate.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/rates/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rates'] }); setDeleteTarget(null); toast({ title: 'Rate deleted' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to delete rate.', variant: 'destructive' }),
  });

  function openAdd() {
    reset({ name: '', code: '', dailyRate: 0, hourlyRate: 0, regularOTMultiplier: 1.25, nightDiffMultiplier: 0.10, specialHolidayMultiplier: 1.30, specialHolidayOTMultiplier: 1.69, legalHolidayMultiplier: 2.00, legalHolidayOTMultiplier: 2.60, restDayMultiplier: 1.30, restDayOTMultiplier: 1.69, doubleHolidayMultiplier: 2.60, doubleHolidayOTMultiplier: 3.38, isActive: true });
    setEditing(null); setModalOpen(true);
  }

  function openEdit(rate: Rate) {
    reset({
      name: rate.name, code: rate.code || '', dailyRate: Number(rate.dailyRate), hourlyRate: Number(rate.hourlyRate),
      regularOTMultiplier: Number(rate.regularOTMultiplier), nightDiffMultiplier: Number(rate.nightDiffMultiplier),
      specialHolidayMultiplier: Number(rate.specialHolidayMultiplier), specialHolidayOTMultiplier: Number(rate.specialHolidayOTMultiplier),
      legalHolidayMultiplier: Number(rate.legalHolidayMultiplier), legalHolidayOTMultiplier: Number(rate.legalHolidayOTMultiplier),
      restDayMultiplier: Number(rate.restDayMultiplier), restDayOTMultiplier: Number(rate.restDayOTMultiplier),
      doubleHolidayMultiplier: Number(rate.doubleHolidayMultiplier), doubleHolidayOTMultiplier: Number(rate.doubleHolidayOTMultiplier),
      isActive: rate.isActive,
    });
    setEditing(rate); setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }
  function onSubmit(data: FormData) { if (editing) updateMutation.mutate({ id: editing.id, data }); else createMutation.mutate(data); }
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const columns: Column<Rate>[] = [
    {
      key: 'name', label: 'Rate Table', sortable: true,
      render: (_: any, row: Rate) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.name.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{row.name}</p>
            {row.code && <p className="text-xs text-muted-foreground">{row.code}</p>}
          </div>
        </div>
      ),
    },
    { key: 'dailyRate', label: 'Daily Rate', sortable: true, render: (val: number) => `₱${fmt(val)}` },
    { key: 'hourlyRate', label: 'Hourly Rate', sortable: true, render: (val: number) => `₱${fmt(val)}` },
    { key: '_count.employees', label: 'Employees', sortable: true, render: (val: number) => val },
    { key: 'isActive', label: 'Status', render: (val: boolean) => <StatusBadge status={val ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions', label: '', className: 'w-[80px]',
      render: (_: any, row: Rate) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  const STATUS_CHIPS = [{ id: 'all', label: 'All' }, { id: 'active', label: 'Active' }, { id: 'inactive', label: 'Inactive' }] as const;

  const MULTIPLIER_FIELDS = [
    { name: 'regularOTMultiplier' as const, label: 'Regular OT' },
    { name: 'nightDiffMultiplier' as const, label: 'Night Diff' },
    { name: 'restDayMultiplier' as const, label: 'Rest Day' },
    { name: 'restDayOTMultiplier' as const, label: 'Rest Day OT' },
    { name: 'specialHolidayMultiplier' as const, label: 'Special Holiday' },
    { name: 'specialHolidayOTMultiplier' as const, label: 'Special Holiday OT' },
    { name: 'legalHolidayMultiplier' as const, label: 'Legal Holiday' },
    { name: 'legalHolidayOTMultiplier' as const, label: 'Legal Holiday OT' },
    { name: 'doubleHolidayMultiplier' as const, label: 'Double Holiday' },
    { name: 'doubleHolidayOTMultiplier' as const, label: 'Double Holiday OT' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Rates" description="Manage salary rate tables and premium multipliers">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">Add Rate</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Rates" value={total} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="Active" value={activeCount} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="Total Employees" value={totalEmployees} icon={<Users className="h-5 w-5" />} />
      </div>

      <DataTable<Rate>
        columns={columns} data={filtered} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search rates..." onRowClick={openEdit} isLoading={isLoading}
        emptyMessage="No rates found." emptyIcon={<DollarSign className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-3 flex-wrap">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild><Button variant="outline" size="sm" className="relative"><Filter className="h-3.5 w-3.5 mr-1.5" /> Filters{activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</Button></PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50"><p className="text-sm font-semibold">Filters</p>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear</button>}</div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Employees</Label>
                    <select value={filterHasEmployees} onChange={(e) => { setFilterHasEmployees(e.target.value); setPage(1); }} className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="all">All rates</option><option value="with">With employees</option><option value="without">Without employees</option></select>
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
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">{editing ? 'Edit Rate' : 'Add New Rate'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">{editing ? 'Update rate table information.' : 'Define a new rate table with premium multipliers.'}</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="rate-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Name <span className="text-red-500">*</span></Label>
                  <Input {...register('name')} placeholder="e.g., Minimum Wage NCR" className={cn(errors.name && 'border-red-300 focus-visible:ring-red-200')} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Code</Label>
                  <Input {...register('code')} placeholder="e.g., MW-NCR" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Daily Rate</Label>
                  <Input type="number" step="0.01" {...register('dailyRate')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Hourly Rate</Label>
                  <Input type="number" step="0.01" {...register('hourlyRate')} />
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Premium Multipliers (Philippine Labor Law)</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {MULTIPLIER_FIELDS.map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <Input type="number" step="0.01" {...register(f.name)} />
                  </div>
                ))}
              </div>

              <Controller control={control} name="isActive" render={({ field }) => (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-sm">Active</Label>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )} />
            </form>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={closeModal} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="rate-form" disabled={!isValid || isSubmitting} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Rate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Rate" description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
