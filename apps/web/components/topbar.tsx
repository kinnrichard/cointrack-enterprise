'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { getInitials } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/breadcrumbs';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Bell,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const pathLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/departments': 'Departments',
  '/positions': 'Positions',
  '/sites': 'Sites',
  '/attendance': 'Attendance',
  '/timekeeping': 'Timekeeping',
  '/schedules': 'Schedules',
  '/payroll': 'Payroll',
  '/payroll-register': 'Payroll Register',
  '/rates': 'Rates',
  '/leave-applications': 'Leave Applications',
  '/leave-credits': 'Leave Credits',
  '/overtime': 'Overtime Applications',
  '/deductions': 'Deductions',
  '/loans': 'Loans',
  '/government-remittance': 'Government Remittance',
  '/bir-reports': 'BIR Reports',
  '/thirteenth-month': '13th Month Pay',
  '/holidays': 'Holidays',
  '/users': 'Users',
  '/roles': 'Roles & Permissions',
  '/audit-trail': 'Audit Trail',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
};

function getPageLabel(pathname: string): string {
  if (pathLabels[pathname]) return pathLabels[pathname];
  const base = '/' + (pathname.split('/').find(Boolean) ?? '');
  return pathLabels[base] || 'Page';
}

interface TopbarProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export function Topbar({
  onToggleSidebar,
  sidebarCollapsed,
}: Readonly<TopbarProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();

  const pageLabel = getPageLabel(pathname);
  const initials = user ? getInitials(user.firstName, user.lastName) : 'U';

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/notifications/unread-count'),
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.data?.count || 0;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6">
      {/* Left: Toggle + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>

        <Breadcrumbs
          items={[
            { label: 'Home', href: '/dashboard' },
            { label: pageLabel },
          ]}
        />
      </div>

      {/* Right: Actions */}
      <div className="ml-auto flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => router.push('/notifications')}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </div>
              <span className="hidden md:inline-block text-sm font-medium">
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || ''}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
