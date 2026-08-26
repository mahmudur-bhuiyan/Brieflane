import { Link } from 'react-router-dom';
import { IconArrowLeft } from '../../../components/common/icons';

export function PageBackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-heading"
    >
      <IconArrowLeft width={16} height={16} />
      {label}
    </Link>
  );
}
