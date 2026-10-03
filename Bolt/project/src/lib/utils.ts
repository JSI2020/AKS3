export function formatMoney(minor: number): string {
  const pkr = minor / 100;
  return `PKR ${pkr.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function formatMoneyShort(minor: number): string {
  const pkr = minor / 100;
  if (pkr >= 100000) return `PKR ${(pkr / 1000).toFixed(0)}k`;
  if (pkr >= 1000) return `PKR ${(pkr / 1000).toFixed(1)}k`;
  return `PKR ${pkr.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const now = new Date('2026-08-26').getTime();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
