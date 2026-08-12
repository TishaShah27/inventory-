import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <div className="mb-2 inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-1 w-6 rounded-full bg-primary" /> {eyebrow}
          </div>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight md:text-[40px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
