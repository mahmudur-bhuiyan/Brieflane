import { Link } from 'react-router-dom';
import { IconArrowLeft } from '../../../components/common/icons';

type PageBackLinkProps = {
  to: string;
  label: string;
  variant?: 'link' | 'button';
  className?: string;
};

export function PageBackLink({ to, label, variant = 'link', className = '' }: PageBackLinkProps) {
  if (variant === 'button') {
    return (
      <Link
        to={to}
        className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-(--input-border) bg-subtle px-4 text-sm font-medium text-(--btn-secondary-text) transition hover:bg-(--hover-bg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 ${className}`}
      >
        <IconArrowLeft width={16} height={16} />
        {label}
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 text-sm text-muted transition hover:text-heading ${className}`}
    >
      <IconArrowLeft width={16} height={16} />
      {label}
    </Link>
  );
}
