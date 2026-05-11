'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Filter, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Deduction {
  id: string; employeeId: string; type: string; name: string | null; amount: number;
  amountPerCutoff: number; balance: number; isActive: boolean;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string | null };
}

const PAGE_SIZE = 10;
const TYPE_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'SSS_LOAN', label: 'SSS Loan' }, { id: 'PAGIBIG_LOAN', label: 'Pag-IBIG' },
  { id: 'CASH_ADVANCE', label: 'Cash Advance' }, { id: 'COMPANY_LOAN', label: 'Company' },
] as const;

function fmt(v: number | string) { return Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function DeductionsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  const activeFilterCount = [filterEmployee, filterActive !== 'all' ? filterActive : ''].filter(Boolean).length;
  function clearFilters() { setFilterEmployee(''); setFilterActive('all'); setPage(1); }

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
    { key: 'amount', label: 'Total Amount', render: (v: number) => `₱${fmt(v)}` },
    { key: 'amountPerCutoff', label: 'Per Cutoff', render: (v: number) => `₱${fmt(v)}` },
    { key: 'balance', label: 'Balance', render: (v: number) => `₱${fmt(v)}` },
    { key: 'isActive', label: 'Status', render: (v: boolean) => <StatusBadge status={v ? 'ACTIVE' : 'COMPLETED'} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Deductions" description="Manage employee deductions and loan payments" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Deductions" value={total} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard title="Active" value={deductions.filter(d => d.isActive).length} icon={<CreditCard className="h-5 w-5" />} />
        <StatCard title="Total Balance" value={`₱${fmt(totalBalance)}`} icon={<CreditCard className="h-5 w-5" />} />
      </div>
      <DataTable<Deduction> columns={columns} data={deductions} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} isLoading={isLoading} emptyMessage="No deductions found."
        emptyIcon={<CreditCard className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-3 flex-wrap">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="h-3.5 w-3.5 mr-1.5" /> Filters
                  {activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
                </Button>
              </PopoverTrigger>
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
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Status</Label>
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
    </div>
  );
}
