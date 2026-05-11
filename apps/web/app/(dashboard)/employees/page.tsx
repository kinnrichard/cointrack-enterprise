'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Users, Pencil, Trash2, UserCheck, UserMinus, UserX, Loader2, Filter, X,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  gender: string | null;
  birthDate: string | null;
  civilStatus: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  departmentId: string | null;
  positionId: string | null;
  siteId: string | null;
  scheduleId: string | null;
  rateId: string | null;
  employmentType: string;
  employmentStatus: string;
  dateHired: string | null;
  dateRegularized: string | null;
  dateSeparated: string | null;
  basicSalary: number;
  dailyRate: number;
  hourlyRate: number;
  payType: string;
  payFrequency: string;
  riceAllowance: number;
  clothingAllowance: number;
  laundryAllowance: number;
  otherAllowance: number;
  sssNumber: string | null;
  philhealthNumber: string | null;
  pagibigNumber: string | null;
  tinNumber: string | null;
  sssExempt: boolean;
  philhealthExempt: boolean;
  pagibigExempt: boolean;
  taxExempt: boolean;
  remarks: string | null;
  department: { id: string; name: string } | null;
  position: { id: string; name: string } | null;
  site: { id: string; name: string } | null;
  schedule: { id: string; name: string } | null;
  rate: { id: string; name: string } | null;
}

interface LookupItem { id: string; name: string }

// ─── Schema ─────────────────────────────────────────────────────────────────

const employeeSchema = z.object({
  employeeNumber: z.string().optional().or(z.literal('')),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional().or(z.literal('')),
  lastName: z.string().min(1, 'Last name is required'),
  suffix: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  civilStatus: z.string().optional().or(z.literal('')),
  nationality: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  province: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  emergencyContact: z.string().optional().or(z.literal('')),
  emergencyPhone: z.string().optional().or(z.literal('')),
  departmentId: z.string().optional().or(z.literal('')),
  positionId: z.string().optional().or(z.literal('')),
  siteId: z.string().optional().or(z.literal('')),
  scheduleId: z.string().optional().or(z.literal('')),
  rateId: z.string().optional().or(z.literal('')),
  employmentType: z.string().default('REGULAR'),
  employmentStatus: z.string().default('ACTIVE'),
  dateHired: z.string().optional().or(z.literal('')),
  dateRegularized: z.string().optional().or(z.literal('')),
  basicSalary: z.coerce.number().min(0).default(0),
  dailyRate: z.coerce.number().min(0).default(0),
  hourlyRate: z.coerce.number().min(0).default(0),
  payType: z.string().default('DAILY'),
  payFrequency: z.string().default('SEMI_MONTHLY'),
  riceAllowance: z.coerce.number().min(0).default(0),
  clothingAllowance: z.coerce.number().min(0).default(0),
  laundryAllowance: z.coerce.number().min(0).default(0),
  otherAllowance: z.coerce.number().min(0).default(0),
  sssNumber: z.string().optional().or(z.literal('')),
  philhealthNumber: z.string().optional().or(z.literal('')),
  pagibigNumber: z.string().optional().or(z.literal('')),
  tinNumber: z.string().optional().or(z.literal('')),
  sssExempt: z.boolean().default(false),
  philhealthExempt: z.boolean().default(false),
  pagibigExempt: z.boolean().default(false),
  taxExempt: z.boolean().default(false),
  remarks: z.string().optional().or(z.literal('')),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const DEFAULTS: EmployeeFormData = {
  employeeNumber: '', firstName: '', middleName: '', lastName: '', suffix: '',
  gender: '', birthDate: '', civilStatus: '', nationality: '',
  address: '', city: '', province: '', zipCode: '',
  phone: '', email: '', emergencyContact: '', emergencyPhone: '',
  departmentId: '', positionId: '', siteId: '', scheduleId: '', rateId: '',
  employmentType: 'REGULAR', employmentStatus: 'ACTIVE',
  dateHired: '', dateRegularized: '',
  basicSalary: 0, dailyRate: 0, hourlyRate: 0,
  payType: 'DAILY', payFrequency: 'SEMI_MONTHLY',
  riceAllowance: 0, clothingAllowance: 0, laundryAllowance: 0, otherAllowance: 0,
  sssNumber: '', philhealthNumber: '', pagibigNumber: '', tinNumber: '',
  sssExempt: false, philhealthExempt: false, pagibigExempt: false, taxExempt: false,
  remarks: '',
};

function getInitials(first: string, last: string) {
  return `${first[0] || ''}${last[0] || ''}`.toUpperCase();
}

function formatDate(date: string | null) {
  if (!date) return '-';
  return format(new Date(date), 'MMM d, yyyy');
}

const STATUS_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'RESIGNED', label: 'Resigned' },
  { id: 'TERMINATED', label: 'Terminated' },
  { id: 'SUSPENDED', label: 'Suspended' },
] as const;

// ─── API helpers ────────────────────────────────────────────────────────────

async function fetchEmployees(params: {
  page: number; limit: number; search: string;
  departmentId: string; siteId: string;
  employmentStatus: string; employmentType: string;
}) {
  const q = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search) q.set('search', params.search);
  if (params.departmentId) q.set('departmentId', params.departmentId);
  if (params.siteId) q.set('siteId', params.siteId);
  if (params.employmentStatus) q.set('employmentStatus', params.employmentStatus);
  if (params.employmentType) q.set('employmentType', params.employmentType);
  return (await api.get(`/employees?${q}`)).data as { data: Employee[]; total: number; page: number; limit: number };
}

async function fetchLookup(endpoint: string) {
  const { data } = await api.get(`/${endpoint}?limit=999`);
  return (data.data ?? data) as LookupItem[];
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [formTab, setFormTab] = useState<'personal' | 'contact' | 'employment' | 'compensation'>('personal');

  const activeFilterCount = [deptFilter, siteFilter, typeFilter !== 'all' ? typeFilter : ''].filter(Boolean).length;

  function clearFilters() {
    setDeptFilter('');
    setSiteFilter('');
    setTypeFilter('all');
    setPage(1);
  }

  // ─── Form ───────────────────────────────────────────────────────────

  const {
    register, handleSubmit, reset, control,
    formState: { errors, isValid },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: DEFAULTS,
    mode: 'onChange',
  });

  // ─── Queries ────────────────────────────────────────────────────────

  const { data: response, isLoading } = useQuery({
    queryKey: ['employees', page, search, statusFilter, typeFilter, deptFilter, siteFilter],
    queryFn: () => fetchEmployees({
      page, limit: PAGE_SIZE, search,
      departmentId: deptFilter, siteId: siteFilter,
      employmentStatus: statusFilter === 'all' ? '' : statusFilter,
      employmentType: typeFilter === 'all' ? '' : typeFilter,
    }),
  });

  const companiesLookup = useQuery({ queryKey: ['companies-lookup'], queryFn: () => fetchLookup('companies') });
  const departments = useQuery({ queryKey: ['departments-lookup'], queryFn: () => fetchLookup('departments') });
  const positions = useQuery({ queryKey: ['positions-lookup'], queryFn: () => fetchLookup('positions') });
  const sites = useQuery({ queryKey: ['sites-lookup'], queryFn: () => fetchLookup('sites') });
  const schedules = useQuery({ queryKey: ['schedules-lookup'], queryFn: () => fetchLookup('schedules') });
  const rates = useQuery({ queryKey: ['rates-lookup'], queryFn: () => fetchLookup('rates') });

  const employees = response?.data ?? [];
  const total = response?.total ?? 0;
  const activeCount = employees.filter((e) => e.employmentStatus === 'ACTIVE').length;
  const resignedCount = employees.filter((e) => e.employmentStatus === 'RESIGNED').length;
  const terminatedCount = employees.filter((e) => e.employmentStatus === 'TERMINATED').length;

  // ─── Mutations ──────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: EmployeeFormData) => {
      const payload: Record<string, any> = { ...data };
      for (const key of Object.keys(payload)) {
        if (payload[key] === '') payload[key] = null;
      }
      return api.post('/employees', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      closeModal();
      toast({ title: 'Employee created', description: 'The employee has been added successfully.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create employee.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeFormData }) => {
      const payload: Record<string, any> = { ...data };
      for (const key of Object.keys(payload)) {
        if (payload[key] === '') payload[key] = null;
      }
      return api.put(`/employees/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      closeModal();
      toast({ title: 'Employee updated', description: 'Changes have been saved.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update employee.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteTarget(null);
      toast({ title: 'Employee deleted', description: 'The employee has been removed.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete employee.', variant: 'destructive' }),
  });

  // ─── Handlers ───────────────────────────────────────────────────────

  function openAdd() {
    reset(DEFAULTS);
    setEditing(null);
    setFormTab('personal');
    setModalOpen(true);
  }

  function openEdit(emp: Employee) {
    reset({
      employeeNumber: emp.employeeNumber || '',
      firstName: emp.firstName,
      middleName: emp.middleName || '',
      lastName: emp.lastName,
      suffix: emp.suffix || '',
      gender: emp.gender || '',
      birthDate: emp.birthDate ? emp.birthDate.slice(0, 10) : '',
      civilStatus: emp.civilStatus || '',
      nationality: emp.nationality || '',
      address: emp.address || '',
      city: emp.city || '',
      province: emp.province || '',
      zipCode: emp.zipCode || '',
      phone: emp.phone || '',
      email: emp.email || '',
      emergencyContact: emp.emergencyContact || '',
      emergencyPhone: emp.emergencyPhone || '',
      departmentId: emp.departmentId || '',
      positionId: emp.positionId || '',
      siteId: emp.siteId || '',
      scheduleId: emp.scheduleId || '',
      rateId: emp.rateId || '',
      employmentType: emp.employmentType,
      employmentStatus: emp.employmentStatus,
      dateHired: emp.dateHired ? emp.dateHired.slice(0, 10) : '',
      dateRegularized: emp.dateRegularized ? emp.dateRegularized.slice(0, 10) : '',
      basicSalary: Number(emp.basicSalary) || 0,
      dailyRate: Number(emp.dailyRate) || 0,
      hourlyRate: Number(emp.hourlyRate) || 0,
      payType: emp.payType,
      payFrequency: emp.payFrequency,
      riceAllowance: Number(emp.riceAllowance) || 0,
      clothingAllowance: Number(emp.clothingAllowance) || 0,
      laundryAllowance: Number(emp.laundryAllowance) || 0,
      otherAllowance: Number(emp.otherAllowance) || 0,
      sssNumber: emp.sssNumber || '',
      philhealthNumber: emp.philhealthNumber || '',
      pagibigNumber: emp.pagibigNumber || '',
      tinNumber: emp.tinNumber || '',
      sssExempt: emp.sssExempt,
      philhealthExempt: emp.philhealthExempt,
      pagibigExempt: emp.pagibigExempt,
      taxExempt: emp.taxExempt,
      remarks: emp.remarks || '',
    });
    setEditing(emp);
    setFormTab('personal');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function onSubmit(data: EmployeeFormData) {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusFilter(status: string) {
    setStatusFilter(status);
    setPage(1);
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ─── Columns ────────────────────────────────────────────────────────

  const columns: Column<Employee>[] = [
    {
      key: 'lastName',
      label: 'Employee',
      sortable: true,
      render: (_: any, row: Employee) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">
            {getInitials(row.firstName, row.lastName)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">
              {row.lastName}, {row.firstName} {row.middleName ? row.middleName[0] + '.' : ''} {row.suffix || ''}
            </p>
            {row.employeeNumber && (
              <p className="text-xs text-muted-foreground">{row.employeeNumber}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'department.name',
      label: 'Department',
      sortable: true,
      render: (val: any) => val || '-',
    },
    {
      key: 'position.name',
      label: 'Position',
      sortable: true,
      render: (val: any) => val || '-',
    },
    {
      key: 'site.name',
      label: 'Site',
      sortable: true,
      render: (val: any) => val || '-',
    },
    {
      key: 'employmentType',
      label: 'Type',
      sortable: true,
      render: (val: string) => <StatusBadge status={val} />,
    },
    {
      key: 'employmentStatus',
      label: 'Status',
      sortable: true,
      render: (val: string) => <StatusBadge status={val} />,
    },
    {
      key: 'dateHired',
      label: 'Date Hired',
      sortable: true,
      render: (val: string) => formatDate(val),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-[80px]',
      render: (_: any, row: Employee) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader title="Employees" description="Manage employee records and information">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">
          Add Employee
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={total} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Active" value={activeCount} icon={<UserCheck className="h-5 w-5" />} />
        <StatCard title="Resigned" value={resignedCount} icon={<UserMinus className="h-5 w-5" />} />
        <StatCard title="Terminated" value={terminatedCount} icon={<UserX className="h-5 w-5" />} />
      </div>

      {/* Data Table */}
      <DataTable<Employee>
        columns={columns}
        data={employees}
        total={total}
        page={page}
        limit={PAGE_SIZE}
        onPageChange={setPage}
        onSearch={handleSearchChange}
        searchPlaceholder="Search by name, email, or employee number..."
        onRowClick={openEdit}
        isLoading={isLoading}
        emptyMessage="No employees found. Add your first employee to get started."
        emptyIcon={<Users className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Advanced Filters Popover */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="h-3.5 w-3.5 mr-1.5" /> Filters
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0" align="start">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                  <p className="text-sm font-semibold">Filters</p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <X className="h-3 w-3" /> Clear all
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Department</Label>
                    <Select value={deptFilter || 'ALL'} onValueChange={(v) => { setDeptFilter(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All departments" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All departments</SelectItem>
                        {(departments.data ?? []).map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Site / Branch</Label>
                    <Select value={siteFilter || 'ALL'} onValueChange={(v) => { setSiteFilter(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All sites" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All sites</SelectItem>
                        {(sites.data ?? []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Employment Type</Label>
                    <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All types" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="REGULAR">Regular</SelectItem>
                        <SelectItem value="PROBATIONARY">Probationary</SelectItem>
                        <SelectItem value="CONTRACTUAL">Contractual</SelectItem>
                        <SelectItem value="PART_TIME">Part-Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Status Chips */}
            <div className="flex items-center gap-1.5">
              {STATUS_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => handleStatusFilter(chip.id)}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
                    statusFilter === chip.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent'
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* ─── Create / Edit Modal ───────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">
              {editing ? 'Edit Employee' : 'Add New Employee'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {editing ? 'Update the employee information below.' : 'Fill in the details to add a new employee.'}
            </DialogDescription>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 pt-3 bg-muted/30 border-b">
            <div className="flex gap-1">
              {(['personal', 'contact', 'employment', 'compensation'] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setFormTab(tab)}
                  className={cn('px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px',
                    formTab === tab ? 'text-foreground border-primary bg-background' : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-background/50'
                  )}>
                  {tab === 'personal' && 'Personal Info'}
                  {tab === 'contact' && 'Contact & IDs'}
                  {tab === 'employment' && 'Employment'}
                  {tab === 'compensation' && 'Compensation'}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="employee-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* ─── Tab 1: Personal Info ───────────────────────────── */}
              {formTab === 'personal' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">First Name <span className="text-red-500">*</span></Label>
                      <Input {...register('firstName')} className={cn(errors.firstName && 'border-red-300 focus-visible:ring-red-200')} />
                      {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Middle Name</Label>
                      <Input {...register('middleName')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Last Name <span className="text-red-500">*</span></Label>
                      <Input {...register('lastName')} className={cn(errors.lastName && 'border-red-300 focus-visible:ring-red-200')} />
                      {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Suffix</Label>
                      <Input {...register('suffix')} placeholder="Jr., Sr., III" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Gender <span className="text-red-500">*</span></Label>
                      <Controller control={control} name="gender" render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem></SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Date of Birth <span className="text-red-500">*</span></Label>
                      <Controller control={control} name="birthDate" render={({ field }) => (
                        <DatePicker value={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')} placeholder="Select date" />
                      )} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Civil Status <span className="text-red-500">*</span></Label>
                      <Controller control={control} name="civilStatus" render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent><SelectItem value="SINGLE">Single</SelectItem><SelectItem value="MARRIED">Married</SelectItem><SelectItem value="WIDOWED">Widowed</SelectItem><SelectItem value="SEPARATED">Separated</SelectItem></SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Nationality</Label>
                      <Input {...register('nationality')} placeholder="Filipino" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Address</Label>
                    <Input {...register('address')} placeholder="Street address" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5"><Label className="text-sm">City / Municipality</Label><Input {...register('city')} /></div>
                    <div className="space-y-1.5"><Label className="text-sm">Province</Label><Input {...register('province')} /></div>
                    <div className="space-y-1.5"><Label className="text-sm">Zip Code</Label><Input {...register('zipCode')} /></div>
                  </div>

                  <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Emergency Contact</p></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-sm">Contact Person</Label><Input {...register('emergencyContact')} /></div>
                    <div className="space-y-1.5"><Label className="text-sm">Contact Number</Label><Input {...register('emergencyPhone')} placeholder="09XXXXXXXXX" /></div>
                  </div>
                </>
              )}

              {/* ─── Tab 2: Contact & IDs ───────────────────────────── */}
              {formTab === 'contact' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-sm">Email</Label><Input type="email" {...register('email')} /></div>
                    <div className="space-y-1.5"><Label className="text-sm">Phone Number</Label><Input {...register('phone')} placeholder="09XXXXXXXXX" /></div>
                  </div>

                  <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Government IDs</p></div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5"><Label className="text-sm">TIN Number</Label><Input {...register('tinNumber')} placeholder="123-456-789-000" /></div>
                    <div className="space-y-1.5"><Label className="text-sm">SSS Number</Label><Input {...register('sssNumber')} placeholder="12-3456789-0" /></div>
                    <div className="space-y-1.5"><Label className="text-sm">PhilHealth Number</Label><Input {...register('philhealthNumber')} placeholder="12-345678901-2" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5"><Label className="text-sm">Pag-IBIG Number</Label><Input {...register('pagibigNumber')} placeholder="1234-5678-9012" /></div>
                    <div className="space-y-1.5"><Label className="text-sm">Employee Number</Label><Input {...register('employeeNumber')} placeholder="Auto-generated if blank" /></div>
                  </div>

                  <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Contribution Exemptions</p></div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Controller control={control} name="sssExempt" render={({ field }) => (
                      <div className="flex items-center justify-between rounded-lg border p-3"><Label className="text-xs">SSS Exempt</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>
                    )} />
                    <Controller control={control} name="philhealthExempt" render={({ field }) => (
                      <div className="flex items-center justify-between rounded-lg border p-3"><Label className="text-xs">PhilHealth</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>
                    )} />
                    <Controller control={control} name="pagibigExempt" render={({ field }) => (
                      <div className="flex items-center justify-between rounded-lg border p-3"><Label className="text-xs">Pag-IBIG</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>
                    )} />
                    <Controller control={control} name="taxExempt" render={({ field }) => (
                      <div className="flex items-center justify-between rounded-lg border p-3"><Label className="text-xs">Tax Exempt</Label><Switch checked={field.value} onCheckedChange={field.onChange} /></div>
                    )} />
                  </div>
                </>
              )}

              {/* ─── Tab 3: Employment ──────────────────────────────── */}
              {formTab === 'employment' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Company</Label>
                      <Controller control={control} name="departmentId" render={() => (
                        <Select onValueChange={() => {}}>
                          <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                          <SelectContent>{(companiesLookup.data ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Site <span className="text-red-500">*</span></Label>
                      <Controller control={control} name="siteId" render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                          <SelectContent>{(sites.data ?? []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Department <span className="text-red-500">*</span></Label>
                      <Controller control={control} name="departmentId" render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                          <SelectContent>{(departments.data ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Position <span className="text-red-500">*</span></Label>
                      <Controller control={control} name="positionId" render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                          <SelectContent>{(positions.data ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Schedule</Label>
                      <Controller control={control} name="scheduleId" render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select schedule" /></SelectTrigger>
                          <SelectContent>{(schedules.data ?? []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Rate Table</Label>
                      <Controller control={control} name="rateId" render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select rate" /></SelectTrigger>
                          <SelectContent>{(rates.data ?? []).map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                  </div>

                  <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Employment Details</p></div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Hire Date <span className="text-red-500">*</span></Label>
                      <Controller control={control} name="dateHired" render={({ field }) => (
                        <DatePicker value={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')} placeholder="Select date" />
                      )} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Regularization Date</Label>
                      <Controller control={control} name="dateRegularized" render={({ field }) => (
                        <DatePicker value={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')} placeholder="Select date" />
                      )} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Employment Status <span className="text-red-500">*</span></Label>
                      <Controller control={control} name="employmentStatus" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="PROBATIONARY">Probationary</SelectItem>
                            <SelectItem value="CONTRACTUAL">Contractual</SelectItem><SelectItem value="PART_TIME">Part-Time</SelectItem>
                            <SelectItem value="RESIGNED">Resigned</SelectItem><SelectItem value="TERMINATED">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Employment Type</Label>
                      <Controller control={control} name="employmentType" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="REGULAR">Regular</SelectItem><SelectItem value="PROBATIONARY">Probationary</SelectItem><SelectItem value="CONTRACTUAL">Contractual</SelectItem><SelectItem value="PART_TIME">Part-Time</SelectItem></SelectContent>
                        </Select>
                      )} />
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-sm">Remarks</Label><Textarea {...register('remarks')} placeholder="Additional notes..." className="min-h-[60px]" /></div>
                </>
              )}

              {/* ─── Tab 4: Compensation ────────────────────────────── */}
              {formTab === 'compensation' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Pay Type <span className="text-red-500">*</span></Label>
                      <Controller control={control} name="payType" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="MONTHLY">Monthly</SelectItem><SelectItem value="DAILY">Daily</SelectItem></SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Pay Frequency</Label>
                      <Controller control={control} name="payFrequency" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="MONTHLY">Monthly</SelectItem><SelectItem value="SEMI_MONTHLY">Semi-Monthly</SelectItem><SelectItem value="WEEKLY">Weekly</SelectItem></SelectContent>
                        </Select>
                      )} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5"><Label className="text-sm">Basic Salary (₱)</Label><Input type="number" step="0.01" {...register('basicSalary')} /></div>
                    <div className="space-y-1.5"><Label className="text-sm">Daily Rate (₱)</Label><Input type="number" step="0.01" {...register('dailyRate')} /></div>
                    <div className="space-y-1.5"><Label className="text-sm">Hourly Rate (₱)</Label><Input type="number" step="0.01" {...register('hourlyRate')} /></div>
                  </div>

                  <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Allowances (Monthly)</p></div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5"><Label className="text-sm">Rice (₱)</Label><Input type="number" step="0.01" {...register('riceAllowance')} /></div>
                    <div className="space-y-1.5"><Label className="text-sm">Clothing (₱)</Label><Input type="number" step="0.01" {...register('clothingAllowance')} /></div>
                    <div className="space-y-1.5"><Label className="text-sm">Laundry (₱)</Label><Input type="number" step="0.01" {...register('laundryAllowance')} /></div>
                    <div className="space-y-1.5"><Label className="text-sm">Other (₱)</Label><Input type="number" step="0.01" {...register('otherAllowance')} /></div>
                  </div>
                </>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button
              type="button"
              onClick={closeModal}
              className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              form="employee-form"
              disabled={!isValid || isSubmitting}
              className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Employee'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Employee"
        description={`Are you sure you want to delete "${deleteTarget?.firstName} ${deleteTarget?.lastName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
