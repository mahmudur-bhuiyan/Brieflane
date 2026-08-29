import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { APP_NAME } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import {
  IconFolder,
  IconFileText,
  IconLayoutDashboard,
  IconLogOut,
  IconMenu,
  IconSettings,
  IconShield,
  IconUser,
  IconUsers,
  IconX,
} from '../common/icons';
import { ThemeToggle } from '../common/ThemeToggle';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { formatRole, isSuperAdmin } from '../../lib/roles';

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
  { to: '/users', label: 'Users', icon: <IconUsers />, adminOnly: true },
  { to: '/projects', label: 'Projects', icon: <IconFolder /> },
  { to: '/reports', label: 'Report archive', icon: <IconFileText /> },
  { to: '/profile', label: 'Profile', icon: <IconUser /> },
  { to: '/settings', label: 'Settings', icon: <IconSettings />, adminOnly: true },
];

function BrandMark() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-900/40">
      <span className="text-sm font-bold text-white">B</span>
    </div>
  );
}

function BrandText() {
  return (
    <div className="min-w-0 leading-tight">
      <p className="truncate text-sm font-semibold text-heading">{APP_NAME}</p>
      <p className="truncate text-xs text-faint">Admin Panel</p>
    </div>
  );
}

function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
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

function SidebarNav({
  user,
  visibleNav,
  onNavigate,
  onLogout,
}: {
  user: ReturnType<typeof useAuth>['user'];
  visibleNav: NavItem[];
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
          Menu
        </p>
        {visibleNav.map((item) => (
          <NavItemLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-subtle p-4">
        <div className="flex items-center gap-3 rounded-xl bg-subtle p-3 ring-1 ring-(--border)">
          <Avatar name={user?.name ?? null} email={user?.email ?? null} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-heading">
              {user?.name || user?.email}
            </p>
            <p className="truncate text-xs text-faint">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-(--hover-bg) hover:text-heading"
          >
            <IconLogOut width={18} height={18} />
          </button>
        </div>
      </div>
    </>
  );
}

function MobileSidebarClose({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex justify-end border-b border-subtle px-3 py-2 xl:hidden">
      <Button variant="ghost" size="sm" type="button" onClick={onClose} aria-label="Close menu">
        <IconX width={18} height={18} />
      </Button>
    </div>
  );
}

function UserMenuDropdown({
  user,
  onLogout,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        size="sm"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <IconUser width={18} height={18} />
      </Button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(16rem,calc(100vw-2rem))] rounded-2xl border border-subtle bg-(--surface-raised) p-2 shadow-2xl">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-subtle p-3 ring-1 ring-(--border)">
            <Avatar name={user.name} email={user.email} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-heading">
                {user.name || 'No name set'}
              </p>
              <p className="truncate text-xs text-faint">{user.email}</p>
            </div>
          </div>

          <nav className="space-y-1">
            <Link
              to="/profile"
              onClick={closeMenu}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-(--hover-bg) hover:text-heading"
            >
              <IconUser width={18} height={18} />
              Profile
            </Link>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                onLogout();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-(--hover-bg) hover:text-heading"
            >
              <IconLogOut width={18} height={18} />
              Logout
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

function TopBar({
  title,
  description,
  user,
  showMenuButton,
  onOpenMenu,
  onLogout,
}: {
  title: string;
  description?: string;
  user: ReturnType<typeof useAuth>['user'];
  showMenuButton?: boolean;
  onOpenMenu?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="hidden h-full w-64 shrink-0 items-center gap-3 border-r border-subtle px-5 xl:flex">
        <BrandMark />
        <BrandText />
      </div>

      <div className="flex h-full min-w-0 flex-1 items-center justify-between gap-3 px-4 sm:px-5 xl:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {showMenuButton && onOpenMenu && (
            <Button
              variant="secondary"
              size="sm"
              type="button"
              className="shrink-0 xl:hidden"
              onClick={onOpenMenu}
              aria-label="Open menu"
            >
              <IconMenu width={18} height={18} />
            </Button>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-medium uppercase tracking-wider text-faint">
              {title}
            </p>
            {description && (
              <p className="truncate text-sm text-muted">{description}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {user && (
            <div className="hidden items-center gap-2 rounded-full bg-subtle px-3 py-1.5 text-xs text-muted ring-1 ring-(--border) sm:flex">
              <IconShield width={14} height={14} className="text-emerald-500" />
              <span className="max-w-40 truncate">{formatRole(user.role)}</span>
            </div>
          )}
          <ThemeToggle />
          {user && <UserMenuDropdown user={user} onLogout={onLogout} />}
        </div>
      </div>
    </>
  );
}

export function AppLayout({ title, description, children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNav = navItems.filter((item) => !item.adminOnly || isSuperAdmin(user?.role));

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  async function handleLogout() {
    setSidebarOpen(false);
    await logout();
    navigate('/login');
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-dvh w-full min-w-0 bg-app">
      <header className="header-bar fixed inset-x-0 top-0 z-30 flex h-16 shrink-0 backdrop-blur-xl">
        <TopBar
          title={title}
          description={description}
          user={user}
          showMenuButton
          onOpenMenu={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />
      </header>

      <div className="flex w-full min-h-[calc(100dvh-4rem)] pt-16">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="overlay-backdrop fixed inset-0 top-16 z-40 xl:hidden"
            onClick={closeSidebar}
          />
        )}

        <aside
          className={`sidebar-gradient fixed bottom-0 left-0 top-16 z-50 flex w-[min(100vw-2rem,18rem)] flex-col border-r border-subtle transition-transform duration-200 ease-out xl:top-16 xl:z-20 xl:w-64 xl:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'
          }`}
        >
          <MobileSidebarClose onClose={closeSidebar} />
          <SidebarNav
            user={user}
            visibleNav={visibleNav}
            onNavigate={closeSidebar}
            onLogout={handleLogout}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col xl:pl-64">
          <main className="flex-1 px-4 py-5 sm:px-5 sm:py-6 xl:px-6 xl:py-8">
            <div className="page-shell">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
