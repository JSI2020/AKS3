import { useState, useEffect, type ReactNode } from 'react';
import { Search, X, Command } from 'lucide-react';
import { ADMIN_NAV_ITEMS, ADMIN_NAV_GROUPS, breadcrumbForPath } from './nav-config';
import { cn } from '@/lib/utils';
import { useRouter } from '@/hooks/useRouter';

function NavLink({
  item,
  active,
  compact,
  onClick,
}: {
  item: { title: string; href: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <a
      href={`#${item.href}`}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2.5 rounded-[2px] px-3 py-2 text-[13.5px] transition-colors',
        active
          ? 'bg-indigo-lift text-greige'
          : 'text-greige/60 hover:bg-indigo-lift/60 hover:text-greige/90',
        active &&
          'before:absolute before:inset-y-[calc(50%-9px)] before:start-0 before:w-[3px] before:rounded-r-[2px] before:bg-zari',
        compact && 'flex-col gap-0.5 px-1 py-1.5 text-[10px] uppercase tracking-[0.06em] before:hidden',
      )}
    >
      <Icon className={cn('size-4 shrink-0 opacity-85', compact && 'size-[18px]')} />
      <span className={cn(!compact && 'truncate')}>{item.title}</span>
    </a>
  );
}

function Sidebar({ path, email }: { path: string; email: string }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <aside className="hidden min-h-dvh w-[236px] shrink-0 flex-col bg-indigo md:flex">
      <div className="border-b border-white/10 px-5 py-5">
        <a href="#/" className="inline-block leading-none" aria-label="AKS admin">
          <span className="font-display text-2xl font-semibold tracking-wide text-greige">
            AKS
          </span>
          <span className="ml-1.5 font-sans text-[10px] uppercase tracking-[0.2em] text-zari/80">
            Admin
          </span>
        </a>
        <p className="mt-2 truncate font-sans text-[11px] text-greige/40">{email}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2.5 py-3 scrollbar-thin">
        {ADMIN_NAV_GROUPS.filter((g) => !g.foot).map((group) => {
          const isCollapsed = Boolean(group.label && collapsed[group.id]);
          return (
            <div key={group.id} className="mt-2 first:mt-1">
              {group.label && (
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-1.5 font-sans text-[9.5px] uppercase tracking-[0.2em] text-greige/40"
                  onClick={() => setCollapsed((c) => ({ ...c, [group.id]: !c[group.id] }))}
                >
                  {group.label}
                  <span className={cn('text-[8px] opacity-60 transition-transform', isCollapsed && '-rotate-90')} aria-hidden>
                    v
                  </span>
                </button>
              )}
              {!isCollapsed && (
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={path === item.href || (item.href !== '/' && path.startsWith(`${item.href}/`))}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2.5">
        {ADMIN_NAV_GROUPS.filter((g) => g.foot).map((group) =>
          group.items.map((item) => (
            <NavLink key={item.href} item={item} active={path === item.href} />
          )),
        )}
        <p className="mt-1 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.12em] text-greige/40">
          Cmd+K to jump
        </p>
      </div>
    </aside>
  );
}

function Header({ path, onOpenCommand }: { path: string; onOpenCommand: () => void }) {
  const crumbs = breadcrumbForPath(path);

  return (
    <header className="sticky top-0 z-30 border-b border-ink/8 bg-greige/90 backdrop-blur-md">
      <div className="flex h-12 items-center justify-between px-4 md:px-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px]">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-chalk/40">/</span>}
              {crumb.href ? (
                <a href={`#${crumb.href}`} className="text-chalk hover:text-ink">
                  {crumb.label}
                </a>
              ) : (
                <span className="font-medium text-ink">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2 rounded-[2px] border border-ink/10 bg-milk px-3 py-1.5 text-[12px] text-chalk transition-colors hover:border-ink/20 hover:text-ink"
        >
          <Search className="size-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden items-center gap-0.5 font-sans text-[10px] text-chalk/60 sm:flex">
            <Command className="size-2.5" />K
          </kbd>
        </button>
      </div>
    </header>
  );
}

function MobileNav({ path }: { path: string }) {
  const mobileItems = ADMIN_NAV_ITEMS.filter((i) =>
    ['/', '/orders', '/production', '/designs', '/settings'].includes(i.href),
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex gap-0.5 border-t border-indigo-lift bg-indigo px-1 py-1 md:hidden"
      aria-label="Admin mobile"
    >
      {mobileItems.map((item) => (
        <div key={item.href} className="min-w-[4.25rem] flex-1">
          <NavLink
            item={item}
            active={path === item.href || (item.href !== '/' && path.startsWith(`${item.href}/`))}
            compact
          />
        </div>
      ))}
    </nav>
  );
}

function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const { navigate } = useRouter();

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = ADMIN_NAV_ITEMS.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/60 px-4 pt-[15vh] animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-[4px] border border-white/10 bg-indigo shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="size-4 text-greige/50" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to any page..."
            className="flex-1 bg-transparent font-sans text-[14px] text-greige placeholder:text-greige/40 focus:outline-none"
          />
          <button onClick={onClose} className="text-greige/50 hover:text-greige">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2 scrollbar-thin">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-greige/40">No results found</p>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-[2px] px-3 py-2.5 text-left transition-colors hover:bg-indigo-lift"
                >
                  <Icon className="size-4 text-greige/60" />
                  <span className="flex-1 text-[13px] text-greige/90">{item.title}</span>
                  {item.shortcut && (
                    <kbd className="font-sans text-[10px] text-greige/40">{item.shortcut}</kbd>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const email = 'owner@aks.pk';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex min-h-dvh bg-greige">
      <Sidebar path={path} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header path={path} onOpenCommand={() => setCommandOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
      <MobileNav path={path} />
      <CommandMenu open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
