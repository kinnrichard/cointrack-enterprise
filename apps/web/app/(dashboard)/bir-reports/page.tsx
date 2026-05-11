'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Filter, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import api from '@/lib/api';

interface PayrollRecord {
  id: string; employeeId: string; periodStart: string; periodEnd: string;
  grossPay: number; withholdingTax: number;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string | null };
}

function fmt(v: number | string) { return Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
const currentYear = new Date().getFullYear();

export default function BIRReportsPage() {
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterYear, setFilterYear] = useState(String(currentYear));

  const activeFilterCount = [filterYear !== String(currentYear) ? filterYear : ''].filter(Boolean).length;
  function clearFilters() { setFilterYear(String(currentYear)); setPage(1); }

  const { data: response, isLoading } = useQuery({
    queryKey: ['bir-reports', page, filterYear],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: '50' });
      q.set('startDate', `${filterYear}-01-01`);
      q.set('endDate', `${filterYear}-12-31`);
      return (await api.get(`/payroll?${q}`)).data;
    },
  });

  const records = (response?.data ?? []) as PayrollRecord[];
  const total = response?.total ?? 0;
  const totalGross = records.reduce((s, r) => s + Number(r.grossPay), 0);
  const totalTax = records.reduce((s, r) => s + Number(r.withholdingTax), 0);

  const columns: Column<PayrollRecord>[] = [
    {
      key: 'employee', label: 'Employee', sortable: true, sortKey: (r) => r.employee.lastName,
      render: (_: any, row: PayrollRecord) => (
        <div><p className="font-medium text-sm">{row.employee.lastName}, {row.employee.firstName}</p>{row.employee.employeeNumber && <p className="text-xs text-muted-foreground">{row.employee.employeeNumber}</p>}</div>
      ),
    },
    { key: 'grossPay', label: 'Gross Compensation', render: (v: number) => `₱${fmt(v)}` },
    { key: 'withholdingTax', label: 'Tax Withheld', render: (v: number) => `₱${fmt(v)}` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="BIR Reports" description="Bureau of Internal Revenue compliance — Alphalist & BIR Form 2316" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Records" value={total} icon={<Receipt className="h-5 w-5" />} />
        <StatCard title="Total Compensation" value={`₱${fmt(totalGross)}`} icon={<Receipt className="h-5 w-5" />} />
        <StatCard title="Total Tax Withheld" value={`₱${fmt(totalTax)}`} icon={<Receipt className="h-5 w-5" />} />
      </div>
      <DataTable<PayrollRecord> columns={columns} data={records} total={total} page={page} limit={50}
        onPageChange={setPage} isLoading={isLoading} emptyMessage="No BIR data for this year."
        emptyIcon={<Receipt className="h-12 w-12 text-muted-foreground/40 mb-3" />}
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
