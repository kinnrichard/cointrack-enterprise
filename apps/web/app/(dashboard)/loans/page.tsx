'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Landmark, Filter, X } from 'lucide-react';
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

interface Loan {
  id: string; employeeId: string; type: string; principal: number; totalAmount: number;
  monthlyAmortization: number; balance: number; status: string; startDate: string;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string | null };
}

const PAGE_SIZE = 10;
const STATUS_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'ACTIVE', label: 'Active' },
  { id: 'PAID', label: 'Paid' }, { id: 'CANCELLED', label: 'Cancelled' },
] as const;

function fmt(v: number | string) { return Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function LoansPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterType, setFilterType] = useState('');

  const activeFilterCount = [filterEmployee, filterType].filter(Boolean).length;
  function clearFilters() { setFilterEmployee(''); setFilterType(''); setPage(1); }

  const employees = useQuery({ queryKey: ['employees-lookup'], queryFn: async () => (await api.get('/employees?limit=999')).data.data as { id: string; firstName: string; lastName: string }[] });

  const { data: response, isLoading } = useQuery({
    queryKey: ['loans', page, statusFilter, filterEmployee, filterType],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (filterEmployee) q.set('employeeId', filterEmployee);
      if (filterType) q.set('type', filterType);
      return (await api.get(`/loans?${q}`)).data;
    },
  });

  const loans = (response?.data ?? []) as Loan[];
  const total = response?.total ?? 0;
  const totalBalance = loans.reduce((s, l) => s + Number(l.balance), 0);

  const columns: Column<Loan>[] = [
    {
      key: 'employee', label: 'Employee', sortable: true, sortKey: (r) => r.employee.lastName,
      render: (_: any, row: Loan) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.employee.firstName[0]}{row.employee.lastName[0]}</div>
          <div><p className="font-medium truncate">{row.employee.lastName}, {row.employee.firstName}</p>{row.employee.employeeNumber && <p className="text-xs text-muted-foreground">{row.employee.employeeNumber}</p>}</div>
        </div>
      ),
    },
    { key: 'type', label: 'Loan Type', render: (v: string) => <StatusBadge status={v} /> },
    { key: 'principal', label: 'Principal', render: (v: number) => `₱${fmt(v)}` },
    { key: 'monthlyAmortization', label: 'Monthly', render: (v: number) => `₱${fmt(v)}` },
    { key: 'balance', label: 'Balance', render: (v: number) => `₱${fmt(v)}` },
    { key: 'startDate', label: 'Start Date', sortable: true, render: (v: string) => format(new Date(v), 'MMM d, yyyy') },
    { key: 'status', label: 'Status', render: (v: string) => <StatusBadge status={v} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Loans" description="Manage employee loans and amortizations" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Loans" value={total} icon={<Landmark className="h-5 w-5" />} />
        <StatCard title="Active" value={loans.filter(l => l.status === 'ACTIVE').length} icon={<Landmark className="h-5 w-5" />} />
        <StatCard title="Total Balance" value={`₱${fmt(totalBalance)}`} icon={<Landmark className="h-5 w-5" />} />
      </div>
      <DataTable<Loan> columns={columns} data={loans} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} isLoading={isLoading} emptyMessage="No loans found."
        emptyIcon={<Landmark className="h-12 w-12 text-muted-foreground/40 mb-3" />}
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
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Loan Type</Label>
                    <Select value={filterType || 'ALL'} onValueChange={(v) => { setFilterType(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All types" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All types</SelectItem>
                        <SelectItem value="SSS_LOAN">SSS Loan</SelectItem>
                        <SelectItem value="SSS_CALAMITY">SSS Calamity</SelectItem>
                        <SelectItem value="PAGIBIG_LOAN">Pag-IBIG Loan</SelectItem>
                        <SelectItem value="PAGIBIG_CALAMITY">Pag-IBIG Calamity</SelectItem>
                        <SelectItem value="CASH_ADVANCE">Cash Advance</SelectItem>
                        <SelectItem value="COMPANY_LOAN">Company Loan</SelectItem>
                      </SelectContent>
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
    </div>
  );
}
