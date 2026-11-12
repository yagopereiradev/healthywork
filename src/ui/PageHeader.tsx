import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** Small line above the title: the date, the reminder status. */
  eyebrow?: string;
  /** Actions on the right. They wrap below the title in a narrow window. */
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-col">
        {eyebrow ? <p className="text-[13px] text-ink-2 md:text-sm">{eyebrow}</p> : null}
        <h1 className="text-2xl md:text-[2rem]">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
