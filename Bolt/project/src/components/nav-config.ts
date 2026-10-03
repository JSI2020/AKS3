import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Percent,
  Layers,
  Palette,
  Scissors,
  Package,
  Wallet,
  LineChart,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';

export type AdminNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  shortcut?: string;
};

export type AdminNavGroup = {
  id: string;
  label: string | null;
  foot?: boolean;
  items: AdminNavItem[];
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { title: 'Overview', href: '/', icon: LayoutDashboard, shortcut: 'G T' },
  { title: 'Orders', href: '/orders', icon: ShoppingBag, shortcut: 'G O' },
  { title: 'Customers', href: '/customers', icon: Users, shortcut: 'G C' },
  { title: 'Discounts', href: '/discounts', icon: Percent },
  { title: 'Fabric', href: '/fabric', icon: Layers, shortcut: 'G F' },
  { title: 'Designs', href: '/designs', icon: Palette, shortcut: 'G D' },
  { title: 'Production', href: '/production', icon: Scissors, shortcut: 'G P' },
  { title: 'Inventory', href: '/inventory', icon: Package },
  { title: 'Money', href: '/money', icon: Wallet, shortcut: 'G M' },
  { title: 'Insights', href: '/insights', icon: LineChart, shortcut: 'G I' },
  { title: 'Settings', href: '/settings', icon: SettingsIcon, shortcut: 'G S' },
];

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'today',
    label: null,
    items: [ADMIN_NAV_ITEMS[0]],
  },
  {
    id: 'sell',
    label: 'Sell',
    items: [ADMIN_NAV_ITEMS[1], ADMIN_NAV_ITEMS[2], ADMIN_NAV_ITEMS[3]],
  },
  {
    id: 'make',
    label: 'Make',
    items: [ADMIN_NAV_ITEMS[6], ADMIN_NAV_ITEMS[7]],
  },
  {
    id: 'create',
    label: 'Create',
    items: [ADMIN_NAV_ITEMS[4], ADMIN_NAV_ITEMS[5]],
  },
  {
    id: 'money',
    label: 'Money',
    items: [ADMIN_NAV_ITEMS[8], ADMIN_NAV_ITEMS[9]],
  },
  {
    id: 'settings',
    label: 'Settings',
    foot: true,
    items: [ADMIN_NAV_ITEMS[10]],
  },
];

export function breadcrumbForPath(path: string): { label: string; href?: string }[] {
  const crumbs: { label: string; href?: string }[] = [{ label: 'Admin', href: '/' }];

  if (path === '/' || path === '') {
    crumbs.push({ label: 'Overview' });
    return crumbs;
  }

  const segments = path.replace(/^\//, '').split('/').filter(Boolean);
  let acc = '';
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const label = seg.charAt(0).toUpperCase() + seg.slice(1);
    const isLast = i === segments.length - 1;
    crumbs.push(isLast ? { label } : { label, href: acc });
  });

  return crumbs;
}
