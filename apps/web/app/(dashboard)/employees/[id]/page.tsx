'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft, Pencil, Users, MapPin, Briefcase, Calendar, Phone, Mail,
  User, Building2, Clock, CreditCard, Shield, Hash, Globe, Heart,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  department: { id: string; name: string } | null;
  position: { id: string; name: string } | null;
  site: { id: string; name: string } | null;
  schedule: { id: string; name: string } | null;
  rate: { id: string; name: string } | null;
  employeeLevel: { id: string; name: string; order: number } | null;
  reportsTo: { id: string; firstName: string; lastName: string } | null;
}

function fmt(val: number | string) {
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

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: emp, isLoading } = useQuery<Employee>({
    queryKey: ['employee', id],
    queryFn: () => api.get(`/employees/${id}`).then(r => r.data),
    enabled: !!id,
  });

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
    { label: 'Rice', value: fmt(emp.riceAllowance) },
    { label: 'Clothing', value: fmt(emp.clothingAllowance) },
    { label: 'Laundry', value: fmt(emp.laundryAllowance) },
    { label: 'Medical', value: fmt(emp.medicalAllowance) },
    { label: 'Transportation', value: fmt(emp.transportationAllowance) },
    { label: 'Communication', value: fmt(emp.communicationAllowance) },
    { label: 'Other', value: fmt(emp.otherAllowance) },
  ].filter(a => a.value);

  return (
    <div className="flex flex-col gap-6">
      {/* Back Button */}
      <button onClick={() => router.push('/employees')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </button>

      {/* Hero Banner */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-red-800 via-red-900 to-red-950 relative px-6 pb-20 pt-6">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0V0zm20 20h20v20H20V20z\' fill=\'%23fff\' fill-opacity=\'0.1\'/%3E%3C/svg%3E")', backgroundSize: '20px 20px' }} />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-white">{fullName}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-white/70">
                {emp.employeeNumber && <span className="font-mono">{emp.employeeNumber}</span>}
                {emp.employeeNumber && emp.position && <span className="text-white/40">|</span>}
                {emp.position && <span>{emp.position.name}</span>}
                {emp.department && <><span className="text-white/40">|</span><span>{emp.department.name}</span></>}
              </div>
              {emp.email && <p className="text-sm text-white/60 mt-2">{emp.email}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={cn('mt-1', emp.employmentStatus === 'ACTIVE' || emp.employmentStatus === 'PROBATIONARY' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-400 text-white')}>
                {emp.employmentStatus.replace('_', ' ')}
              </Badge>
              <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => router.push(`/employees`)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="relative px-6 pb-4">
          <div className="flex flex-col sm:flex-row gap-5 -mt-14">
            <div className="shrink-0">
              <div className="w-28 h-28 rounded-2xl border-4 border-background bg-muted overflow-hidden shadow-lg flex items-center justify-center">
                {emp.photo ? (
                  <img src={`${apiBase}${emp.photo}`} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground/40" />
                )}
              </div>
            </div>
            <div className="pt-16 flex-1 min-w-0">
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {emp.site && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /><span>{emp.site.name}</span></div>}
                {emp.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /><span>{emp.phone}</span></div>}
                {emp.dateHired && <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /><span>Hired {fmtDate(emp.dateHired)}</span></div>}
                {emp.employeeLevel && <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /><span>{emp.employeeLevel.name}</span></div>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={emp.employmentType} />
                {emp.employeeLevel && <StatusBadge status={emp.employeeLevel.name} variant="info" />}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
          <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5">Profile</TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5">Attendance</TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5">Payroll</TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5">Leaves</TabsTrigger>
          <TabsTrigger value="deductions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5">Deductions</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
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

          <div className="border-t pt-5 mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Emergency Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
              <Field label="Contact Person" value={emp.emergencyContact} icon={User} />
              <Field label="Contact Number" value={emp.emergencyPhone} icon={Phone} />
            </div>
          </div>

          <div className="border-t pt-5 mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Employment Details</p>
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

          <div className="border-t pt-5 mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Compensation</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
              <Field label="Pay Type" value={emp.payType} icon={CreditCard} />
              <Field label="Basic Salary" value={fmt(emp.basicSalary)} icon={CreditCard} />
              <Field label="Daily Rate" value={fmt(emp.dailyRate)} icon={CreditCard} />
              <Field label="Hourly Rate" value={fmt(emp.hourlyRate)} icon={CreditCard} />
              <Field label="Rate Table" value={emp.rate?.name} icon={CreditCard} />
            </div>
          </div>

          <div className="border-t pt-5 mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Government IDs</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
              <Field label="TIN" value={emp.tinNumber} icon={Hash} mono />
              <Field label="SSS" value={emp.sssNumber} icon={Hash} mono />
              <Field label="PhilHealth" value={emp.philhealthNumber} icon={Hash} mono />
              <Field label="Pag-IBIG" value={emp.pagibigNumber} icon={Hash} mono />
            </div>
          </div>

          {allowances.length > 0 && (
            <div className="border-t pt-5 mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Allowances (Monthly)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
                {allowances.map(a => <Field key={a.label} label={a.label} value={a.value} icon={CreditCard} />)}
              </div>
            </div>
          )}

          {emp.remarks && (
            <div className="border-t pt-5 mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Remarks</p>
              <p className="text-sm">{emp.remarks}</p>
            </div>
          )}
        </TabsContent>

        {/* Other Tabs — placeholder content */}
        <TabsContent value="attendance" className="mt-5">
          <div className="flex h-[200px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
            Attendance records for this employee will appear here
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="mt-5">
          <div className="flex h-[200px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
            Payroll history for this employee will appear here
          </div>
        </TabsContent>

        <TabsContent value="leaves" className="mt-5">
          <div className="flex h-[200px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
            Leave applications and credits for this employee will appear here
          </div>
        </TabsContent>

        <TabsContent value="deductions" className="mt-5">
          <div className="flex h-[200px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
            Deductions and loans for this employee will appear here
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
