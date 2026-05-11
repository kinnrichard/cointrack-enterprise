'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { UserCog, Filter, X } from 'lucide-react';
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

interface User {
  id: string; email: string; firstName: string; lastName: string; role: string;
  phone: string | null; isActive: boolean; lastLogin: string | null; createdAt: string;
}

const PAGE_SIZE = 10;
const STATUS_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'active', label: 'Active' }, { id: 'inactive', label: 'Inactive' },
] as const;

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRole, setFilterRole] = useState('');

  const activeFilterCount = [filterRole].filter(Boolean).length;
  function clearFilters() { setFilterRole(''); setPage(1); }

  const { data: response, isLoading } = useQuery({
    queryKey: ['users', page, search, statusFilter, filterRole],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) q.set('search', search);
      if (filterRole) q.set('role', filterRole);
      if (statusFilter === 'active') q.set('isActive', 'true');
      if (statusFilter === 'inactive') q.set('isActive', 'false');
      return (await api.get(`/users?${q}`)).data;
    },
  });

  const users = (response?.data ?? []) as User[];
  const total = response?.total ?? 0;
  const activeCount = users.filter(u => u.isActive).length;

  const columns: Column<User>[] = [
    {
      key: 'lastName', label: 'User', sortable: true,
      render: (_: any, row: User) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.firstName[0]}{row.lastName[0]}</div>
          <div><p className="font-medium truncate">{row.lastName}, {row.firstName}</p><p className="text-xs text-muted-foreground">{row.email}</p></div>
        </div>
      ),
    },
    { key: 'role', label: 'Role', render: (v: string) => <StatusBadge status={v} /> },
    { key: 'phone', label: 'Phone', render: (v: string | null) => v || '-' },
    { key: 'lastLogin', label: 'Last Login', render: (v: string | null) => v ? format(new Date(v), 'MMM d, yyyy hh:mm a') : 'Never' },
    { key: 'isActive', label: 'Status', render: (v: boolean) => <StatusBadge status={v ? 'ACTIVE' : 'INACTIVE'} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Users" description="Manage system users and access" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Users" value={total} icon={<UserCog className="h-5 w-5" />} />
        <StatCard title="Active" value={activeCount} icon={<UserCog className="h-5 w-5" />} />
        <StatCard title="Inactive" value={total - activeCount} icon={<UserCog className="h-5 w-5" />} />
      </div>
      <DataTable<User> columns={columns} data={users} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search users..." isLoading={isLoading} emptyMessage="No users found."
        emptyIcon={<UserCog className="h-12 w-12 text-muted-foreground/40 mb-3" />}
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
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Role</Label>
                    <Select value={filterRole || 'ALL'} onValueChange={(v) => { setFilterRole(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All roles" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All roles</SelectItem>
                        <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="PAYROLL">Payroll</SelectItem>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
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
