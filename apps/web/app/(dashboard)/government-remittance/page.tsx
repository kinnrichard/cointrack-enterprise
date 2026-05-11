'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FileBarChart, Filter, X } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface PayrollRecord {
  id: string; employeeId: string; periodStart: string; periodEnd: string;
  sssContribution: number; philhealthContribution: number; pagibigContribution: number;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string | null };
}

function fmt(v: number | string) { return Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const CONTRIB_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'sss', label: 'SSS' },
  { id: 'philhealth', label: 'PhilHealth' }, { id: 'pagibig', label: 'Pag-IBIG' },
] as const;

export default function GovernmentRemittancePage() {
  const [page, setPage] = useState(1);
  const [contribFilter, setContribFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const activeFilterCount = [filterStart, filterEnd].filter(Boolean).length;
  function clearFilters() { setFilterStart(''); setFilterEnd(''); setPage(1); }

  const { data: response, isLoading } = useQuery({
    queryKey: ['gov-remittance', page, filterStart, filterEnd],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterStart) q.set('startDate', filterStart);
      if (filterEnd) q.set('endDate', filterEnd);
      return (await api.get(`/payroll?${q}`)).data;
    },
  });

  const records = (response?.data ?? []) as PayrollRecord[];
  const total = response?.total ?? 0;
  const totalSSS = records.reduce((s, r) => s + Number(r.sssContribution), 0);
  const totalPH = records.reduce((s, r) => s + Number(r.philhealthContribution), 0);
  const totalPI = records.reduce((s, r) => s + Number(r.pagibigContribution), 0);

  const columns: Column<PayrollRecord>[] = [
    {
      key: 'employee', label: 'Employee', sortable: true, sortKey: (r) => r.employee.lastName,
      render: (_: any, row: PayrollRecord) => (
        <div><p className="font-medium text-sm">{row.employee.lastName}, {row.employee.firstName}</p>{row.employee.employeeNumber && <p className="text-xs text-muted-foreground">{row.employee.employeeNumber}</p>}</div>
      ),
    },
    ...(contribFilter === 'all' || contribFilter === 'sss' ? [{ key: 'sssContribution' as const, label: 'SSS', render: (v: number) => `₱${fmt(v)}` }] : []),
    ...(contribFilter === 'all' || contribFilter === 'philhealth' ? [{ key: 'philhealthContribution' as const, label: 'PhilHealth', render: (v: number) => `₱${fmt(v)}` }] : []),
    ...(contribFilter === 'all' || contribFilter === 'pagibig' ? [{ key: 'pagibigContribution' as const, label: 'Pag-IBIG', render: (v: number) => `₱${fmt(v)}` }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Government Remittance" description="SSS, PhilHealth, and Pag-IBIG contribution reports" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Records" value={total} icon={<FileBarChart className="h-5 w-5" />} />
        <StatCard title="Total SSS" value={`₱${fmt(totalSSS)}`} icon={<FileBarChart className="h-5 w-5" />} />
        <StatCard title="Total PhilHealth" value={`₱${fmt(totalPH)}`} icon={<FileBarChart className="h-5 w-5" />} />
        <StatCard title="Total Pag-IBIG" value={`₱${fmt(totalPI)}`} icon={<FileBarChart className="h-5 w-5" />} />
      </div>
      <DataTable<PayrollRecord> columns={columns} data={records} total={total} page={page} limit={50}
        onPageChange={setPage} isLoading={isLoading} emptyMessage="No remittance data."
        emptyIcon={<FileBarChart className="h-12 w-12 text-muted-foreground/40 mb-3" />}
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
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Period</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <DatePicker value={filterStart ? new Date(filterStart) : undefined} onChange={(d) => { setFilterStart(d ? format(d, 'yyyy-MM-dd') : ''); setPage(1); }} placeholder="From" className="h-9 text-xs" />
                      <DatePicker value={filterEnd ? new Date(filterEnd) : undefined} onChange={(d) => { setFilterEnd(d ? format(d, 'yyyy-MM-dd') : ''); setPage(1); }} placeholder="To" className="h-9 text-xs" />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-1.5">
              {CONTRIB_CHIPS.map(c => <button key={c.id} onClick={() => setContribFilter(c.id)} className={cn('shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors', contribFilter === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-accent')}>{c.label}</button>)}
            </div>
          </div>
        }
      />
    </div>
  );
}
