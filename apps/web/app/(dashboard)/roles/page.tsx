'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Pencil, Trash2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable, Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Role {
  id: string; name: string; displayName: string | null; description: string | null;
  isSystem: boolean; permissions?: { id: string; module: string; action: string }[];
}

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  displayName: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 10;

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema), defaultValues: { name: '', displayName: '', description: '' }, mode: 'onChange',
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['roles', page, search],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) q.set('search', search);
      return (await api.get(`/roles?${q}`)).data;
    },
  });

  const roles = (response?.data ?? []) as Role[];
  const total = response?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: (data: FormData) => { const p: Record<string, any> = { ...data }; for (const k of Object.keys(p)) if (p[k] === '') p[k] = null; return api.post('/roles', p); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); closeModal(); toast({ title: 'Role created' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to create role.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => { const p: Record<string, any> = { ...data }; for (const k of Object.keys(p)) if (p[k] === '') p[k] = null; return api.put(`/roles/${id}`, p); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); closeModal(); toast({ title: 'Role updated' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to update role.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setDeleteTarget(null); toast({ title: 'Role deleted' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to delete role.', variant: 'destructive' }),
  });

  function openAdd() { reset({ name: '', displayName: '', description: '' }); setEditing(null); setModalOpen(true); }
  function openEdit(role: Role) { reset({ name: role.name, displayName: role.displayName || '', description: role.description || '' }); setEditing(role); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditing(null); }
  function onSubmit(data: FormData) { if (editing) updateMutation.mutate({ id: editing.id, data }); else createMutation.mutate(data); }
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const columns: Column<Role>[] = [
    {
      key: 'name', label: 'Role', sortable: true,
      render: (_: any, row: Role) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.name.slice(0, 2).toUpperCase()}</div>
          <div><p className="font-medium truncate">{row.displayName || row.name}</p><p className="text-xs text-muted-foreground">{row.name}</p></div>
        </div>
      ),
    },
    { key: 'description', label: 'Description', render: (v: string | null) => v || '-' },
    { key: 'isSystem', label: 'Type', render: (v: boolean) => v ? <StatusBadge status="SYSTEM" variant="info" /> : <StatusBadge status="CUSTOM" variant="secondary" /> },
    {
      key: 'actions', label: '', className: 'w-[80px]',
      render: (_: any, row: Role) => row.isSystem ? null : (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Roles & Permissions" description="Manage user roles and access control">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">Add Role</Button>
      </PageHeader>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Roles" value={total} icon={<Shield className="h-5 w-5" />} />
        <StatCard title="System" value={roles.filter(r => r.isSystem).length} icon={<Shield className="h-5 w-5" />} />
        <StatCard title="Custom" value={roles.filter(r => !r.isSystem).length} icon={<Shield className="h-5 w-5" />} />
      </div>
      <DataTable<Role> columns={columns} data={roles} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search roles..." onRowClick={openEdit} isLoading={isLoading}
        emptyMessage="No roles found." emptyIcon={<Shield className="h-12 w-12 text-muted-foreground/40 mb-3" />}
      />
      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">{editing ? 'Edit Role' : 'Add New Role'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">{editing ? 'Update role details.' : 'Create a new role for the system.'}</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="role-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Name <span className="text-red-500">*</span></Label>
                  <Input {...register('name')} placeholder="e.g., HR_MANAGER" className={cn(errors.name && 'border-red-300 focus-visible:ring-red-200')} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Display Name</Label>
                  <Input {...register('displayName')} placeholder="e.g., HR Manager" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Description</Label>
                <Textarea {...register('description')} placeholder="Role description..." className="min-h-[80px]" />
              </div>
            </form>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={closeModal} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="role-form" disabled={!isValid || isSubmitting} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Role'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Role" description={`Are you sure you want to delete "${deleteTarget?.displayName || deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
