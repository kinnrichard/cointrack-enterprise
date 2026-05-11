'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  MapPin,
  CalendarCheck,
  Clock,
  Calendar,
  Banknote,
  FileText,
  DollarSign,
  CalendarOff,
  CalendarPlus,
  Timer,
  CreditCard,
  Landmark,
  FileBarChart,
  Receipt,
  Gift,
  ScrollText,
  UserCog,
  Shield,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'HUMAN RESOURCES',
    items: [
      { label: 'Employees', href: '/employees', icon: Users },
      { label: 'Companies', href: '/companies', icon: Building2 },
      { label: 'Sites', href: '/sites', icon: MapPin },
      { label: 'Departments', href: '/departments', icon: Building2 },
      { label: 'Positions', href: '/positions', icon: Briefcase },
      { label: 'Rates', href: '/rates', icon: DollarSign },
      { label: 'Schedules', href: '/schedules', icon: Calendar },
      { label: 'Org Chart', href: '/org-chart', icon: Users },
    ],
  },
  {
    title: 'TIME & ATTENDANCE',
    items: [
      { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
      { label: 'Timekeeping', href: '/timekeeping', icon: Clock },
    ],
  },
  {
    title: 'PAYROLL',
    items: [
      { label: 'Payroll', href: '/payroll', icon: Banknote },
      { label: 'Payroll Register', href: '/payroll-register', icon: FileText },
    ],
  },
  {
    title: 'LEAVE & OVERTIME',
    items: [
      { label: 'Leave Applications', href: '/leave-applications', icon: CalendarOff },
      { label: 'Leave Credits', href: '/leave-credits', icon: CalendarPlus },
      { label: 'Overtime Applications', href: '/overtime', icon: Timer },
    ],
  },
  {
    title: 'DEDUCTIONS',
    items: [
      { label: 'Deductions', href: '/deductions', icon: CreditCard },
      { label: 'Loans', href: '/loans', icon: Landmark },
    ],
  },
  {
    title: 'REPORTS',
    items: [
      { label: 'Government Remittance', href: '/government-remittance', icon: FileBarChart },
      { label: 'BIR Reports', href: '/bir-reports', icon: Receipt },
      { label: '13th Month Pay', href: '/thirteenth-month', icon: Gift },
      { label: 'Audit Trail', href: '/audit-trail', icon: ScrollText },
    ],
  },
  {
    title: 'HOLIDAYS',
    items: [
      { label: 'Holidays', href: '/holidays', icon: CalendarPlus },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { label: 'Users', href: '/users', icon: UserCog },
      { label: 'Roles & Permissions', href: '/roles', icon: Shield },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: Readonly<SidebarProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const initials = user
    ? getInitials(user.firstName, user.lastName)
    : 'U';

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-4">
          <div className="flex items-center overflow-hidden">
            {collapsed ? (
              <span className="font-bold text-sidebar-foreground text-sm shrink-0">CT</span>
            ) : (
              <Image
                src="/assets/cointrack-no-bg.png"
                alt="CoinTrack"
                width={200}
                height={50}
                className="brightness-0 invert shrink-0"
                priority
              />
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigation.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <h3 className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {section.title}
                </h3>
              )}
              {collapsed && <div className="mb-1" />}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;

                  let navItemStateClass: string;
                  if (item.disabled) navItemStateClass = 'opacity-40 cursor-not-allowed';
                  else if (isActive) navItemStateClass = 'bg-sidebar-accent text-sidebar-accent-foreground';
                  else navItemStateClass = 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground';

                  const content = (
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        collapsed && 'justify-center px-0',
                        navItemStateClass
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" size={18} />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>
                  );

                  const tooltipLabel = item.disabled
                    ? `${item.label} - Coming soon`
                    : item.label;

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          {item.disabled ? (
                            <div>{content}</div>
                          ) : (
                            <Link href={item.href}>{content}</Link>
                          )}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {tooltipLabel}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  if (item.disabled) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <div>{content}</div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          Coming soon
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Link key={item.href} href={item.href}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Card */}
        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg px-2.5 py-2',
              collapsed && 'justify-center px-0'
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/50">
                  {user?.role?.replaceAll('_', ' ') || 'Role'}
                </p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className={cn(
                  'mt-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors',
                  collapsed && 'justify-center px-0'
                )}
              >
                <LogOut className="h-4.5 w-4.5 shrink-0" size={18} />
                {!collapsed && <span>Sign out</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Sign out</TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
