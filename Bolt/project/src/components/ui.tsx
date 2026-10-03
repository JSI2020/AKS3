import type { ReactNode } from 'react';
import { cn, formatMoneyShort } from '@/lib/utils';

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-chalk', className)}>
      {children}
    </p>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[2px] border border-ink/8 bg-milk p-5',
        onClick && 'cursor-pointer transition-all hover:border-ink/15 hover:shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = 'neutral',
  className,
}: {
  children: ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  className?: string;
}) {
  const variants: Record<string, string> = {
    neutral: 'bg-ink/5 text-ink/60',
    success: 'bg-jade/10 text-jade',
    warning: 'bg-zari/15 text-zari',
    error: 'bg-madder/10 text-madder',
    info: 'bg-sky/10 text-sky',
    accent: 'bg-indigo/10 text-indigo',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[2px] px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-[0.06em]',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  className,
  type = 'button',
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const variants: Record<string, string> = {
    primary: 'bg-indigo text-greige hover:bg-indigo-lift',
    secondary: 'border border-ink/15 bg-milk text-ink hover:bg-ink/5',
    ghost: 'text-ink/60 hover:bg-ink/5 hover:text-ink',
    danger: 'bg-madder text-milk hover:bg-madder/90',
  };
  const sizes: Record<string, string> = {
    sm: 'px-2.5 py-1 text-[11px]',
    md: 'px-3.5 py-2 text-[13px]',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-[2px] font-sans font-medium transition-all',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: { value: string; positive: boolean };
  icon?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Eyebrow>{label}</Eyebrow>
        {icon && <span className="text-chalk">{icon}</span>}
      </div>
      <p className="font-data text-2xl font-medium text-ink">{value}</p>
      {hint && <p className="text-[11px] text-chalk">{hint}</p>}
      {trend && (
        <p className={cn('text-[11px] font-medium', trend.positive ? 'text-jade' : 'text-madder')}>
          {trend.positive ? '+' : ''}{trend.value}
        </p>
      )}
    </Card>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon,
}: {
  title: string;
  message: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[2px] border border-dashed border-ink/15 bg-milk/50 px-6 py-16 text-center">
      {icon && <div className="text-chalk/60">{icon}</div>}
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="max-w-sm text-[13px] text-chalk">{message}</p>
      {action}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="font-display text-3xl font-medium text-ink">{title}</h1>
        {description && <p className="text-[13px] text-chalk">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function Money({ minor, className, short }: { minor: number; className?: string; short?: boolean }) {
  const pkr = minor / 100;
  return (
    <span className={cn('font-data tabular-nums', className)}>
      {short ? formatMoneyShort(minor) : `PKR ${pkr.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`}
    </span>
  );
}


