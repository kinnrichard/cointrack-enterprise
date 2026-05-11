'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, Building2, MapPin, CalendarCheck, CalendarOff, Timer } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalDepartments: number;
  totalSites: number;
  todayAttendance: number;
  pendingLeaves: number;
  pendingOvertime: number;
}

function SkeletonCard() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-7 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  });

  const statCards = [
    { title: 'Total Employees', value: stats?.totalEmployees ?? 0, icon: <Users className="h-5 w-5" />, className: 'border-l-4 border-l-blue-500' },
    { title: 'Active Employees', value: stats?.activeEmployees ?? 0, icon: <UserCheck className="h-5 w-5" />, className: 'border-l-4 border-l-emerald-500' },
    { title: 'Departments', value: stats?.totalDepartments ?? 0, icon: <Building2 className="h-5 w-5" />, className: 'border-l-4 border-l-violet-500' },
    { title: 'Sites', value: stats?.totalSites ?? 0, icon: <MapPin className="h-5 w-5" />, className: 'border-l-4 border-l-orange-500' },
    { title: 'Present Today', value: stats?.todayAttendance ?? 0, icon: <CalendarCheck className="h-5 w-5" />, className: 'border-l-4 border-l-teal-500' },
    { title: 'Pending Leaves', value: stats?.pendingLeaves ?? 0, icon: <CalendarOff className="h-5 w-5" />, className: 'border-l-4 border-l-amber-500' },
    { title: 'Pending OT', value: stats?.pendingOvertime ?? 0, icon: <Timer className="h-5 w-5" />, className: 'border-l-4 border-l-rose-500' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description={`Welcome back, ${user?.firstName || 'User'}`} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {isLoading
          ? Array.from({ length: 7 }, (_, i) => <SkeletonCard key={i} />)
          : statCards.map((card) => (
              <StatCard key={card.title} title={card.title} value={card.value} icon={card.icon} className={card.className} />
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              Activity feed will appear here
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              Attendance chart will appear here
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
