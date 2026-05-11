'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase, Pencil, Trash2, Users, Loader2 } from 'lucide-react';
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
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Position {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  _count: { employees: number };
}

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 10;

const STATUS_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
] as const;

export default function PositionsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', description: '', isActive: true },
    mode: 'onChange',
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['positions', page, search],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) q.set('search', search);
      return (await api.get(`/positions?${q}`)).data;
    },
  });

  const positions = (response?.data ?? []) as Position[];
  const total = response?.total ?? 0;

  const filtered = statusFilter === 'all' ? positions
    : statusFilter === 'active' ? positions.filter((p) => p.isActive)
    : positions.filter((p) => !p.isActive);

  const activeCount = positions.filter((p) => p.isActive).length;
  const totalEmployees = positions.reduce((sum, p) => sum + p._count.employees, 0);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: Record<string, any> = { ...data };
      for (const key of Object.keys(payload)) if (payload[key] === '') payload[key] = null;
      return api.post('/positions', payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['positions'] }); closeModal(); toast({ title: 'Position created' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to create position.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => {
      const payload: Record<string, any> = { ...data };
      for (const key of Object.keys(payload)) if (payload[key] === '') payload[key] = null;
      return api.put(`/positions/${id}`, payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['positions'] }); closeModal(); toast({ title: 'Position updated' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to update position.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/positions/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['positions'] }); setDeleteTarget(null); toast({ title: 'Position deleted' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to delete position.', variant: 'destructive' }),
  });

  function openAdd() {
    reset({ name: '', code: '', description: '', isActive: true });
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(pos: Position) {
    reset({ name: pos.name, code: pos.code || '', description: pos.description || '', isActive: pos.isActive });
    setEditing(pos);
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }

  function onSubmit(data: FormData) {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const columns: Column<Position>[] = [
    {
      key: 'name',
      label: 'Position',
      sortable: true,
      render: (_: any, row: Position) => (
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
    { key: 'description', label: 'Description', render: (val: any) => val || '-' },
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
      render: (_: any, row: Position) => (
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
      <PageHeader title="Positions" description="Manage job positions and titles">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">Add Position</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Positions" value={total} icon={<Briefcase className="h-5 w-5" />} />
        <StatCard title="Active" value={activeCount} icon={<Briefcase className="h-5 w-5" />} />
        <StatCard title="Total Employees" value={totalEmployees} icon={<Users className="h-5 w-5" />} />
      </div>

      <DataTable<Position>
        columns={columns} data={filtered} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search positions..." onRowClick={openEdit} isLoading={isLoading}
        emptyMessage="No positions found." emptyIcon={<Briefcase className="h-12 w-12 text-muted-foreground/40 mb-3" />}
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
            <DialogTitle className="text-xl font-semibold">{editing ? 'Edit Position' : 'Add New Position'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">{editing ? 'Update position information.' : 'Fill in the details to create a new position.'}</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="pos-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Name <span className="text-red-500">*</span></Label>
                  <Input {...register('name')} className={cn(errors.name && 'border-red-300 focus-visible:ring-red-200')} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Code</Label>
                  <Input {...register('code')} placeholder="e.g., MGR, DEV" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Description</Label>
                <Textarea {...register('description')} placeholder="Brief description..." className="min-h-[80px]" />
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
            <Button type="submit" form="pos-form" disabled={!isValid || isSubmitting} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Position'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Position" description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
