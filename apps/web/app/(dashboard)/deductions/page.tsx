'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, Filter, X, Loader2, Trash2 } from 'lucide-react';
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
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Deduction {
  id: string; employeeId: string; type: string; name: string | null; amount: number;
  amountPerCutoff: number; balance: number; isActive: boolean;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string | null };
}

const schema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  type: z.string().min(1, 'Type is required'),
  name: z.string().optional().or(z.literal('')),
  amount: z.coerce.number().min(1, 'Amount is required'),
  amountPerCutoff: z.coerce.number().min(0).default(0),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 10;
const TYPE_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'SSS_LOAN', label: 'SSS' }, { id: 'PAGIBIG_LOAN', label: 'Pag-IBIG' },
  { id: 'CASH_ADVANCE', label: 'Cash Adv' }, { id: 'COMPANY_LOAN', label: 'Company' },
] as const;

function fmt(v: number | string) { return Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function DeductionsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Deduction | null>(null);

  const activeFilterCount = [filterEmployee, filterActive !== 'all' ? filterActive : ''].filter(Boolean).length;
  function clearFilters() { setFilterEmployee(''); setFilterActive('all'); setPage(1); }

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema), defaultValues: { employeeId: '', type: 'CASH_ADVANCE', name: '', amount: 0, amountPerCutoff: 0 }, mode: 'onChange',
  });

  const employees = useQuery({ queryKey: ['employees-lookup'], queryFn: async () => (await api.get('/employees?limit=999')).data.data as { id: string; firstName: string; lastName: string }[] });

  const { data: response, isLoading } = useQuery({
    queryKey: ['deductions', page, typeFilter, filterEmployee, filterActive],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (typeFilter !== 'all') q.set('type', typeFilter);
      if (filterEmployee) q.set('employeeId', filterEmployee);
      if (filterActive === 'active') q.set('isActive', 'true');
      if (filterActive === 'inactive') q.set('isActive', 'false');
      return (await api.get(`/deductions?${q}`)).data;
    },
  });

  const deductions = (response?.data ?? []) as Deduction[];
  const total = response?.total ?? 0;
  const totalBalance = deductions.reduce((s, d) => s + Number(d.balance), 0);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const p: Record<string, any> = { ...data, balance: data.amount };
      if (p.name === '') p.name = null;
      return api.post('/deductions', p);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deductions'] }); setModalOpen(false); toast({ title: 'Deduction created' }); },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/deductions/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deductions'] }); setDeleteTarget(null); toast({ title: 'Deleted' }); },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  function openAdd() { reset({ employeeId: '', type: 'CASH_ADVANCE', name: '', amount: 0, amountPerCutoff: 0 }); setModalOpen(true); }

  const columns: Column<Deduction>[] = [
    {
      key: 'employee', label: 'Employee', sortable: true, sortKey: (r) => r.employee.lastName,
      render: (_: any, row: Deduction) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.employee.firstName[0]}{row.employee.lastName[0]}</div>
          <div><p className="font-medium truncate">{row.employee.lastName}, {row.employee.firstName}</p>{row.employee.employeeNumber && <p className="text-xs text-muted-foreground">{row.employee.employeeNumber}</p>}</div>
        </div>
      ),
    },
    { key: 'type', label: 'Type', render: (v: string) => <StatusBadge status={v} /> },
    { key: 'amount', label: 'Total', render: (v: number) => `₱${fmt(v)}` },
    { key: 'amountPerCutoff', label: 'Per Cutoff', render: (v: number) => `₱${fmt(v)}` },
    { key: 'balance', label: 'Balance', render: (v: number) => `₱${fmt(v)}` },
    { key: 'isActive', label: 'Status', render: (v: boolean) => <StatusBadge status={v ? 'ACTIVE' : 'COMPLETED'} /> },
    {
      key: 'actions', label: '', className: 'w-[50px]',
      render: (_: any, row: Deduction) => (
        <div onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Deductions" description="Manage employee deductions and loan payments">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">Add Deduction</Button>
      </PageHeader>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total" value={total} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard title="Active" value={deductions.filter(d => d.isActive).length} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard title="Total Balance" value={`₱${fmt(totalBalance)}`} icon={<CreditCard className="h-5 w-5" />} />
      </div>
      <DataTable<Deduction> columns={columns} data={deductions} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} isLoading={isLoading} emptyMessage="No deductions found."
        emptyIcon={<CreditCard className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-3 flex-wrap">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild><Button variant="outline" size="sm" className="relative"><Filter className="h-3.5 w-3.5 mr-1.5" /> Filters{activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</Button></PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50"><p className="text-sm font-semibold">Filters</p>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear</button>}</div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Employee</Label>
                    <Select value={filterEmployee || 'ALL'} onValueChange={(v) => { setFilterEmployee(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent><SelectItem value="ALL">All employees</SelectItem>{(employees.data ?? []).map(e => <SelectItem key={e.id} value={e.id}>{e.lastName}, {e.firstName}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Status</Label>
                    <Select value={filterActive} onValueChange={(v) => { setFilterActive(v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Completed</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-1.5">
              {TYPE_CHIPS.map(c => <button key={c.id} onClick={() => { setTypeFilter(c.id); setPage(1); }} className={cn('shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors', typeFilter === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-accent')}>{c.label}</button>)}
            </div>
          </div>
        }
      />

      <Dialog open={modalOpen} onOpenChange={(open) => !open && setModalOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">Add Deduction</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">Create a new deduction for an employee.</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="ded-form" onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-5">
              <div className="space-y-1.5"><Label className="text-sm">Employee <span className="text-red-500">*</span></Label>
                <Controller control={control} name="employeeId" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}><SelectTrigger className={cn(errors.employeeId && 'border-red-300')}><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{(employees.data ?? []).map(e => <SelectItem key={e.id} value={e.id}>{e.lastName}, {e.firstName}</SelectItem>)}</SelectContent></Select>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">Type <span className="text-red-500">*</span></Label>
                  <Controller control={control} name="type" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SSS_LOAN">SSS Loan</SelectItem><SelectItem value="SSS_CALAMITY">SSS Calamity</SelectItem>
                        <SelectItem value="PAGIBIG_LOAN">Pag-IBIG Loan</SelectItem><SelectItem value="PAGIBIG_CALAMITY">Pag-IBIG Calamity</SelectItem>
                        <SelectItem value="CASH_ADVANCE">Cash Advance</SelectItem><SelectItem value="COMPANY_LOAN">Company Loan</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent></Select>
                  )} />
                </div>
                <div className="space-y-1.5"><Label className="text-sm">Name (optional)</Label><Input {...register('name')} placeholder="Description" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">Total Amount <span className="text-red-500">*</span></Label><Input type="number" step="0.01" {...register('amount')} className={cn(errors.amount && 'border-red-300')} /></div>
                <div className="space-y-1.5"><Label className="text-sm">Amount Per Cutoff</Label><Input type="number" step="0.01" {...register('amountPerCutoff')} /></div>
              </div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={() => setModalOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="ded-form" disabled={!isValid || createMutation.isPending} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Deduction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Deduction" description="Are you sure you want to delete this deduction?"
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
