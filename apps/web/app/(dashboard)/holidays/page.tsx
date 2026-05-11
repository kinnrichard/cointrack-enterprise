'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarDays, Pencil, Trash2, Loader2, Filter, X } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  isRecurring: boolean;
  recurringMonth: number | null;
  recurringDay: number | null;
}

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  date: z.string().min(1, 'Date is required'),
  type: z.string().min(1, 'Type is required'),
  isRecurring: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 50;

const TYPE_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'REGULAR', label: 'Regular' },
  { id: 'SPECIAL', label: 'Special' },
] as const;

export default function HolidaysPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(String(currentYear));
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const activeFilterCount = [yearFilter !== String(currentYear) ? yearFilter : ''].filter(Boolean).length;

  function clearFilters() { setYearFilter(String(currentYear)); setPage(1); }

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', date: '', type: 'REGULAR', isRecurring: false },
    mode: 'onChange',
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['holidays', page, typeFilter, yearFilter],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (typeFilter !== 'all') q.set('type', typeFilter);
      if (yearFilter) q.set('year', yearFilter);
      return (await api.get(`/holidays?${q}`)).data;
    },
  });

  const holidays = (response?.data ?? []) as Holiday[];
  const total = response?.total ?? 0;
  const regularCount = holidays.filter((h) => h.type === 'REGULAR').length;
  const specialCount = holidays.filter((h) => h.type === 'SPECIAL').length;

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/holidays', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); closeModal(); toast({ title: 'Holiday created' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to create holiday.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => api.put(`/holidays/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); closeModal(); toast({ title: 'Holiday updated' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to update holiday.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/holidays/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); setDeleteTarget(null); toast({ title: 'Holiday deleted' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to delete holiday.', variant: 'destructive' }),
  });

  function openAdd() { reset({ name: '', date: '', type: 'REGULAR', isRecurring: false }); setEditing(null); setModalOpen(true); }
  function openEdit(h: Holiday) { reset({ name: h.name, date: h.date.slice(0, 10), type: h.type, isRecurring: h.isRecurring }); setEditing(h); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditing(null); }
  function onSubmit(data: FormData) { if (editing) updateMutation.mutate({ id: editing.id, data }); else createMutation.mutate(data); }
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const columns: Column<Holiday>[] = [
    {
      key: 'name', label: 'Holiday', sortable: true,
      render: (_: any, row: Holiday) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">
            {format(new Date(row.date), 'dd')}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{row.name}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(row.date), 'EEEE')}</p>
          </div>
        </div>
      ),
    },
    { key: 'date', label: 'Date', sortable: true, render: (val: string) => format(new Date(val), 'MMM d, yyyy') },
    { key: 'type', label: 'Type', render: (val: string) => <StatusBadge status={val} /> },
    { key: 'isRecurring', label: 'Recurring', render: (val: boolean) => val ? 'Yes' : 'No' },
    {
      key: 'actions', label: '', className: 'w-[80px]',
      render: (_: any, row: Holiday) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Holidays" description="Manage holidays and special dates">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">Add Holiday</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Holidays" value={total} icon={<CalendarDays className="h-5 w-5" />} />
        <StatCard title="Regular" value={regularCount} icon={<CalendarDays className="h-5 w-5" />} />
        <StatCard title="Special" value={specialCount} icon={<CalendarDays className="h-5 w-5" />} />
      </div>

      <DataTable<Holiday>
        columns={columns} data={holidays} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} onRowClick={openEdit} isLoading={isLoading}
        emptyMessage="No holidays found." emptyIcon={<CalendarDays className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-3 flex-wrap">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="h-3.5 w-3.5 mr-1.5" /> Filters
                  {activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                  <p className="text-sm font-semibold">Filters</p>
                  {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear</button>}
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Year</Label>
                    <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-1.5">
              {TYPE_CHIPS.map((chip) => (
                <button key={chip.id} onClick={() => { setTypeFilter(chip.id); setPage(1); }}
                  className={cn('shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors', typeFilter === chip.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-accent')}
                >{chip.label}</button>
              ))}
            </div>
          </div>
        }
      />

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">{editing ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">{editing ? 'Update holiday information.' : 'Add a new holiday to the calendar.'}</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="holiday-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm">Name <span className="text-red-500">*</span></Label>
                <Input {...register('name')} placeholder="e.g., New Year's Day" className={cn(errors.name && 'border-red-300 focus-visible:ring-red-200')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Date <span className="text-red-500">*</span></Label>
                  <Controller control={control} name="date" render={({ field }) => (
                    <DatePicker value={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')} placeholder="Select date" />
                  )} />
                  {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Type <span className="text-red-500">*</span></Label>
                  <Controller control={control} name="type" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REGULAR">Regular Holiday</SelectItem>
                        <SelectItem value="SPECIAL">Special Non-Working</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              </div>
              <Controller control={control} name="isRecurring" render={({ field }) => (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-sm">Recurring Annually</Label>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )} />
            </form>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={closeModal} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="holiday-form" disabled={!isValid || isSubmitting} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Holiday'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Holiday" description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
