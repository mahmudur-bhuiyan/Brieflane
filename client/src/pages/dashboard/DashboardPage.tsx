import { Link } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { IconSparkles } from '../../components/common/icons';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useDashboardQuery } from '../../lib/queries/dashboard';
import { formatRole, isSuperAdmin } from '../../lib/roles';
import { quickLinks } from './constants/quickLinks';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: dashboard } = useDashboardQuery();

  const visibleLinks = quickLinks.filter(
    (link) => !link.adminOnly || isSuperAdmin(user?.role),
  );

  return (
    <AppLayout
      title="Dashboard"
      description="Overview of your workspace and upcoming features."
    >
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="Manage projects and users from one place."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:mb-8">
        <Card className="relative overflow-hidden">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          <p className="text-sm text-muted">Your role</p>
          <p className="mt-2 text-2xl font-semibold text-heading">
            {user ? formatRole(user.role) : '—'}
          </p>
          <p className="mt-3">
            <Badge variant="success">Active session</Badge>
          </p>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
          <p className="text-sm text-muted">Account</p>
          <p className="mt-2 truncate text-lg font-semibold text-heading">{user?.email}</p>
          <p className="mt-1 text-xs text-faint">Signed in and authenticated</p>
        </Card>

        <Card className="relative overflow-hidden md:col-span-2 xl:col-span-1">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
          <p className="text-sm text-muted">Platform status</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <p className="text-base font-semibold text-heading sm:text-lg">
              All systems operational
            </p>
          </div>
          <p className="mt-1 text-xs text-faint">API connected</p>
        </Card>
      </div>

      {dashboard && (
        <Card className="mb-8 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <IconSparkles width={18} height={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-200">Session active</p>
              <p className="mt-1 text-sm text-muted">{dashboard.message}</p>
            </div>
          </div>
        </Card>
      )}

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-faint">
          Quick links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleLinks.map((link) => {
            const card = (
              <Card className="transition hover:border-(--border-strong)">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-subtle text-muted ring-1 ring-(--border)">
                    <link.icon width={18} height={18} />
                  </div>
                  <Badge variant={link.status === 'Available now' ? 'success' : 'neutral'}>
                    {link.status}
                  </Badge>
                </div>
                <h3 className="mt-4 font-semibold text-heading">{link.title}</h3>
                <p className="mt-1 text-sm text-muted">{link.description}</p>
              </Card>
            );

            return link.to ? (
              <Link key={link.title} to={link.to} className="block">
                {card}
              </Link>
            ) : (
              <div key={link.title}>{card}</div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
