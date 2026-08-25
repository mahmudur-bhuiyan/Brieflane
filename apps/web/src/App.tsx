import { useEffect, useState } from 'react';
import { APP_NAME } from '@brieflane/shared';

type HealthResponse = {
  status: string;
  app: string;
  db: 'ok' | 'error' | 'not_configured';
  timestamp: string;
};

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<HealthResponse>;
      })
      .then(setHealth)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Admin Panel</p>
        <h1 className="mt-2 text-3xl font-semibold">{APP_NAME}</h1>
        <p className="mt-3 text-slate-400">
          Client reports from your project data. Select a project. Send the brief.
        </p>

        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">API Health</p>
          {health && (
            <div className="mt-2 space-y-1 text-sm">
              <p className="text-emerald-400">
                {health.app} — {health.status}
              </p>
              <p
                className={
                  health.db === 'ok'
                    ? 'text-emerald-400'
                    : health.db === 'not_configured'
                      ? 'text-amber-400'
                      : 'text-red-400'
                }
              >
                Database: {health.db}
              </p>
              <p className="text-slate-500">{health.timestamp}</p>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-red-400">Unable to reach API: {error}</p>}
          {!health && !error && <p className="mt-2 text-sm text-slate-500">Checking…</p>}
        </div>
      </div>
    </main>
  );
}

export default App;
