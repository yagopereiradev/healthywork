import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';
import { Kbd } from './Kbd';
import type { Tone } from './tones';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  tone?: Tone;
  size?: ButtonSize;
  /** Single key that triggers this action, shown as a hint on desktop. */
  shortcut?: string;
  children: ReactNode;
}

export function Button({
  variant,
  tone,
  size,
  shortcut,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-keyshortcuts={shortcut}
      className={buttonClasses({ variant, tone, size, className })}
      {...rest}
    >
      {children}
      {shortcut ? <Kbd>{shortcut}</Kbd> : null}
    </button>
  );
}
