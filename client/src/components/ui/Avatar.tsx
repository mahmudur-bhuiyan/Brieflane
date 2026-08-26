export function Avatar({
  name,
  email,
  size = 'sm',
  className = '',
}: {
  name: string | null;
  email: string | null;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const label = name?.trim() || email?.trim() || '';
  const initials = label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const sizeClasses =
    size === 'lg'
      ? 'h-20 w-20 text-xl ring-4 ring-(--card-bg)'
      : 'h-9 w-9 text-xs ring-1 ring-white/10';

  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br from-emerald-500/30 to-indigo-500/30 font-semibold text-white ${sizeClasses} ${className}`}
    >
      <span className="block leading-none">{initials || '?'}</span>
    </div>
  );
}
