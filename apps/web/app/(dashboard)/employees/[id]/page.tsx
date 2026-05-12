'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, Users, MapPin, Briefcase, Calendar, Phone, Mail } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/employees')}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </div>
        <div className="flex h-[400px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      </div>
    );
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
  const fullName = `${emp.lastName}, ${emp.firstName} ${emp.middleName || ''} ${emp.suffix || ''}`.trim();

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
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/employees')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Employees
        </Button>
        <Button size="sm" onClick={() => router.push(`/employees?edit=${emp.id}`)} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Employee
        </Button>
      </div>

      {/* Profile Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-red-700 to-red-600 h-24" />
        <CardContent className="relative pt-0 pb-5 px-6">
          <div className="flex items-end gap-5 -mt-12">
            {emp.photo ? (
              <img src={`${apiBase}${emp.photo}`} alt="" className="h-24 w-24 rounded-full object-cover border-4 border-background shadow-lg" />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-800 to-red-600 text-white text-2xl font-bold border-4 border-background shadow-lg">
                {(emp.firstName[0] || '') + (emp.lastName[0] || '')}
              </div>
            )}
            <div className="pb-1 flex-1">
              <h1 className="text-2xl font-bold uppercase">{fullName}</h1>
              <p className="text-sm text-muted-foreground">{emp.position?.name || 'No Position'} — {emp.department?.name || 'No Department'}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={emp.employmentStatus} />
                <StatusBadge status={emp.employmentType} />
                {emp.employeeLevel && <StatusBadge status={emp.employeeLevel.name} variant="info" />}
                {emp.employeeNumber && <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{emp.employeeNumber}</span>}
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-sm text-muted-foreground">
            {emp.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{emp.email}</span>}
            {emp.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{emp.phone}</span>}
            {emp.site && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{emp.site.name}</span>}
            {emp.dateHired && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Hired {fmtDate(emp.dateHired)}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <InfoCard title="Personal Information" rows={[
          ['Gender', emp.gender],
          ['Date of Birth', fmtDate(emp.birthDate)],
          ['Civil Status', emp.civilStatus],
          ['Nationality', emp.nationality],
          ['Address', [emp.address, emp.city, emp.province, emp.zipCode].filter(Boolean).join(', ')],
        ]} />

        <InfoCard title="Emergency Contact" rows={[
          ['Contact Person', emp.emergencyContact],
          ['Contact Number', emp.emergencyPhone],
        ]} />

        <InfoCard title="Employment" rows={[
          ['Department', emp.department?.name],
          ['Position', emp.position?.name],
          ['Site', emp.site?.name],
          ['Schedule', emp.schedule?.name],
          ['Employee Level', emp.employeeLevel?.name],
          ['Reports To', emp.reportsTo ? `${emp.reportsTo.firstName} ${emp.reportsTo.lastName}` : null],
          ['Date Hired', fmtDate(emp.dateHired)],
          ['Regularized', fmtDate(emp.dateRegularized)],
        ]} />

        <InfoCard title="Compensation" rows={[
          ['Pay Type', emp.payType],
          ['Basic Salary', fmt(emp.basicSalary)],
          ['Daily Rate', fmt(emp.dailyRate)],
          ['Hourly Rate', fmt(emp.hourlyRate)],
          ['Rate Table', emp.rate?.name],
        ]} />

        <InfoCard title="Government IDs" rows={[
          ['TIN', emp.tinNumber],
          ['SSS', emp.sssNumber],
          ['PhilHealth', emp.philhealthNumber],
          ['Pag-IBIG', emp.pagibigNumber],
        ]} />

        {allowances.length > 0 && (
          <InfoCard title="Allowances (Monthly)" rows={allowances.map(a => [a.label, a.value])} />
        )}
      </div>

      {emp.remarks && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Remarks</p>
            <p className="text-sm">{emp.remarks}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoCard({ title, rows }: { title: string; rows: [string, string | null | undefined][] }) {
  const visible = rows.filter(([, v]) => v);
  if (visible.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</p>
        <div className="space-y-2.5">
          {visible.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <span className="text-sm text-muted-foreground shrink-0">{label}</span>
              <span className="text-sm font-medium text-right">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
