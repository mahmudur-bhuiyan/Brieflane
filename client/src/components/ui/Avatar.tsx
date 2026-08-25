export function Avatar({ name, email }: { name: string | null; email: string }) {
  const label = (name?.trim() || email).trim();
  const initials = label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-indigo-500/30 text-xs font-semibold text-white ring-1 ring-white/10">
      {initials || '?'}
    </div>
  );
}
