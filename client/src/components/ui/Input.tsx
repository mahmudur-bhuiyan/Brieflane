import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import {
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconHash,
  IconLock,
  IconMail,
  IconSearch,
} from '../common/icons';

type SelectOption = { value: string; label: ReactNode };

function parseOptions(children: ReactNode): SelectOption[] {
  return Children.toArray(children)
    .filter(isValidElement<{ value?: string | number; children?: ReactNode }>)
    .map((child) => ({
      value: String(child.props.value ?? ''),
      label: child.props.children,
    }));
}

function resolveDefaultIcon(type?: string): ReactNode | undefined {
  switch (type) {
    case 'email':
      return <IconMail width={16} height={16} />;
    case 'password':
      return <IconLock width={16} height={16} />;
    case 'search':
      return <IconSearch width={16} height={16} />;
    case 'number':
      return <IconHash width={16} height={16} />;
    default:
      return undefined;
  }
}

type FieldWrapperProps = {
  label: string;
  hideLabel?: boolean;
  children: ReactNode;
};

function FieldWrapper({ label, hideLabel, children }: FieldWrapperProps) {
  return (
    <label className="block">
      <span
        className={
          hideLabel
            ? 'sr-only'
            : 'text-sm font-medium text-muted'
        }
      >
        {label}
      </span>
      <div className="relative mt-1.5">{children}</div>
    </label>
  );
}

export function SelectControl({
  className = '',
  value,
  onChange,
  children,
  disabled,
  id,
  'aria-label': ariaLabel,
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const options = parseOptions(children);
  const selected = options.find((option) => option.value === value);
  const isAutoWidth = /\bw-auto\b/.test(className);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
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

  function choose(nextValue: string) {
    setOpen(false);

    if (nextValue !== value) {
      onChange?.({
        target: { value: nextValue },
      } as React.ChangeEvent<HTMLSelectElement>);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${isAutoWidth ? 'w-auto' : 'w-full'}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`input-field mt-0 flex items-center justify-between gap-2 text-left ${className}`}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <IconChevronDown
          width={16}
          height={16}
          className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="select-menu absolute z-50 mt-1 max-h-60 w-full overflow-auto py-1"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`select-option w-full ${isSelected ? 'select-option-active' : ''}`}
                  onClick={() => choose(option.value)}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hideLabel?: boolean;
  icon?: ReactNode;
};

export function Input({
  label,
  hideLabel = false,
  icon,
  className = '',
  type = 'text',
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedIcon = icon ?? resolveDefaultIcon(type);
  const hasLeadingIcon = Boolean(resolvedIcon);
  const inputType = isPassword && showPassword ? 'text' : type;

  const inputClassName = [
    'input-field mt-0',
    hasLeadingIcon ? 'pl-10' : '',
    isPassword ? 'pr-10' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <FieldWrapper label={label} hideLabel={hideLabel}>
      {hasLeadingIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
          {resolvedIcon}
        </span>
      )}

      <input
        id={fieldId}
        type={inputType}
        className={inputClassName}
        {...props}
      />

      {isPassword && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-faint transition hover:bg-(--hover-bg) hover:text-heading"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword((current) => !current)}
        >
          {showPassword ? (
            <IconEyeOff width={16} height={16} />
          ) : (
            <IconEye width={16} height={16} />
          )}
        </button>
      )}
    </FieldWrapper>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hideLabel?: boolean;
  icon?: ReactNode;
};

export function Textarea({
  label,
  hideLabel = false,
  icon,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hasLeadingIcon = Boolean(icon);

  const textareaClassName = [
    'input-field mt-0 resize-y',
    hasLeadingIcon ? 'pl-10' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <FieldWrapper label={label} hideLabel={hideLabel}>
      {hasLeadingIcon && (
        <span className="pointer-events-none absolute left-3 top-3 text-faint">
          {icon}
        </span>
      )}

      <textarea id={fieldId} className={textareaClassName} {...props} />
    </FieldWrapper>
  );
}

export function Select({
  label,
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const fieldId = useId();

  return (
    <label className="block">
      <span className="text-sm font-medium text-muted">{label}</span>
      <div className="mt-1.5">
        <SelectControl id={fieldId} className={className} {...props}>
          {children}
        </SelectControl>
      </div>
    </label>
  );
}
