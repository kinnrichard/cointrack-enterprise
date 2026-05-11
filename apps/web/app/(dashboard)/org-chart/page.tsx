'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Building2, MapPin, Filter, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import api from '@/lib/api';

interface Employee {
  id: string; firstName: string; lastName: string; employeeNumber: string | null;
  employmentStatus: string; email: string | null;
  department: { id: string; name: string } | null;
  position: { id: string; name: string } | null;
  site: { id: string; name: string } | null;
}

interface LookupItem { id: string; name: string }

export default function OrgChartPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [filterSite, setFilterSite] = useState('');

  const activeFilterCount = [filterDept, filterSite].filter(Boolean).length;
  function clearFilters() { setFilterDept(''); setFilterSite(''); }

  const departments = useQuery({ queryKey: ['departments-lookup'], queryFn: async () => { const { data } = await api.get('/departments?limit=999'); return (data.data ?? data) as LookupItem[]; } });
  const sites = useQuery({ queryKey: ['sites-lookup'], queryFn: async () => { const { data } = await api.get('/sites?limit=999'); return (data.data ?? data) as LookupItem[]; } });

  const { data: response, isLoading } = useQuery({
    queryKey: ['org-chart-employees', filterDept, filterSite],
    queryFn: async () => {
      const q = new URLSearchParams({ limit: '999', employmentStatus: 'ACTIVE' });
      if (filterDept) q.set('departmentId', filterDept);
      if (filterSite) q.set('siteId', filterSite);
      return (await api.get(`/employees?${q}`)).data;
    },
  });

  const employees = (response?.data ?? []) as Employee[];
  const total = employees.length;

  // Group by department
  const grouped = new Map<string, { dept: string; employees: Employee[] }>();
  const unassigned: Employee[] = [];

  for (const emp of employees) {
    if (emp.department) {
      const key = emp.department.id;
      if (!grouped.has(key)) grouped.set(key, { dept: emp.department.name, employees: [] });
      grouped.get(key)!.employees.push(emp);
    } else {
      unassigned.push(emp);
    }
  }

  const deptGroups = Array.from(grouped.values()).sort((a, b) => a.dept.localeCompare(b.dept));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Organizational Chart" description="Visual employee hierarchy by department">
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <Filter className="h-3.5 w-3.5 mr-1.5" /> Filters
              {activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50"><p className="text-sm font-semibold">Filters</p>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear</button>}</div>
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Department</Label>
                <Select value={filterDept || 'ALL'} onValueChange={(v) => setFilterDept(v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All departments" /></SelectTrigger>
                  <SelectContent><SelectItem value="ALL">All departments</SelectItem>{(departments.data ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Site</Label>
                <Select value={filterSite || 'ALL'} onValueChange={(v) => setFilterSite(v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All sites" /></SelectTrigger>
                  <SelectContent><SelectItem value="ALL">All sites</SelectItem>{(sites.data ?? []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Active" value={total} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Departments" value={deptGroups.length} icon={<Building2 className="h-5 w-5" />} />
        <StatCard title="Unassigned" value={unassigned.length} icon={<Users className="h-5 w-5" />} />
      </div>

      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {deptGroups.map((group) => (
            <Card key={group.dept} className="overflow-hidden">
              <div className="px-5 py-3 bg-muted/50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">{group.dept}</h3>
                </div>
                <span className="text-xs text-muted-foreground">{group.employees.length} employee{group.employees.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {group.employees.map((emp) => (
                  <div key={emp.id} className="flex flex-col items-center text-center p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-sm font-bold mb-2">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <p className="text-sm font-medium leading-tight">{emp.firstName} {emp.lastName}</p>
                    {emp.position && <p className="text-[11px] text-muted-foreground mt-0.5">{emp.position.name}</p>}
                    {emp.site && (
                      <div className="flex items-center gap-0.5 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{emp.site.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {unassigned.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-5 py-3 bg-muted/50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-muted-foreground">Unassigned</h3>
                </div>
                <span className="text-xs text-muted-foreground">{unassigned.length} employee{unassigned.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {unassigned.map((emp) => (
                  <div key={emp.id} className="flex flex-col items-center text-center p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-400 text-white text-sm font-bold mb-2">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <p className="text-sm font-medium leading-tight">{emp.firstName} {emp.lastName}</p>
                    {emp.position && <p className="text-[11px] text-muted-foreground mt-0.5">{emp.position.name}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {deptGroups.length === 0 && unassigned.length === 0 && (
            <div className="flex h-[300px] flex-col items-center justify-center rounded-lg border bg-card gap-3">
              <Users className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No active employees found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
