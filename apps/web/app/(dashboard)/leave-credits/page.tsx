'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarPlus, Filter, X, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
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

interface LeaveCredit {
  id: string; employeeId: string; leaveTypeId: string; year: number;
  allocated: number; used: number; adjusted: number; balance: number;
  employee: { id: string; firstName: string; lastName: string };
  leaveType: { id: string; name: string; code: string };
}

const schema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  leaveTypeId: z.string().min(1, 'Leave type is required'),
  year: z.coerce.number().min(2020),
  allocated: z.coerce.number().min(0).default(0),
});

type FormData = z.infer<typeof schema>;
const currentYear = new Date().getFullYear();

export default function LeaveCreditsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [modalOpen, setModalOpen] = useState(false);

  const activeFilterCount = [filterEmployee, filterYear !== String(currentYear) ? filterYear : ''].filter(Boolean).length;
  function clearFilters() { setFilterEmployee(''); setFilterYear(String(currentYear)); }

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema), defaultValues: { employeeId: '', leaveTypeId: '', year: currentYear, allocated: 15 }, mode: 'onChange',
  });

  const employees = useQuery({ queryKey: ['employees-lookup'], queryFn: async () => (await api.get('/employees?limit=999')).data.data as { id: string; firstName: string; lastName: string }[] });
  const leaveTypes = useQuery({ queryKey: ['leave-types'], queryFn: async () => (await api.get('/leaves/types')).data as { id: string; name: string; code: string }[] });

  const { data: credits, isLoading } = useQuery({
    queryKey: ['leave-credits', filterEmployee, filterYear],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (filterEmployee) q.set('employeeId', filterEmployee);
      if (filterYear) q.set('year', filterYear);
      return (await api.get(`/leaves/credits?${q}`)).data as LeaveCredit[];
    },
  });

  const data = credits ?? [];

  const createMutation = useMutation({
    mutationFn: (d: FormData) => api.post('/leaves/credits', { ...d, balance: d.allocated }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leave-credits'] }); setModalOpen(false); toast({ title: 'Leave credit allocated' }); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message || 'Failed.', variant: 'destructive' }),
  });

  function openAdd() { reset({ employeeId: '', leaveTypeId: '', year: currentYear, allocated: 15 }); setModalOpen(true); }

  const columns: Column<LeaveCredit>[] = [
    {
      key: 'employee', label: 'Employee', sortable: true, sortKey: (r) => r.employee.lastName,
      render: (_: any, row: LeaveCredit) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.employee.firstName[0]}{row.employee.lastName[0]}</div>
          <p className="font-medium truncate">{row.employee.lastName}, {row.employee.firstName}</p>
        </div>
      ),
    },
    { key: 'leaveType.name', label: 'Leave Type', render: (v: string) => v },
    { key: 'year', label: 'Year', render: (v: number) => v },
    { key: 'allocated', label: 'Allocated', render: (v: number) => Number(v).toFixed(1) },
    { key: 'used', label: 'Used', render: (v: number) => Number(v).toFixed(1) },
    { key: 'adjusted', label: 'Adjusted', render: (v: number) => Number(v) !== 0 ? Number(v).toFixed(1) : '-' },
    { key: 'balance', label: 'Balance', render: (v: number) => <span className={Number(v) <= 0 ? 'text-red-600 font-medium' : 'font-medium'}>{Number(v).toFixed(1)}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Leave Credits" description="View and manage employee leave credit balances">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">Allocate Credits</Button>
      </PageHeader>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Records" value={data.length} icon={<CalendarPlus className="h-5 w-5" />} />
        <StatCard title="Employees" value={new Set(data.map(d => d.employeeId)).size} icon={<CalendarPlus className="h-5 w-5" />} />
        <StatCard title="Year" value={filterYear} icon={<CalendarPlus className="h-5 w-5" />} />
      </div>
      <DataTable<LeaveCredit> columns={columns} data={data} total={data.length} page={1} limit={999}
        onPageChange={() => {}} isLoading={isLoading} emptyMessage="No leave credits found."
        emptyIcon={<CalendarPlus className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild><Button variant="outline" size="sm" className="relative"><Filter className="h-3.5 w-3.5 mr-1.5" /> Filters{activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</Button></PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50"><p className="text-sm font-semibold">Filters</p>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear</button>}</div>
              <div className="p-4 space-y-4">
                <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Employee</Label>
                  <Select value={filterEmployee || 'ALL'} onValueChange={(v) => setFilterEmployee(v === 'ALL' ? '' : v)}>
                    <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent><SelectItem value="ALL">All employees</SelectItem>{(employees.data ?? []).map(e => <SelectItem key={e.id} value={e.id}>{e.lastName}, {e.firstName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Year</Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        }
      />

      <Dialog open={modalOpen} onOpenChange={(open) => !open && setModalOpen(false)}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">Allocate Leave Credits</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">Assign leave credits to an employee.</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="lc-form" onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-5">
              <div className="space-y-1.5"><Label className="text-sm">Employee <span className="text-red-500">*</span></Label>
                <Controller control={control} name="employeeId" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}><SelectTrigger className={cn(errors.employeeId && 'border-red-300')}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(employees.data ?? []).map(e => <SelectItem key={e.id} value={e.id}>{e.lastName}, {e.firstName}</SelectItem>)}</SelectContent></Select>
                )} />
              </div>
              <div className="space-y-1.5"><Label className="text-sm">Leave Type <span className="text-red-500">*</span></Label>
                <Controller control={control} name="leaveTypeId" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}><SelectTrigger className={cn(errors.leaveTypeId && 'border-red-300')}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(leaveTypes.data ?? []).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">Year</Label><Input type="number" {...register('year')} /></div>
                <div className="space-y-1.5"><Label className="text-sm">Days to Allocate</Label><Input type="number" step="0.5" {...register('allocated')} /></div>
              </div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={() => setModalOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="lc-form" disabled={!isValid || createMutation.isPending} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Allocate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
