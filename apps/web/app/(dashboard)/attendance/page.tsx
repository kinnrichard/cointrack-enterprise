'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarCheck, Users, Clock, Filter, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  status: string;
  workedHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  overtimeHours: number;
  nightDiffHours: number;
  isRestDay: boolean;
  isSpecialHoliday: boolean;
  isRegularHoliday: boolean;
  isDoubleHoliday: boolean;
  holidayName: string | null;
  remarks: string | null;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string | null };
}

const PAGE_SIZE = 50;

const STATUS_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'PRESENT', label: 'Present' },
  { id: 'ABSENT', label: 'Absent' },
  { id: 'LATE', label: 'Late' },
  { id: 'ON_LEAVE', label: 'On Leave' },
  { id: 'REST_DAY', label: 'Rest Day' },
] as const;

function fmtTime(val: string | null) {
  if (!val) return '-';
  try { return format(new Date(val), 'hh:mm a'); } catch { return val; }
}

function fmtHrs(val: number | string) {
  const n = Number(val);
  return n > 0 ? n.toFixed(2) : '-';
}

async function fetchEmployees() {
  const { data } = await api.get('/employees?limit=999');
  return (data.data ?? data) as { id: string; firstName: string; lastName: string; employeeNumber: string | null }[];
}

export default function AttendancePage() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(today);
  const [filterEndDate, setFilterEndDate] = useState(today);

  const activeFilterCount = [filterEmployee, filterStartDate !== today ? filterStartDate : '', filterEndDate !== today ? filterEndDate : ''].filter(Boolean).length;

  function clearFilters() { setFilterEmployee(''); setFilterStartDate(today); setFilterEndDate(today); setPage(1); }

  const employees = useQuery({ queryKey: ['employees-lookup'], queryFn: fetchEmployees });

  const { data: response, isLoading } = useQuery({
    queryKey: ['attendance', page, statusFilter, filterEmployee, filterStartDate, filterEndDate],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (filterEmployee) q.set('employeeId', filterEmployee);
      if (filterStartDate) q.set('startDate', filterStartDate);
      if (filterEndDate) q.set('endDate', filterEndDate);
      return (await api.get(`/attendance?${q}`)).data;
    },
  });

  const records = (response?.data ?? []) as AttendanceRecord[];
  const total = response?.total ?? 0;
  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;
  const lateCount = records.filter((r) => r.status === 'LATE').length;

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'employee', label: 'Employee', sortable: true,
      sortKey: (row) => row.employee.lastName,
      render: (_: any, row: AttendanceRecord) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">
            {(row.employee.firstName[0] || '') + (row.employee.lastName[0] || '')}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{row.employee.lastName}, {row.employee.firstName}</p>
            {row.employee.employeeNumber && <p className="text-xs text-muted-foreground">{row.employee.employeeNumber}</p>}
          </div>
        </div>
      ),
    },
    { key: 'date', label: 'Date', sortable: true, render: (val: string) => format(new Date(val), 'MMM d, yyyy (EEE)') },
    { key: 'timeIn', label: 'Time In', render: (val: string | null) => fmtTime(val) },
    { key: 'timeOut', label: 'Time Out', render: (val: string | null) => fmtTime(val) },
    { key: 'workedHours', label: 'Hours', render: (val: number) => fmtHrs(val) },
    { key: 'lateMinutes', label: 'Late (min)', render: (val: number) => Number(val) > 0 ? <span className="text-amber-600">{Number(val).toFixed(0)}</span> : '-' },
    { key: 'status', label: 'Status', render: (val: string) => <StatusBadge status={val} /> },
    {
      key: 'isRestDay', label: 'Day Type',
      render: (_: any, row: AttendanceRecord) => {
        if (row.isDoubleHoliday) return <StatusBadge status="DOUBLE HOLIDAY" variant="destructive" />;
        if (row.isRegularHoliday) return <StatusBadge status="LEGAL HOLIDAY" variant="destructive" />;
        if (row.isSpecialHoliday) return <StatusBadge status="SPECIAL HOLIDAY" variant="warning" />;
        if (row.isRestDay) return <StatusBadge status="REST DAY" variant="secondary" />;
        return <span className="text-sm text-muted-foreground">Regular</span>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Attendance" description="View and manage employee attendance records" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Records" value={total} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard title="Present" value={presentCount} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Absent" value={absentCount} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Late" value={lateCount} icon={<Clock className="h-5 w-5" />} />
      </div>

      <DataTable<AttendanceRecord>
        columns={columns} data={records} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} isLoading={isLoading}
        emptyMessage="No attendance records found." emptyIcon={<CalendarCheck className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-3 flex-wrap">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="h-3.5 w-3.5 mr-1.5" /> Filters
                  {activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0" align="start">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                  <p className="text-sm font-semibold">Filters</p>
                  {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear all</button>}
                </div>
                <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Employee</Label>
                    <Select value={filterEmployee || 'ALL'} onValueChange={(v) => { setFilterEmployee(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All employees" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All employees</SelectItem>
                        {(employees.data ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.lastName}, {e.firstName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Date Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }} className="h-9 rounded-lg text-xs" />
                      <Input type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }} className="h-9 rounded-lg text-xs" />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-1.5">
              {STATUS_CHIPS.map((chip) => (
                <button key={chip.id} onClick={() => { setStatusFilter(chip.id); setPage(1); }}
                  className={cn('shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors', statusFilter === chip.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-accent')}
                >{chip.label}</button>
              ))}
            </div>
          </div>
        }
      />
    </div>
  );
}
