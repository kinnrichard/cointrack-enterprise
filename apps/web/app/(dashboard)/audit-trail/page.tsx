'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ScrollText, Filter, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface AuditLog {
  id: string; userId: string | null; action: string; entityType: string;
  entityId: string | null; ipAddress: string | null; createdAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
}

const PAGE_SIZE = 20;
const ACTION_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'CREATE', label: 'Create' },
  { id: 'UPDATE', label: 'Update' }, { id: 'DELETE', label: 'Delete' },
  { id: 'LOGIN', label: 'Login' },
] as const;

export default function AuditTrailPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterEntity, setFilterEntity] = useState('');

  const activeFilterCount = [filterEntity].filter(Boolean).length;
  function clearFilters() { setFilterEntity(''); setPage(1); }

  const { data: response, isLoading } = useQuery({
    queryKey: ['audit', page, actionFilter, filterEntity],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (actionFilter !== 'all') q.set('action', actionFilter);
      if (filterEntity) q.set('entityType', filterEntity);
      return (await api.get(`/audit?${q}`)).data;
    },
  });

  const logs = (response?.data ?? []) as AuditLog[];
  const total = response?.total ?? 0;

  const columns: Column<AuditLog>[] = [
    { key: 'createdAt', label: 'Time', sortable: true, render: (v: string) => format(new Date(v), 'MMM d, yyyy hh:mm a') },
    {
      key: 'user', label: 'User',
      render: (_: any, row: AuditLog) => row.user ? `${row.user.firstName} ${row.user.lastName}` : 'System',
    },
    { key: 'action', label: 'Action', render: (v: string) => <StatusBadge status={v} /> },
    { key: 'entityType', label: 'Entity', render: (v: string) => v },
    { key: 'entityId', label: 'Entity ID', className: 'max-w-[200px]', render: (v: string | null) => v ? <span className="text-xs font-mono truncate block">{v}</span> : '-' },
    { key: 'ipAddress', label: 'IP', render: (v: string | null) => v || '-' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Audit Trail" description="View system activity logs and changes" />
      <DataTable<AuditLog> columns={columns} data={logs} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} isLoading={isLoading} emptyMessage="No audit logs found."
        emptyIcon={<ScrollText className="h-12 w-12 text-muted-foreground/40 mb-3" />}
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
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Entity Type</Label>
                    <Select value={filterEntity || 'ALL'} onValueChange={(v) => { setFilterEntity(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All entities" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All entities</SelectItem>
                        <SelectItem value="Employee">Employee</SelectItem>
                        <SelectItem value="Attendance">Attendance</SelectItem>
                        <SelectItem value="Payroll">Payroll</SelectItem>
                        <SelectItem value="User">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-1.5">
              {ACTION_CHIPS.map(c => <button key={c.id} onClick={() => { setActionFilter(c.id); setPage(1); }} className={cn('shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors', actionFilter === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-accent')}>{c.label}</button>)}
            </div>
          </div>
        }
      />
    </div>
  );
}
