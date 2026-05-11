'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Pencil, Trash2, Users, Loader2 } from 'lucide-react';
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

interface Company {
  id: string; name: string; code: string | null; address: string | null;
  city: string | null; province: string | null; postalCode: string | null;
  email: string | null; phoneNumber: string | null; website: string | null;
  description: string | null; tinNumber: string | null; sssNumber: string | null;
  philhealthNumber: string | null; pagibigNumber: string | null;
  isActive: boolean; _count: { employees: number };
}

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  province: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  tinNumber: z.string().optional().or(z.literal('')),
  sssNumber: z.string().optional().or(z.literal('')),
  philhealthNumber: z.string().optional().or(z.literal('')),
  pagibigNumber: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 10;
const STATUS_CHIPS = [{ id: 'all', label: 'All' }, { id: 'active', label: 'Active' }, { id: 'inactive', label: 'Inactive' }] as const;

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [formTab, setFormTab] = useState<'basic' | 'address' | 'government'>('basic');

  const { register, handleSubmit, reset, control, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', address: '', city: '', province: '', postalCode: '', email: '', phoneNumber: '', website: '', description: '', tinNumber: '', sssNumber: '', philhealthNumber: '', pagibigNumber: '', isActive: true },
    mode: 'onChange',
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['companies', page, search],
    queryFn: async () => {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) q.set('search', search);
      return (await api.get(`/companies?${q}`)).data;
    },
  });

  const companies = (response?.data ?? []) as Company[];
  const total = response?.total ?? 0;
  const filtered = statusFilter === 'all' ? companies : statusFilter === 'active' ? companies.filter(c => c.isActive) : companies.filter(c => !c.isActive);
  const activeCount = companies.filter(c => c.isActive).length;
  const totalEmployees = companies.reduce((s, c) => s + c._count.employees, 0);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => { const p: Record<string, any> = { ...data }; for (const k of Object.keys(p)) if (p[k] === '') p[k] = null; return api.post('/companies', p); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['companies'] }); closeModal(); toast({ title: 'Company created' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to create company.', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => { const p: Record<string, any> = { ...data }; for (const k of Object.keys(p)) if (p[k] === '') p[k] = null; return api.put(`/companies/${id}`, p); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['companies'] }); closeModal(); toast({ title: 'Company updated' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to update company.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['companies'] }); setDeleteTarget(null); toast({ title: 'Company deleted' }); },
    onError: () => toast({ title: 'Error', description: 'Failed to delete company.', variant: 'destructive' }),
  });

  function openAdd() {
    reset({ name: '', code: '', address: '', city: '', province: '', postalCode: '', email: '', phoneNumber: '', website: '', description: '', tinNumber: '', sssNumber: '', philhealthNumber: '', pagibigNumber: '', isActive: true });
    setEditing(null); setFormTab('basic'); setModalOpen(true);
  }

  function openEdit(c: Company) {
    reset({
      name: c.name, code: c.code || '', address: c.address || '', city: c.city || '',
      province: c.province || '', postalCode: c.postalCode || '', email: c.email || '',
      phoneNumber: c.phoneNumber || '', website: c.website || '', description: c.description || '',
      tinNumber: c.tinNumber || '', sssNumber: c.sssNumber || '',
      philhealthNumber: c.philhealthNumber || '', pagibigNumber: c.pagibigNumber || '',
      isActive: c.isActive,
    });
    setEditing(c); setFormTab('basic'); setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }
  function onSubmit(data: FormData) { if (editing) updateMutation.mutate({ id: editing.id, data }); else createMutation.mutate(data); }
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const columns: Column<Company>[] = [
    {
      key: 'name', label: 'Company', sortable: true,
      render: (_: any, row: Company) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-red-600 text-white text-xs font-bold">{row.name.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{row.name}</p>
            {row.code && <p className="text-xs text-muted-foreground">{row.code}</p>}
          </div>
        </div>
      ),
    },
    { key: 'email', label: 'Email', render: (v: any) => v || '-' },
    { key: 'phoneNumber', label: 'Phone', render: (v: any) => v || '-' },
    { key: 'city', label: 'City', render: (v: any) => v || '-' },
    { key: '_count.employees', label: 'Employees', sortable: true, render: (v: number) => v },
    { key: 'isActive', label: 'Status', render: (v: boolean) => <StatusBadge status={v ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions', label: '', className: 'w-[80px]',
      render: (_: any, row: Company) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}}>
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Companies" description="Manage client companies and their information">
        <Button onClick={openAdd} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90">Add Company</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Companies" value={total} icon={<Building2 className="h-5 w-5" />} />
        <StatCard title="Active" value={activeCount} icon={<Building2 className="h-5 w-5" />} />
        <StatCard title="Inactive" value={total - activeCount} icon={<Building2 className="h-5 w-5" />} />
        <StatCard title="Total Employees" value={totalEmployees} icon={<Users className="h-5 w-5" />} />
      </div>

      <DataTable<Company> columns={columns} data={filtered} total={total} page={page} limit={PAGE_SIZE}
        onPageChange={setPage} onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search companies..." onRowClick={openEdit} isLoading={isLoading}
        emptyMessage="No companies found." emptyIcon={<Building2 className="h-12 w-12 text-muted-foreground/40 mb-3" />}
        toolbar={
          <div className="flex items-center gap-1.5">
            {STATUS_CHIPS.map(c => <button key={c.id} onClick={() => { setStatusFilter(c.id); setPage(1); }}
              className={cn('shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors', statusFilter === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:bg-accent')}
            >{c.label}</button>)}
          </div>
        }
      />

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-5 pb-4 bg-muted/50 border-b rounded-t-2xl">
            <DialogTitle className="text-xl font-semibold">{editing ? 'Edit Company' : 'Add New Company'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">{editing ? 'Update company information.' : 'Fill in the details to add a new company.'}</DialogDescription>
          </div>

          <div className="px-6 pt-3 bg-muted/30 border-b">
            <div className="flex gap-1">
              {(['basic', 'address', 'government'] as const).map(tab => (
                <button key={tab} type="button" onClick={() => setFormTab(tab)}
                  className={cn('px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px',
                    formTab === tab ? 'text-foreground border-primary bg-background' : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-background/50'
                  )}>
                  {tab === 'basic' && 'Basic Info'}
                  {tab === 'address' && 'Address'}
                  {tab === 'government' && 'Government IDs'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form id="company-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {formTab === 'basic' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Company Name <span className="text-red-500">*</span></Label>
                      <Input {...register('name')} className={cn(errors.name && 'border-red-300 focus-visible:ring-red-200')} />
                      {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Code</Label>
                      <Input {...register('code')} placeholder="e.g., ACME" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Email</Label>
                      <Input type="email" {...register('email')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Phone</Label>
                      <Input {...register('phoneNumber')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Website</Label>
                      <Input {...register('website')} placeholder="https://" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Description</Label>
                    <Textarea {...register('description')} placeholder="About this company..." className="min-h-[80px]" />
                  </div>
                  <Controller control={control} name="isActive" render={({ field }) => (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <Label className="text-sm">Active</Label>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )} />
                </>
              )}

              {formTab === 'address' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Address</Label>
                    <Input {...register('address')} placeholder="Street address" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">City</Label>
                      <Input {...register('city')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Province</Label>
                      <Input {...register('province')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Postal Code</Label>
                      <Input {...register('postalCode')} />
                    </div>
                  </div>
                </>
              )}

              {formTab === 'government' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">TIN Number</Label>
                      <Input {...register('tinNumber')} placeholder="XXX-XXX-XXX-XXX" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">SSS Number</Label>
                      <Input {...register('sssNumber')} placeholder="XX-XXXXXXX-X" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">PhilHealth Number</Label>
                      <Input {...register('philhealthNumber')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Pag-IBIG Number</Label>
                      <Input {...register('pagibigNumber')} />
                    </div>
                  </div>
                </>
              )}
            </form>
          </div>

          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <button type="button" onClick={closeModal} className="text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors">Cancel</button>
            <Button type="submit" form="company-form" disabled={!isValid || isSubmitting} className="bg-gradient-to-r from-red-700 to-red-600 text-white hover:opacity-90 rounded-lg">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Company'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Company" description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete" variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
