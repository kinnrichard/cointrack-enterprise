'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Pencil, Trash2, Users, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Site {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  isActive: boolean;
  _count: { employees: number };
}

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 10;

const STATUS_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
] as const;

export default function SitesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', address: '', isActive: true },
    mode: 'onChange',
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['sites', page, search],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) q.set('search', search);
      return (await api.get(`/sites?${q}`)).data;
    },
  });

  const sites = (response?.data ?? []) as Site[];
  const total = response?.total ?? 0;

  const filtered = statusFilter === 'all' ? sites
    : statusFilter === 'active' ? sites.filter((s) => s.isActive)
    : sites.filter((s) => !s.isActive);

  const activeCount = sites.filter((s) => s.isActive).length;
  const totalEmployees = sites.reduce((sum, s) => sum + s._count.employees, 0);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: Record<string, any> = { ...data };
      for (const key of Object.keys(payload)) if (payload[key] === '') payload[key] = null;
      return api.post('/sites', payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sites'] }); closeModal(); toast({ title: 'Site created' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to create site.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => {
      const payload: Record<string, any> = { ...data };
      for (const key of Object.keys(payload)) if (payload[key] === '') payload[key] = null;
      return api.put(`/sites/${id}`, payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sites'] }); closeModal(); toast({ title: 'Site updated' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to update site.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sites/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sites'] }); setDeleteTarget(null); toast({ title: 'Site deleted' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to delete site.', variant: 'destructive' }),
  });

  function openAdd() {
    reset({ name: '', code: '', address: '', isActive: true });
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(site: Site) {
    reset({ name: site.name, code: site.code || '', address: site.address || '', isActive: site.isActive });
    setEditing(site);
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }

  function onSubmit(data: FormData) {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const columns: Column<Site>[] = [
    {
      key: 'name',
      label: 'Site / Branch',
      sortable: true,
      render: (_: any, row: Site) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">
            {row.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{row.name}</p>
            {row.code && <p className="text-xs text-muted-foreground">{row.code}</p>}
          </div>
        </div>
      ),
    },
    { key: 'address', label: 'Address', render: (val: any) => val || '-' },
    { key: '_count.employees', label: 'Employees', sortable: true, render: (val: number) => val },
    {
      key: 'isActive',
      label: 'Status',
      render: (val: boolean) => <StatusBadge status={val ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'actions',
      label: '',
      className: 'w-[80px]',
      render: (_: any, row: Site) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Sites" description="Manage work sites and branch locations">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">Add Site</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Sites" value={total} icon={<MapPin className="h-5 w-5" />} />
        <StatCard title="Active" value={activeCount} icon={<MapPin className="h-5 w-5" />} />
        <StatCard title="Total Employees" value={totalEmployees} icon={<Users className="h-5 w-5" />} />
      </div>

      <DataTable<Site>
        columns={columns} data={filtered} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search sites..." onRowClick={openEdit} isLoading={isLoading}
        emptyMessage="No sites found." emptyIcon={<MapPin className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-1.5">
            {STATUS_CHIPS.map((chip) => (
              <button key={chip.id} onClick={() => { setStatusFilter(chip.id); setPage(1); }}
                className={cn('shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
                  statusFilter === chip.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-accent'
                )}>{chip.label}</button>
            ))}
          </div>
        }
      />

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">{editing ? 'Edit Site' : 'Add New Site'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">{editing ? 'Update site information.' : 'Fill in the details to create a new site.'}</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="site-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Name <span className="text-red-500">*</span></Label>
                  <Input {...register('name')} className={cn(errors.name && 'border-red-300 focus-visible:ring-red-200')} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Code</Label>
                  <Input {...register('code')} placeholder="e.g., HQ, BR-01" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Address</Label>
                <Input {...register('address')} placeholder="Full address" />
              </div>
              <Controller control={control} name="isActive" render={({ field }) => (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-sm">Active</Label>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )} />
            </form>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={closeModal} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="site-form" disabled={!isValid || isSubmitting} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Site'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Site" description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
