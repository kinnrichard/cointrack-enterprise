'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FileText, Filter, X } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import api from '@/lib/api';

interface PayrollRecord {
  id: string; employeeId: string; periodStart: string; periodEnd: string;
  basicPay: number; grossPay: number; totalDeductions: number; netPay: number;
  sssContribution: number; philhealthContribution: number; pagibigContribution: number; withholdingTax: number;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string | null };
}

const PAGE_SIZE = 50;
function fmt(v: number | string) { return Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function PayrollRegisterPage() {
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const activeFilterCount = [filterStart, filterEnd].filter(Boolean).length;
  function clearFilters() { setFilterStart(''); setFilterEnd(''); setPage(1); }

  const { data: response, isLoading } = useQuery({
    queryKey: ['payroll-register', page, filterStart, filterEnd],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), status: 'PAID' });
      if (filterStart) q.set('startDate', filterStart);
      if (filterEnd) q.set('endDate', filterEnd);
      return (await api.get(`/payroll?${q}`)).data;
    },
  });

  const records = (response?.data ?? []) as PayrollRecord[];
  const total = response?.total ?? 0;
  const totalGross = records.reduce((s, r) => s + Number(r.grossPay), 0);
  const totalDeductions = records.reduce((s, r) => s + Number(r.totalDeductions), 0);
  const totalNet = records.reduce((s, r) => s + Number(r.netPay), 0);

  const columns: Column<PayrollRecord>[] = [
    {
      key: 'employee', label: 'Employee', sortable: true, sortKey: (r) => r.employee.lastName,
      render: (_: any, row: PayrollRecord) => (
        <div>
          <p className="font-medium text-sm">{row.employee.lastName}, {row.employee.firstName}</p>
          {row.employee.employeeNumber && <p className="text-xs text-muted-foreground">{row.employee.employeeNumber}</p>}
        </div>
      ),
    },
    { key: 'periodStart', label: 'Period', render: (_: any, row: PayrollRecord) => `${format(new Date(row.periodStart), 'MMM d')} - ${format(new Date(row.periodEnd), 'MMM d')}` },
    { key: 'basicPay', label: 'Basic', render: (v: number) => fmt(v) },
    { key: 'grossPay', label: 'Gross', render: (v: number) => fmt(v) },
    { key: 'sssContribution', label: 'SSS', render: (v: number) => fmt(v) },
    { key: 'philhealthContribution', label: 'PhilHealth', render: (v: number) => fmt(v) },
    { key: 'pagibigContribution', label: 'Pag-IBIG', render: (v: number) => fmt(v) },
    { key: 'withholdingTax', label: 'Tax', render: (v: number) => fmt(v) },
    { key: 'totalDeductions', label: 'Deductions', render: (v: number) => fmt(v) },
    { key: 'netPay', label: 'Net Pay', render: (v: number) => <span className="font-semibold">{fmt(v)}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payroll Register" description="Summary of all payroll transactions" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Records" value={total} icon={<FileText className="h-5 w-5" />} />
        <StatCard title="Total Gross" value={`₱${fmt(totalGross)}`} icon={<FileText className="h-5 w-5" />} />
        <StatCard title="Total Deductions" value={`₱${fmt(totalDeductions)}`} icon={<FileText className="h-5 w-5" />} />
        <StatCard title="Total Net" value={`₱${fmt(totalNet)}`} icon={<FileText className="h-5 w-5" />} />
      </div>
      <DataTable<PayrollRecord> columns={columns} data={records} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} isLoading={isLoading} emptyMessage="No payroll register data."
        emptyIcon={<FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />}
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
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Period Range</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <DatePicker value={filterStart ? new Date(filterStart) : undefined} onChange={(d) => { setFilterStart(d ? format(d, 'yyyy-MM-dd') : ''); setPage(1); }} placeholder="From" className="h-9 text-xs" />
                    <DatePicker value={filterEnd ? new Date(filterEnd) : undefined} onChange={(d) => { setFilterEnd(d ? format(d, 'yyyy-MM-dd') : ''); setPage(1); }} placeholder="To" className="h-9 text-xs" />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        }
      />
    </div>
  );
}
