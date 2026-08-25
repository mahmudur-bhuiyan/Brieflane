import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { APP_NAME } from '../constants';
import { useAuth } from '../context/AuthContext';
import {
  IconFileText,
  IconFolder,
  IconLayoutDashboard,
  IconLogOut,
  IconShield,
  IconUsers,
} from './icons';
import { ThemeToggle } from './ThemeToggle';
import { Avatar } from './ui/Avatar';
import { formatRole, isSuperAdmin } from '../lib/roles';

type AppLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <IconLayoutDashboard />, end: true },
  { to: '/projects', label: 'Projects', icon: <IconFolder /> },
  { to: '/users', label: 'Users', icon: <IconUsers />, adminOnly: true },
];

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive ? 'nav-link-active' : 'nav-link-inactive'
        }`
      }
    >
      <span className="opacity-80 group-hover:opacity-100">{item.icon}</span>
      {item.label}
    </NavLink>
  );
}

export function AppLayout({ title, description, children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const visibleNav = navItems.filter((item) => !item.adminOnly || isSuperAdmin(user?.role));

  return (
    <div className="flex min-h-screen bg-app">
      <aside className="sidebar-gradient fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-subtle">
        <div className="flex h-16 items-center gap-3 border-b border-subtle px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-900/40">
            <span className="text-sm font-bold text-white">B</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-heading">{APP_NAME}</p>
            <p className="text-xs text-faint">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
            Menu
          </p>
          {visibleNav.map((item) => (
            <NavItemLink key={item.to} item={item} />
          ))}

          <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
            Coming soon
          </p>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-disabled">
            <IconFileText className="opacity-50" />
            Reports
          </div>
        </nav>

        <div className="border-t border-subtle p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-subtle p-3 ring-1 ring-[var(--border)]">
            <Avatar name={user?.name ?? null} email={user?.email ?? ''} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-heading">
                {user?.name || user?.email}
              </p>
              <p className="truncate text-xs text-faint">{user?.email}</p>
            </div>
          </div>
          <ThemeToggle className="mb-2 w-full justify-start" showLabel />
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-[var(--hover-bg)] hover:text-[var(--text-heading)]"
          >
            <IconLogOut />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pl-64">
        <header className="header-bar sticky top-0 z-20 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-faint">{title}</p>
              {description && <p className="text-sm text-muted">{description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <div className="hidden items-center gap-2 rounded-full bg-subtle px-3 py-1.5 text-xs text-muted ring-1 ring-[var(--border)] sm:flex">
                  <IconShield width={14} height={14} className="text-emerald-500" />
                  {formatRole(user.role)}
                </div>
              )}
              <ThemeToggle className="sm:hidden" />
            </div>
          </div>
        </header>

        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
