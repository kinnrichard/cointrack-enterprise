'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  ArrowLeft, Pencil, Users, MapPin, Briefcase, Calendar, Phone, Mail,
  User, Building2, Clock, CreditCard, Shield, Hash, Globe, Heart, Loader2,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Employee {
  id: string; employeeNumber: string | null; firstName: string; middleName: string | null;
  lastName: string; suffix: string | null; gender: string | null; birthDate: string | null;
  civilStatus: string | null; nationality: string | null; address: string | null;
  city: string | null; province: string | null; zipCode: string | null;
  phone: string | null; email: string | null; emergencyContact: string | null;
  emergencyPhone: string | null; photo: string | null; remarks: string | null;
  employmentType: string; employmentStatus: string; payType: string; payFrequency: string;
  basicSalary: number; dailyRate: number; hourlyRate: number;
  dateHired: string | null; dateRegularized: string | null;
  riceAllowance: number; clothingAllowance: number; laundryAllowance: number;
  medicalAllowance: number; transportationAllowance: number; communicationAllowance: number;
  otherAllowance: number; sssNumber: string | null; philhealthNumber: string | null;
  pagibigNumber: string | null; tinNumber: string | null;
  departmentId: string | null; positionId: string | null; siteId: string | null;
  scheduleId: string | null; rateId: string | null; employeeLevelId: string | null;
  reportsToId: string | null;
  department: { id: string; name: string } | null;
  position: { id: string; name: string } | null;
  site: { id: string; name: string } | null;
  schedule: { id: string; name: string } | null;
  rate: { id: string; name: string } | null;
  employeeLevel: { id: string; name: string; order: number } | null;
  reportsTo: { id: string; firstName: string; lastName: string } | null;
}

interface LookupItem { id: string; name: string }

function fmtMoney(val: number | string) {
  const n = Number(val);
  return n > 0 ? `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : null;
}

function fmtDate(val: string | null) {
  if (!val) return null;
  return format(new Date(val), 'MMM d, yyyy');
}

function Field({ label, value, icon: Icon, mono }: Readonly<{ label: string; value: any; icon?: any; mono?: boolean }>) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className={cn('text-sm font-medium flex items-center gap-1.5', mono && 'font-mono')}>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {value || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}

async function fetchLookup(endpoint: string) {
  const { data } = await api.get(`/${endpoint}?limit=999`);
  return (data.data ?? data) as LookupItem[];
}

const editSchema = z.object({
  firstName: z.string().min(1), lastName: z.string().min(1), middleName: z.string().optional().or(z.literal('')),
  suffix: z.string().optional().or(z.literal('')), gender: z.string().optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')), civilStatus: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')), email: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  departmentId: z.string().optional().or(z.literal('')), positionId: z.string().optional().or(z.literal('')),
  siteId: z.string().optional().or(z.literal('')), scheduleId: z.string().optional().or(z.literal('')),
  employmentStatus: z.string(), employmentType: z.string(),
  dateHired: z.string().optional().or(z.literal('')),
  basicSalary: z.coerce.number().min(0).default(0), dailyRate: z.coerce.number().min(0).default(0),
  payType: z.string(), remarks: z.string().optional().or(z.literal('')),
});

type EditFormData = z.infer<typeof editSchema>;

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const id = params.id as string;
  const [editOpen, setEditOpen] = useState(false);

  const { data: emp, isLoading } = useQuery<Employee>({
    queryKey: ['employee', id],
    queryFn: () => api.get(`/employees/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const departments = useQuery({ queryKey: ['departments-lookup'], queryFn: () => fetchLookup('departments') });
  const positions = useQuery({ queryKey: ['positions-lookup'], queryFn: () => fetchLookup('positions') });
  const sites = useQuery({ queryKey: ['sites-lookup'], queryFn: () => fetchLookup('sites') });
  const schedules = useQuery({ queryKey: ['schedules-lookup'], queryFn: () => fetchLookup('schedules') });

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema), mode: 'onChange',
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditFormData) => {
      const p: Record<string, any> = { ...data };
      for (const k of Object.keys(p)) if (p[k] === '') p[k] = null;
      return api.put(`/employees/${id}`, p);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      setEditOpen(false);
      toast({ title: 'Employee updated', description: 'Changes have been saved successfully.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update.', variant: 'destructive' }),
  });

  function openEditModal() {
    if (!emp) return;
    reset({
      firstName: emp.firstName, lastName: emp.lastName, middleName: emp.middleName || '',
      suffix: emp.suffix || '', gender: emp.gender || '', birthDate: emp.birthDate ? emp.birthDate.slice(0, 10) : '',
      civilStatus: emp.civilStatus || '', phone: emp.phone || '', email: emp.email || '',
      address: [emp.address, emp.city, emp.province].filter(Boolean).join(', '),
      departmentId: emp.departmentId || '', positionId: emp.positionId || '',
      siteId: emp.siteId || '', scheduleId: emp.scheduleId || '',
      employmentStatus: emp.employmentStatus, employmentType: emp.employmentType,
      dateHired: emp.dateHired ? emp.dateHired.slice(0, 10) : '',
      basicSalary: Number(emp.basicSalary) || 0, dailyRate: Number(emp.dailyRate) || 0,
      payType: emp.payType, remarks: emp.remarks || '',
    });
    setEditOpen(true);
  }

  if (isLoading || !emp) {
    return (
      <div className="flex flex-col gap-6">
        <button onClick={() => router.push('/employees')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" /> Back to Employees
        </button>
        <div className="flex h-[400px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      </div>
    );
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
  const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName} ${emp.suffix || ''}`.replace(/\s+/g, ' ').trim();

  const allowances = [
    { label: 'Rice', value: fmtMoney(emp.riceAllowance) },
    { label: 'Clothing', value: fmtMoney(emp.clothingAllowance) },
    { label: 'Laundry', value: fmtMoney(emp.laundryAllowance) },
    { label: 'Medical', value: fmtMoney(emp.medicalAllowance) },
    { label: 'Transportation', value: fmtMoney(emp.transportationAllowance) },
    { label: 'Communication', value: fmtMoney(emp.communicationAllowance) },
    { label: 'Other', value: fmtMoney(emp.otherAllowance) },
  ].filter(a => a.value);

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => router.push('/employees')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </button>

      {/* Hero Banner */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-red-800 via-red-900 to-red-950 relative px-6 pb-20 pt-6">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0V0zm20 20h20v20H20V20z\' fill=\'%23fff\' fill-opacity=\'0.1\'/%3E%3C/svg%3E")', backgroundSize: '20px 20px' }} />
          <div className="relative min-w-0">
            <h2 className="text-2xl font-bold text-white">{fullName}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-white/70">
              {emp.employeeNumber && <span className="font-mono">{emp.employeeNumber}</span>}
              {emp.position && <><span className="text-white/40">|</span><span>{emp.position.name}</span></>}
              {emp.department && <><span className="text-white/40">|</span><span>{emp.department.name}</span></>}
            </div>
            {emp.email && <p className="text-sm text-white/60 mt-2">{emp.email}</p>}
          </div>
        </div>
        <CardContent className="relative px-6 pb-4">
          <div className="flex flex-col sm:flex-row gap-5 -mt-14">
            <div className="shrink-0">
              <div className="w-28 h-28 rounded-2xl border-4 border-background bg-muted overflow-hidden shadow-lg flex items-center justify-center">
                {emp.photo ? <img src={`${apiBase}${emp.photo}`} alt={fullName} className="w-full h-full object-cover" /> : <User className="h-10 w-10 text-muted-foreground/40" />}
              </div>
            </div>
            <div className="pt-16 flex-1 min-w-0">
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {emp.site && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{emp.site.name}</div>}
                {emp.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{emp.phone}</div>}
                {emp.dateHired && <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Hired {fmtDate(emp.dateHired)}</div>}
                {emp.employeeLevel && <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />{emp.employeeLevel.name}</div>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={emp.employmentStatus} />
                <StatusBadge status={emp.employmentType} />
                {emp.employeeLevel && <StatusBadge status={emp.employeeLevel.name} variant="info" />}
              </div>
            </div>
            <div className="pt-16 shrink-0">
              <Button size="sm" onClick={openEditModal} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
          {['profile', 'attendance', 'payroll', 'leaves', 'deductions'].map(t => (
            <TabsTrigger key={t} value={t} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="mt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
            <Field label="Gender" value={emp.gender} icon={User} />
            <Field label="Date of Birth" value={fmtDate(emp.birthDate)} icon={Calendar} />
            <Field label="Civil Status" value={emp.civilStatus} icon={Heart} />
            <Field label="Nationality" value={emp.nationality} icon={Globe} />
            <Field label="Address" value={[emp.address, emp.city, emp.province, emp.zipCode].filter(Boolean).join(', ')} icon={MapPin} />
            <Field label="Phone" value={emp.phone} icon={Phone} />
            <Field label="Email" value={emp.email} icon={Mail} />
            <Field label="Employee Number" value={emp.employeeNumber} icon={Hash} mono />
          </div>
          <div className="border-t pt-5 mt-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Emergency Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
              <Field label="Contact Person" value={emp.emergencyContact} icon={User} />
              <Field label="Contact Number" value={emp.emergencyPhone} icon={Phone} />
            </div>
          </div>
          <div className="border-t pt-5 mt-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Employment Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
              <Field label="Department" value={emp.department?.name} icon={Building2} />
              <Field label="Position" value={emp.position?.name} icon={Briefcase} />
              <Field label="Site" value={emp.site?.name} icon={MapPin} />
              <Field label="Schedule" value={emp.schedule?.name} icon={Clock} />
              <Field label="Employee Level" value={emp.employeeLevel?.name} icon={Shield} />
              <Field label="Reports To" value={emp.reportsTo ? `${emp.reportsTo.firstName} ${emp.reportsTo.lastName}` : null} icon={Users} />
              <Field label="Date Hired" value={fmtDate(emp.dateHired)} icon={Calendar} />
              <Field label="Date Regularized" value={fmtDate(emp.dateRegularized)} icon={Calendar} />
            </div>
          </div>
          <div className="border-t pt-5 mt-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Compensation</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
              <Field label="Pay Type" value={emp.payType} icon={CreditCard} />
              <Field label="Basic Salary" value={fmtMoney(emp.basicSalary)} icon={CreditCard} />
              <Field label="Daily Rate" value={fmtMoney(emp.dailyRate)} icon={CreditCard} />
              <Field label="Rate Table" value={emp.rate?.name} icon={CreditCard} />
            </div>
          </div>
          <div className="border-t pt-5 mt-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Government IDs</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
              <Field label="TIN" value={emp.tinNumber} icon={Hash} mono />
              <Field label="SSS" value={emp.sssNumber} icon={Hash} mono />
              <Field label="PhilHealth" value={emp.philhealthNumber} icon={Hash} mono />
              <Field label="Pag-IBIG" value={emp.pagibigNumber} icon={Hash} mono />
            </div>
          </div>
          {allowances.length > 0 && (
            <div className="border-t pt-5 mt-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Allowances (Monthly)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
                {allowances.map(a => <Field key={a.label} label={a.label} value={a.value} icon={CreditCard} />)}
              </div>
            </div>
          )}
          {emp.remarks && (
            <div className="border-t pt-5 mt-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Remarks</p><p className="text-sm">{emp.remarks}</p></div>
          )}
        </TabsContent>

        {['attendance', 'payroll', 'leaves', 'deductions'].map(t => (
          <TabsContent key={t} value={t} className="mt-5">
            <div className="flex h-[200px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground capitalize">
              {t} records for this employee will appear here
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* ─── Quick Edit Modal ──────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(open) => !open && setEditOpen(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">Edit Employee</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">Update {emp.firstName} {emp.lastName}&apos;s information.</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="quick-edit-form" onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">First Name <span className="text-red-500">*</span></Label><Input {...register('firstName')} className={cn(errors.firstName && 'border-red-300')} /></div>
                <div className="space-y-1.5"><Label className="text-sm">Middle Name</Label><Input {...register('middleName')} /></div>
                <div className="space-y-1.5"><Label className="text-sm">Last Name <span className="text-red-500">*</span></Label><Input {...register('lastName')} className={cn(errors.lastName && 'border-red-300')} /></div>
                <div className="space-y-1.5"><Label className="text-sm">Suffix</Label><Input {...register('suffix')} /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">Gender</Label>
                  <Controller control={control} name="gender" render={({ field }) => (<Select value={field.value || ''} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem></SelectContent></Select>)} />
                </div>
                <div className="space-y-1.5"><Label className="text-sm">Date of Birth</Label>
                  <Controller control={control} name="birthDate" render={({ field }) => (<DatePicker value={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')} placeholder="Select date" />)} />
                </div>
                <div className="space-y-1.5"><Label className="text-sm">Civil Status</Label>
                  <Controller control={control} name="civilStatus" render={({ field }) => (<Select value={field.value || ''} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="SINGLE">Single</SelectItem><SelectItem value="MARRIED">Married</SelectItem><SelectItem value="WIDOWED">Widowed</SelectItem><SelectItem value="SEPARATED">Separated</SelectItem></SelectContent></Select>)} />
                </div>
                <div className="space-y-1.5"><Label className="text-sm">Phone</Label><Input {...register('phone')} /></div>
              </div>

              <div className="border-t pt-4"><p className="text-sm font-medium text-muted-foreground mb-3">Employment</p></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">Department</Label>
                  <Controller control={control} name="departmentId" render={({ field }) => (<Select value={field.value || ''} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{(departments.data ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>)} />
                </div>
                <div className="space-y-1.5"><Label className="text-sm">Position</Label>
                  <Controller control={control} name="positionId" render={({ field }) => (<Select value={field.value || ''} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{(positions.data ?? []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>)} />
                </div>
                <div className="space-y-1.5"><Label className="text-sm">Site</Label>
                  <Controller control={control} name="siteId" render={({ field }) => (<Select value={field.value || ''} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{(sites.data ?? []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>)} />
                </div>
                <div className="space-y-1.5"><Label className="text-sm">Schedule</Label>
                  <Controller control={control} name="scheduleId" render={({ field }) => (<Select value={field.value || ''} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{(schedules.data ?? []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>)} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">Employment Status</Label>
                  <Controller control={control} name="employmentStatus" render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PROBATIONARY">Probationary</SelectItem><SelectItem value="ACTIVE">Regular</SelectItem><SelectItem value="CONTRACTUAL">Contractual</SelectItem><SelectItem value="RESIGNED">Resigned</SelectItem><SelectItem value="TERMINATED">Terminated</SelectItem></SelectContent></Select>)} />
                </div>
                <div className="space-y-1.5"><Label className="text-sm">Date Hired</Label>
                  <Controller control={control} name="dateHired" render={({ field }) => (<DatePicker value={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : '')} placeholder="Select date" />)} />
                </div>
                <div className="space-y-1.5"><Label className="text-sm">Pay Type</Label>
                  <Controller control={control} name="payType" render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MONTHLY">Monthly</SelectItem><SelectItem value="DAILY">Daily</SelectItem></SelectContent></Select>)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-sm">Basic Salary</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span><Input type="number" step="0.01" {...register('basicSalary')} className="pl-7" /></div></div>
                <div className="space-y-1.5"><Label className="text-sm">Daily Rate</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span><Input type="number" step="0.01" {...register('dailyRate')} className="pl-7" /></div></div>
              </div>
              <div className="space-y-1.5"><Label className="text-sm">Remarks</Label><Textarea {...register('remarks')} className="min-h-[60px]" /></div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={() => setEditOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="quick-edit-form" disabled={!isValid || updateMutation.isPending} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
