'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Banknote, Filter, X, Loader2, Play } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

interface PayrollRecord {
  id: string; employeeId: string; periodStart: string; periodEnd: string;
  payDate: string | null; cutoffType: string; status: string;
  basicPay: number; grossPay: number; totalDeductions: number; netPay: number;
  employee: { id: string; firstName: string; lastName: string; employeeNumber: string | null };
}

const PAGE_SIZE = 10;
const STATUS_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'DRAFT', label: 'Draft' },
  { id: 'PENDING', label: 'Pending' }, { id: 'APPROVED', label: 'Approved' }, { id: 'PAID', label: 'Paid' },
] as const;

function fmt(v: number | string) { return Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

interface TimekeepingRecord {
  id: string; name: string | null; startDate: string; endDate: string; status: string;
  _count: { data: number };
}

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedTK, setSelectedTK] = useState('');

  const tkQuery = useQuery({
    queryKey: ['timekeeping-completed'],
    queryFn: async () => (await api.get('/timekeeping?status=COMPLETED&limit=20')).data.data as TimekeepingRecord[],
  });

  const generateMutation = useMutation({
    mutationFn: (tkId: string) => api.post(`/payroll/process/${tkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      setGenerateOpen(false);
      toast({ title: 'Payroll generated', description: 'Payroll records have been created for all employees.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message || 'Failed to generate payroll.', variant: 'destructive' }),
  });

  const activeFilterCount = [filterEmployee, filterStartDate, filterEndDate].filter(Boolean).length;
  function clearFilters() { setFilterEmployee(''); setFilterStartDate(''); setFilterEndDate(''); setPage(1); }

  const employees = useQuery({ queryKey: ['employees-lookup'], queryFn: async () => (await api.get('/employees?limit=999')).data.data as { id: string; firstName: string; lastName: string }[] });

  const { data: response, isLoading } = useQuery({
    queryKey: ['payroll', page, statusFilter, filterEmployee, filterStartDate, filterEndDate],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (filterEmployee) q.set('employeeId', filterEmployee);
      if (filterStartDate) q.set('startDate', filterStartDate);
      if (filterEndDate) q.set('endDate', filterEndDate);
      return (await api.get(`/payroll?${q}`)).data;
    },
  });

  const records = (response?.data ?? []) as PayrollRecord[];
  const total = response?.total ?? 0;
  const totalNet = records.reduce((s, r) => s + Number(r.netPay), 0);
  const totalGross = records.reduce((s, r) => s + Number(r.grossPay), 0);

  const columns: Column<PayrollRecord>[] = [
    {
      key: 'employee', label: 'Employee', sortable: true, sortKey: (r) => r.employee.lastName,
      render: (_: any, row: PayrollRecord) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.employee.firstName[0]}{row.employee.lastName[0]}</div>
          <div><p className="font-medium truncate">{row.employee.lastName}, {row.employee.firstName}</p>{row.employee.employeeNumber && <p className="text-xs text-muted-foreground">{row.employee.employeeNumber}</p>}</div>
        </div>
      ),
    },
    {
      key: 'periodStart', label: 'Period', sortable: true,
      render: (_: any, row: PayrollRecord) => `${format(new Date(row.periodStart), 'MMM d')} - ${format(new Date(row.periodEnd), 'MMM d, yyyy')}`,
    },
    { key: 'basicPay', label: 'Basic Pay', render: (v: number) => `₱${fmt(v)}` },
    { key: 'grossPay', label: 'Gross Pay', render: (v: number) => `₱${fmt(v)}` },
    { key: 'totalDeductions', label: 'Deductions', render: (v: number) => `₱${fmt(v)}` },
    { key: 'netPay', label: 'Net Pay', render: (v: number) => <span className="font-semibold">₱{fmt(v)}</span> },
    { key: 'status', label: 'Status', render: (v: string) => <StatusBadge status={v} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payroll" description="Process and manage employee payroll">
        <Button onClick={() => setGenerateOpen(true)} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">
          <Play className="mr-2 h-4 w-4" /> Generate Payroll
        </Button>
      </PageHeader>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Records" value={total} icon={<Banknote className="h-5 w-5" />} />
        <StatCard title="Total Gross" value={`₱${fmt(totalGross)}`} icon={<Banknote className="h-5 w-5" />} />
        <StatCard title="Total Net" value={`₱${fmt(totalNet)}`} icon={<Banknote className="h-5 w-5" />} />
        <StatCard title="Pending" value={records.filter(r => r.status === 'PENDING').length} icon={<Banknote className="h-5 w-5" />} />
      </div>
      <DataTable<PayrollRecord> columns={columns} data={records} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} isLoading={isLoading} emptyMessage="No payroll records found."
        emptyIcon={<Banknote className="h-12 w-12 text-muted-foreground/40 mb-3" />}
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
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50"><p className="text-sm font-semibold">Filters</p>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear all</button>}</div>
                <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Employee</Label>
                    <Select value={filterEmployee || 'ALL'} onValueChange={(v) => { setFilterEmployee(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All employees" /></SelectTrigger>
                      <SelectContent><SelectItem value="ALL">All employees</SelectItem>{(employees.data ?? []).map(e => <SelectItem key={e.id} value={e.id}>{e.lastName}, {e.firstName}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Period Range</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <DatePicker value={filterStartDate ? new Date(filterStartDate) : undefined} onChange={(d) => { setFilterStartDate(d ? format(d, 'yyyy-MM-dd') : ''); setPage(1); }} placeholder="From" className="h-9 text-xs" />
                      <DatePicker value={filterEndDate ? new Date(filterEndDate) : undefined} onChange={(d) => { setFilterEndDate(d ? format(d, 'yyyy-MM-dd') : ''); setPage(1); }} placeholder="To" className="h-9 text-xs" />
                    </div>
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

      {/* Generate Payroll Dialog */}
      <Dialog open={generateOpen} onOpenChange={(open) => !open && setGenerateOpen(false)}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">Generate Payroll</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">Select a completed timekeeping period to generate payroll from.</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {(tkQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No completed timekeeping periods found. Process a timekeeping period first.</p>
            ) : (
              <div className="space-y-2">
                {(tkQuery.data ?? []).map((tk) => (
                  <button key={tk.id} type="button" onClick={() => setSelectedTK(tk.id)}
                    className={cn('w-full text-left p-3 rounded-lg border transition-colors', selectedTK === tk.id ? 'border-primary bg-primary/5' : 'hover:bg-accent')}>
                    <p className="text-sm font-medium">{tk.name || `${format(new Date(tk.startDate), 'MMM d')} - ${format(new Date(tk.endDate), 'MMM d, yyyy')}`}</p>
                    <p className="text-xs text-muted-foreground">{tk._count.data} employees</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={() => setGenerateOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button onClick={() => selectedTK && generateMutation.mutate(selectedTK)} disabled={!selectedTK || generateMutation.isPending}
              className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
