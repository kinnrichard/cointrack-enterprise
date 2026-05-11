'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Bell } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { DataTable, Column } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Notification {
  id: string; type: string; title: string; message: string;
  link: string | null; isRead: boolean; createdAt: string;
}

const PAGE_SIZE = 20;
const STATUS_CHIPS = [
  { id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'read', label: 'Read' },
] as const;

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: response, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      return (await api.get(`/notifications?${q}`)).data;
    },
  });

  const notifications = (response?.data ?? []) as Notification[];
  const total = response?.total ?? 0;
  const filtered = statusFilter === 'all' ? notifications : statusFilter === 'unread' ? notifications.filter(n => !n.isRead) : notifications.filter(n => n.isRead);

  const columns: Column<Notification>[] = [
    { key: 'createdAt', label: 'Time', sortable: true, className: 'w-[160px]', render: (v: string) => format(new Date(v), 'MMM d, yyyy hh:mm a') },
    { key: 'type', label: 'Type', className: 'w-[120px]', render: (v: string) => <StatusBadge status={v} /> },
    { key: 'title', label: 'Title', render: (v: string, row: Notification) => <span className={cn(!row.isRead && 'font-semibold')}>{v}</span> },
    { key: 'message', label: 'Message', render: (v: string) => <span className="text-sm text-muted-foreground line-clamp-1">{v}</span> },
    { key: 'isRead', label: 'Status', className: 'w-[80px]', render: (v: boolean) => v ? <span className="text-xs text-muted-foreground">Read</span> : <span className="text-xs font-medium text-primary">New</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notifications" description="View system notifications and alerts" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total" value={total} icon={<Bell className="h-5 w-5" />} />
        <StatCard title="Unread" value={notifications.filter(n => !n.isRead).length} icon={<Bell className="h-5 w-5" />} />
        <StatCard title="Read" value={notifications.filter(n => n.isRead).length} icon={<Bell className="h-5 w-5" />} />
      </div>
      <DataTable<Notification> columns={columns} data={filtered} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} isLoading={isLoading} emptyMessage="No notifications."
        emptyIcon={<Bell className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-1.5">
            {STATUS_CHIPS.map(c => <button key={c.id} onClick={() => setStatusFilter(c.id)} className={cn('shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors', statusFilter === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-accent')}>{c.label}</button>)}
          </div>
        }
      />
    </div>
  );
}
