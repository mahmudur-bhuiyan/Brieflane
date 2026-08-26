import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { APP_NAME } from '../../constants';
import { IconMail, IconShield } from '../../components/common/icons';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/api';

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ email, password });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-dvh w-full min-w-0 bg-login">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle showLabel className="hidden sm:flex" />
        <ThemeToggle className="sm:hidden" />
      </div>

      <div className="mx-auto grid min-h-dvh w-full max-w-6xl grid-cols-1 md:grid-cols-2 md:items-center md:gap-x-10 lg:gap-x-14 md:px-8 lg:px-10">
        <div className="relative hidden flex-col justify-between py-8 md:flex md:min-h-dvh md:py-10 lg:py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-900/40">
            <span className="text-lg font-bold text-white">B</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-heading">{APP_NAME}</p>
            <p className="text-sm text-muted">Client report admin panel</p>
          </div>
        </div>

        <div className="max-w-lg">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-heading xl:text-4xl">
            Select a project.
            <br />
            <span className="bg-linear-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Send the brief.
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Manage ActiveCollab projects, enrich client data, and trigger report workflows — all
            from one secure admin panel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-faint sm:gap-6">
          <div className="flex items-center gap-2">
            <IconShield width={16} height={16} className="text-emerald-500" />
            Role-based access
          </div>
          <div className="flex items-center gap-2">
            <IconMail width={16} height={16} className="text-emerald-500" />
            n8n report triggers
          </div>
        </div>
        </div>

        <div className="flex w-full min-w-0 items-center justify-center px-4 pb-8 pt-20 sm:px-6 md:px-0 md:py-10 lg:py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600">
              <span className="font-bold text-white">B</span>
            </div>
            <p className="text-lg font-semibold text-heading">{APP_NAME}</p>
          </div>

          <div className="glass-card rounded-2xl p-5 sm:p-8">
            <p className="text-sm font-medium text-emerald-500">Welcome back</p>
            <h2 className="mt-1 text-xl font-semibold text-heading sm:text-2xl">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-muted">Use your admin credentials to continue.</p>

            <form className="mt-6 space-y-5 sm:mt-8" onSubmit={handleSubmit}>
              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              <Input
                label="Password"
                type="password"
                required
                autoComplete="current-password"
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}
