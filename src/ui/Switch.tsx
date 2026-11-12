import { cn } from './cn';

interface SwitchRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * A settings line that turns something on or off. The whole line is the
 * control, so the touch target is the full row, and the state is carried by
 * the knob position as well as by the colour.
 */
export function SwitchRow({ label, checked, onChange, disabled = false }: SwitchRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-[50px] w-full items-center justify-between gap-3 px-[18px] text-left text-[15px] font-medium disabled:opacity-50"
    >
      {label}
      <span
        aria-hidden="true"
        className={cn(
          'flex h-7 w-[46px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-200',
          checked ? 'bg-water' : 'bg-control',
        )}
      >
        <span
          className={cn(
            'size-[22px] rounded-full bg-surface transition-transform duration-200 ease-out',
            checked && 'translate-x-[18px]',
          )}
        />
      </span>
    </button>
  );
}
