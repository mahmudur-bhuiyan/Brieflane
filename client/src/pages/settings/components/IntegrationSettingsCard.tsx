import { cloneElement, isValidElement, type ReactElement, type ReactNode, type SubmitEvent } from 'react';
import { IconSend } from '../../../components/common/icons';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';

export type IntegrationAccent = 'emerald' | 'violet';

const accentStyles: Record<
  IntegrationAccent,
  {
    icon: string;
    badge: string;
    panel: string;
    panelTitle: string;
    panelIcon: string;
    urlBox: string;
  }
> = {
  emerald: {
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-600 dark:bg-emerald-500',
    panel: 'border-emerald-500/20 bg-emerald-500/10',
    panelTitle: 'text-emerald-700 dark:text-emerald-300',
    panelIcon: 'text-emerald-600 dark:text-emerald-400',
    urlBox: 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-100',
  },
  violet: {
    icon: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-600 dark:bg-violet-500',
    panel: 'border-violet-500/20 bg-violet-500/10',
    panelTitle: 'text-violet-700 dark:text-violet-300',
    panelIcon: 'text-violet-600 dark:text-violet-400',
    urlBox: 'bg-violet-500/15 text-violet-900 dark:text-violet-100',
  },
};

type IntegrationSettingsCardProps = {
  accent: IntegrationAccent;
  icon: ReactNode;
  title: string;
  description: string;
  fieldLabel: string;
  fieldValue: string;
  fieldPlaceholder: string;
  fieldRequired?: boolean;
  helperText: string;
  saveLabel: string;
  savingLabel: string;
  configured: boolean;
  configuredSummary: string;
  configuredDetailLabel: string;
  configuredValue: string;
  canSave: boolean;
  submitting: boolean;
  error: string | null;
  onFieldChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
};

function renderHeaderIcon(icon: ReactNode) {
  if (isValidElement(icon)) {
    return cloneElement(icon as ReactElement<{ width?: number; height?: number }>, {
      width: 20,
      height: 20,
    });
  }

  return icon;
}

export function IntegrationSettingsCard({
  accent,
  icon,
  title,
  description,
  fieldLabel,
  fieldValue,
  fieldPlaceholder,
  fieldRequired = false,
  helperText,
  saveLabel,
  savingLabel,
  configured,
  configuredSummary,
  configuredDetailLabel,
  configuredValue,
  canSave,
  submitting,
  error,
  onFieldChange,
  onSubmit,
}: IntegrationSettingsCardProps) {
  const trimmedConfiguredValue = configuredValue.trim();
  const styles = accentStyles[accent];

  return (
    <Card>
      <form className="space-y-6" onSubmit={onSubmit} noValidate>
        <div className="flex gap-4">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
          >
            {renderHeaderIcon(icon)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-heading">{title}</h3>
              <span
                className={
                  configured
                    ? `shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white ${styles.badge}`
                    : 'shrink-0 rounded-full bg-(--badge-neutral-bg) px-3 py-1 text-xs font-semibold text-(--badge-neutral-text) ring-1 ring-(--badge-neutral-ring) ring-inset'
                }
              >
                {configured ? 'Configured' : 'Not configured'}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Input
            label={fieldLabel}
            type="url"
            required={fieldRequired}
            placeholder={fieldPlaceholder}
            value={fieldValue}
            onChange={(event) => onFieldChange(event.target.value)}
          />
          <p className="text-xs leading-relaxed text-faint">{helperText}</p>
        </div>

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!canSave}>
          <IconSend width={16} height={16} />
          {submitting ? savingLabel : saveLabel}
        </Button>

        {configured && trimmedConfiguredValue && (
          <div className={`rounded-xl border p-4 ${styles.panel}`}>
            <div className={`flex items-center gap-2 text-sm font-semibold ${styles.panelTitle}`}>
              <span className={styles.panelIcon}>{renderHeaderIcon(icon)}</span>
              {configuredSummary}
            </div>
            <p className="mt-2 text-sm text-heading">{configuredDetailLabel}</p>
            <div
              className={`mt-2 break-all rounded-lg px-3 py-2 font-mono text-sm ${styles.urlBox}`}
            >
              {trimmedConfiguredValue}
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}
