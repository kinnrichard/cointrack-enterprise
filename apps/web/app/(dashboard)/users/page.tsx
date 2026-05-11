'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { UserCog, Filter, X, Loader2, Pencil, Trash2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface User {
  id: string; email: string; firstName: string; lastName: string; role: string;
  phone: string | null; isActive: boolean; lastLogin: string | null; createdAt: string;
}

const schema = z.object({
  email: z.string().min(1, 'Username is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(6, 'Min 6 characters').optional().or(z.literal('')),
  role: z.string().default('EMPLOYEE'),
  phone: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 10;
const STATUS_CHIPS = [{ id: 'all', label: 'All' }, { id: 'active', label: 'Active' }, { id: 'inactive', label: 'Inactive' }] as const;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const activeFilterCount = [filterRole].filter(Boolean).length;
  function clearFilters() { setFilterRole(''); setPage(1); }

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', firstName: '', lastName: '', password: '', role: 'EMPLOYEE', phone: '', isActive: true },
    mode: 'onChange',
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['users', page, search, statusFilter, filterRole],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) q.set('search', search);
      if (filterRole) q.set('role', filterRole);
      if (statusFilter === 'active') q.set('isActive', 'true');
      if (statusFilter === 'inactive') q.set('isActive', 'false');
      return (await api.get(`/users?${q}`)).data;
    },
  });

  const users = (response?.data ?? []) as User[];
  const total = response?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: (data: FormData) => { const p: Record<string, any> = { ...data }; if (!p.phone) p.phone = null; return api.post('/users', p); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal(); toast({ title: 'User created' }); },
    onError: (e: any) => toast({ title: 'Error', description: e?.response?.data?.message || 'Failed to create user.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => {
      const p: Record<string, any> = { ...data };
      if (!p.password) delete p.password;
      if (!p.phone) p.phone = null;
      delete p.email; // can't change username
      return api.put(`/users/${id}`, p);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal(); toast({ title: 'User updated' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to update user.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setDeleteTarget(null); toast({ title: 'User deleted' }); },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  function openAdd() { reset({ email: '', firstName: '', lastName: '', password: '', role: 'EMPLOYEE', phone: '', isActive: true }); setEditing(null); setModalOpen(true); }
  function openEdit(u: User) { reset({ email: u.email, firstName: u.firstName, lastName: u.lastName, password: '', role: u.role, phone: u.phone || '', isActive: u.isActive }); setEditing(u); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditing(null); }
  function onSubmit(data: FormData) { if (editing) updateMutation.mutate({ id: editing.id, data }); else createMutation.mutate(data); }
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const columns: Column<User>[] = [
    {
      key: 'lastName', label: 'User', sortable: true,
      render: (_: any, row: User) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.firstName[0]}{row.lastName[0]}</div>
          <div><p className="font-medium truncate">{row.lastName}, {row.firstName}</p><p className="text-xs text-muted-foreground">{row.email}</p></div>
        </div>
      ),
    },
    { key: 'role', label: 'Role', render: (v: string) => <StatusBadge status={v} /> },
    { key: 'phone', label: 'Phone', render: (v: string | null) => v || '-' },
    { key: 'lastLogin', label: 'Last Login', render: (v: string | null) => v ? format(new Date(v), 'MMM d, yyyy hh:mm a') : 'Never' },
    { key: 'isActive', label: 'Status', render: (v: boolean) => <StatusBadge status={v ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions', label: '', className: 'w-[80px]',
      render: (_: any, row: User) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Users" description="Manage system users and access">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">Add User</Button>
      </PageHeader>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Users" value={total} icon={<UserCog className="h-5 w-5" />} />
        <StatCard title="Active" value={users.filter(u => u.isActive).length} icon={<UserCog className="h-5 w-5" />} />
        <StatCard title="Inactive" value={users.filter(u => !u.isActive).length} icon={<UserCog className="h-5 w-5" />} />
      </div>
      <DataTable<User> columns={columns} data={users} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search users..." onRowClick={openEdit} isLoading={isLoading}
        emptyMessage="No users found." emptyIcon={<UserCog className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-3 flex-wrap">
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild><Button variant="outline" size="sm" className="relative"><Filter className="h-3.5 w-3.5 mr-1.5" /> Filters{activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}</Button></PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50"><p className="text-sm font-semibold">Filters</p>{activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-3 w-3" /> Clear</button>}</div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Role</Label>
                    <Select value={filterRole || 'ALL'} onValueChange={(v) => { setFilterRole(v === 'ALL' ? '' : v); setPage(1); }}>
                      <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="All roles" /></SelectTrigger>
                      <SelectContent><SelectItem value="ALL">All roles</SelectItem><SelectItem value="SUPERADMIN">Super Admin</SelectItem><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="HR">HR</SelectItem><SelectItem value="PAYROLL">Payroll</SelectItem><SelectItem value="EMPLOYEE">Employee</SelectItem></SelectContent>
                    </Select>
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

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">{editing ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">{editing ? 'Update user details.' : 'Create a new system user.'}</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Username <span className="text-red-500">*</span></Label>
                  <Input {...register('email')} disabled={!!editing} className={cn(errors.email && 'border-red-300')} />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{editing ? 'New Password' : 'Password'} {!editing && <span className="text-red-500">*</span>}</Label>
                  <Input type="password" {...register('password')} placeholder={editing ? 'Leave blank to keep' : ''} className={cn(errors.password && 'border-red-300')} />
                  {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">First Name <span className="text-red-500">*</span></Label>
                  <Input {...register('firstName')} className={cn(errors.firstName && 'border-red-300')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Last Name <span className="text-red-500">*</span></Label>
                  <Input {...register('lastName')} className={cn(errors.lastName && 'border-red-300')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Role</Label>
                  <Controller control={control} name="role" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="SUPERADMIN">Super Admin</SelectItem><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="HR">HR</SelectItem><SelectItem value="PAYROLL">Payroll</SelectItem><SelectItem value="EMPLOYEE">Employee</SelectItem></SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Phone</Label>
                  <Input {...register('phone')} />
                </div>
              </div>
              {editing && (
                <Controller control={control} name="isActive" render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label className="text-sm">Active</Label>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </div>
                )} />
              )}
            </form>
          </div>
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={closeModal} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="user-form" disabled={!isValid || isSubmitting} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete User" description={`Are you sure you want to delete "${deleteTarget?.firstName} ${deleteTarget?.lastName}"?`}
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
