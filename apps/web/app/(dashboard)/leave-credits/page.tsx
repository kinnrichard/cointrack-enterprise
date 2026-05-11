'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Filter, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import api from '@/lib/api';

interface LeaveCredit {
  id: string; employeeId: string; leaveTypeId: string; year: number;
  allocated: number; used: number; adjusted: number; balance: number;
  employee: { id: string; firstName: string; lastName: string };
  leaveType: { id: string; name: string; code: string };
}

const currentYear = new Date().getFullYear();

export default function LeaveCreditsPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterYear, setFilterYear] = useState(String(currentYear));

  const activeFilterCount = [filterEmployee, filterYear !== String(currentYear) ? filterYear : ''].filter(Boolean).length;
  function clearFilters() { setFilterEmployee(''); setFilterYear(String(currentYear)); }

  const employees = useQuery({ queryKey: ['employees-lookup'], queryFn: async () => (await api.get('/employees?limit=999')).data.data as { id: string; firstName: string; lastName: string }[] });

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
      <PageHeader title="Leave Credits" description="View and manage employee leave credit balances" />
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
                  <Select value={filterEmployee || 'ALL'} onValueChange={(v) => setFilterEmployee(v === 'ALL' ? '' : v)}>
                    <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All employees" /></SelectTrigger>
                    <SelectContent><SelectItem value="ALL">All employees</SelectItem>{(employees.data ?? []).map(e => <SelectItem key={e.id} value={e.id}>{e.lastName}, {e.firstName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Year</Label>
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
    </div>
  );
}
