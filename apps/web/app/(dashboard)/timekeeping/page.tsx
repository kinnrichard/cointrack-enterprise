'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, Filter, X } from 'lucide-react';
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

interface Timekeeping {
  id: string; name: string | null; startDate: string; endDate: string;
  payDate: string | null; cutoffType: string; status: string;
  _count: { data: number };
}

const PAGE_SIZE = 10;
const STATUS_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'DRAFT', label: 'Draft' },
  { id: 'PROCESSING', label: 'Processing' }, { id: 'COMPLETED', label: 'Completed' },
] as const;

export default function TimekeepingPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCutoff, setFilterCutoff] = useState('');

  const activeFilterCount = [filterCutoff].filter(Boolean).length;
  function clearFilters() { setFilterCutoff(''); setPage(1); }

  const { data: response, isLoading } = useQuery({
    queryKey: ['timekeeping', page, statusFilter, filterCutoff],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (filterCutoff) q.set('cutoffType', filterCutoff);
      return (await api.get(`/timekeeping?${q}`)).data;
    },
  });

  const records = (response?.data ?? []) as Timekeeping[];
  const total = response?.total ?? 0;

  const columns: Column<Timekeeping>[] = [
    {
      key: 'name', label: 'Period', sortable: true,
      render: (_: any, row: Timekeeping) => (
        <div>
          <p className="font-medium">{row.name || `${format(new Date(row.startDate), 'MMM d')} - ${format(new Date(row.endDate), 'MMM d, yyyy')}`}</p>
          <p className="text-xs text-muted-foreground">{row.cutoffType.replace('_', ' ')}</p>
        </div>
      ),
    },
    { key: 'startDate', label: 'Start', sortable: true, render: (v: string) => format(new Date(v), 'MMM d, yyyy') },
    { key: 'endDate', label: 'End', render: (v: string) => format(new Date(v), 'MMM d, yyyy') },
    { key: 'payDate', label: 'Pay Date', render: (v: string | null) => v ? format(new Date(v), 'MMM d, yyyy') : '-' },
    { key: '_count.data', label: 'Employees', render: (v: number) => v },
    { key: 'status', label: 'Status', render: (v: string) => <StatusBadge status={v} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Timekeeping" description="Process timekeeping cutoff periods" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Periods" value={total} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Draft" value={records.filter(r => r.status === 'DRAFT').length} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Processing" value={records.filter(r => r.status === 'PROCESSING').length} icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Completed" value={records.filter(r => r.status === 'COMPLETED').length} icon={<Clock className="h-5 w-5" />} />
      </div>
      <DataTable<Timekeeping> columns={columns} data={records} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} isLoading={isLoading} emptyMessage="No timekeeping periods found."
        emptyIcon={<Clock className="h-12 w-12 text-muted-foreground/40 mb-3" />}
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
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50"><p className="text-sm font-semibold">Filters</p>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear</button>}</div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Cutoff Type</Label>
                    <Select value={filterCutoff || 'ALL'} onValueChange={(v) => { setFilterCutoff(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All types" /></SelectTrigger>
                      <SelectContent><SelectItem value="ALL">All types</SelectItem><SelectItem value="SEMI_MONTHLY">Semi-Monthly</SelectItem><SelectItem value="MONTHLY">Monthly</SelectItem><SelectItem value="WEEKLY">Weekly</SelectItem></SelectContent>
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
