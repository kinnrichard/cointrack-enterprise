'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Filter, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import api from '@/lib/api';

interface PayrollRecord {
  id: string; employeeId: string; grossPay: number;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string | null };
}

function fmt(v: number | string) { return Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
const currentYear = new Date().getFullYear();

export default function ThirteenthMonthPage() {
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterYear, setFilterYear] = useState(String(currentYear));

  const activeFilterCount = [filterYear !== String(currentYear) ? filterYear : ''].filter(Boolean).length;
  function clearFilters() { setFilterYear(String(currentYear)); setPage(1); }

  // Fetch all payroll for the year to compute 13th month (gross / 12)
  const { data: response, isLoading } = useQuery({
    queryKey: ['13th-month', page, filterYear],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: '999' });
      q.set('startDate', `${filterYear}-01-01`);
      q.set('endDate', `${filterYear}-12-31`);
      return (await api.get(`/payroll?${q}`)).data;
    },
  });

  const records = (response?.data ?? []) as PayrollRecord[];

  // Group by employee and sum gross
  const employeeMap = new Map<string, { employee: PayrollRecord['employee']; totalGross: number }>();
  for (const r of records) {
    const existing = employeeMap.get(r.employeeId);
    if (existing) {
      existing.totalGross += Number(r.grossPay);
    } else {
      employeeMap.set(r.employeeId, { employee: r.employee, totalGross: Number(r.grossPay) });
    }
  }

  const data = Array.from(employeeMap.values()).map((e) => ({
    id: e.employee.id,
    employee: e.employee,
    totalGross: e.totalGross,
    thirteenthMonth: e.totalGross / 12,
  }));

  const total13th = data.reduce((s, d) => s + d.thirteenthMonth, 0);

  const columns: Column<typeof data[number]>[] = [
    {
      key: 'employee', label: 'Employee', sortable: true, sortKey: (r) => r.employee.lastName,
      render: (_: any, row: typeof data[number]) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.employee.firstName[0]}{row.employee.lastName[0]}</div>
          <div><p className="font-medium truncate">{row.employee.lastName}, {row.employee.firstName}</p>{row.employee.employeeNumber && <p className="text-xs text-muted-foreground">{row.employee.employeeNumber}</p>}</div>
        </div>
      ),
    },
    { key: 'totalGross', label: 'Total Basic Salary (Year)', sortable: true, render: (v: number) => `₱${fmt(v)}` },
    { key: 'thirteenthMonth', label: '13th Month Pay', sortable: true, render: (v: number) => <span className="font-semibold">₱{fmt(v)}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="13th Month Pay" description="Compute and view 13th month pay per employee" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Employees" value={data.length} icon={<Gift className="h-5 w-5" />} />
        <StatCard title="Year" value={filterYear} icon={<Gift className="h-5 w-5" />} />
        <StatCard title="Total 13th Month" value={`₱${fmt(total13th)}`} icon={<Gift className="h-5 w-5" />} />
      </div>
      <DataTable columns={columns} data={data} total={data.length} page={1} limit={999}
        onPageChange={() => {}} isLoading={isLoading} emptyMessage="No payroll data for this year."
        emptyIcon={<Gift className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="h-3.5 w-3.5 mr-1.5" /> Filters
                {activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50"><p className="text-sm font-semibold">Filters</p>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear</button>}</div>
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Year</Label>
                  <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); setPage(1); }}>
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
