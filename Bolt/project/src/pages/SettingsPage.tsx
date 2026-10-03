import { useState } from 'react';
import {
  Users,
  Ruler,
  Percent,
  Scissors,
  Truck,
  CreditCard,
  Clock,
  Bell,
  Tag,
  Building2,
  Sparkles,
  Database,
  ChevronRight,
  Shield,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { SectionHeader, Card, Eyebrow, Badge, Button } from '@/components/ui';
import { staff, rates, trims } from '@/data/mock';
import { cn } from '@/lib/utils';
import type { StaffMember } from '@/data/types';

const SETTINGS_SECTIONS = [
  { id: 'staff', title: 'Staff', desc: 'Invite, roles, permission matrix, sessions', icon: Users, href: 'staff' },
  { id: 'rates', title: 'Rates', desc: 'Stitching, embroidery, packaging — feed design costing', icon: Percent, href: 'rates' },
  { id: 'sizing', title: 'Sizing', desc: 'Size blocks, fit profiles, archetypes, custom limits', icon: Ruler, href: 'sizing' },
  { id: 'trims', title: 'Trims', desc: 'Buttons, zips, lining — unit inventory', icon: Scissors, href: 'trims' },
  { id: 'shipping', title: 'Shipping', desc: 'Couriers, rates by city tier', icon: Truck, href: 'shipping' },
  { id: 'payments', title: 'Payments', desc: 'Providers, payment plan rules, bank details', icon: CreditCard, href: 'payments' },
  { id: 'lead', title: 'Lead times', desc: 'Base days per garment type, buffer, holidays', icon: Clock, href: 'lead' },
  { id: 'notifications', title: 'Notifications', desc: 'Which events send email/WhatsApp; templates', icon: Bell, href: 'notifications' },
  { id: 'reasons', title: 'Reasons', desc: 'Cancellation, adjustment, stock-adjustment reasons', icon: Tag, href: 'reasons' },
  { id: 'business', title: 'Business', desc: 'Name, NTN, address, logo', icon: Building2, href: 'business' },
  { id: 'ai', title: 'AI', desc: 'Provider config, monthly spend cap, kill switch', icon: Sparkles, href: 'ai' },
  { id: 'backups', title: 'Backups', desc: 'Status, last restore drill', icon: Database, href: 'backups' },
];

const ROLES: StaffMember['role'][] = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'TAILOR', 'ACCOUNTANT', 'READ_ONLY'];

const ROLE_BADGE_VARIANT: Record<string, 'accent' | 'info' | 'success' | 'warning' | 'neutral' | 'error'> = {
  OWNER: 'accent',
  ADMIN: 'info',
  MANAGER: 'success',
  STAFF: 'warning',
  TAILOR: 'neutral',
  ACCOUNTANT: 'info',
  READ_ONLY: 'neutral',
};

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div className="animate-fade-in">
      <SectionHeader
        eyebrow="Settings"
        title="Settings"
        description="Where all the define-once values live — selected everywhere else via dropdown. Nothing is typed twice."
      />

      {!activeSection ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="group flex items-start gap-3 rounded-[2px] border border-ink/8 bg-milk p-4 text-left transition-all hover:border-indigo/20 hover:bg-indigo/[0.02]"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[2px] bg-ink/5 text-ink/50 transition-colors group-hover:bg-indigo/10 group-hover:text-indigo">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-ink">{section.title}</p>
                  <p className="mt-0.5 text-[11px] text-chalk">{section.desc}</p>
                </div>
                <ChevronRight className="size-4 text-chalk opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            );
          })}
        </div>
      ) : (
        <SettingsSection sectionId={activeSection} onBack={() => setActiveSection(null)} />
      )}
    </div>
  );
}

function SettingsSection({ sectionId, onBack }: { sectionId: string; onBack: () => void }) {
  const section = SETTINGS_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return null;
  const Icon = section.icon;

  return (
    <div className="animate-slide-right">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-[12px] text-chalk hover:text-ink">
        <X className="size-3.5 rotate-45" /> Back to settings
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-[2px] bg-indigo/10">
          <Icon className="size-5 text-indigo" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium text-ink">{section.title}</h2>
          <p className="text-[12px] text-chalk">{section.desc}</p>
        </div>
      </div>

      {sectionId === 'staff' && <StaffSettings />}
      {sectionId === 'rates' && <RatesSettings />}
      {sectionId === 'trims' && <TrimsSettings />}
      {sectionId !== 'staff' && sectionId !== 'rates' && sectionId !== 'trims' && (
        <PlaceholderSettings sectionId={sectionId} />
      )}
    </div>
  );
}

function StaffSettings() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Eyebrow>Team members</Eyebrow>
        <Button size="sm"><Plus className="size-3.5" /> Invite staff</Button>
      </div>

      <div className="overflow-hidden rounded-[2px] border border-ink/8 bg-milk">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-ink/8 bg-ink/[0.02]">
              <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Name</th>
              <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Role</th>
              <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">2FA</th>
              <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Active jobs</th>
              <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-3">
                  <p className="text-[12.5px] font-medium text-ink">{member.name}</p>
                  <p className="text-[10px] text-chalk">{member.email}</p>
                </td>
                <td className="px-4 py-3"><Badge variant={ROLE_BADGE_VARIANT[member.role]}>{member.role.replace('_', ' ')}</Badge></td>
                <td className="px-4 py-3">
                  {member.twoFactorEnabled ? (
                    <span className="flex items-center gap-1 text-[11px] text-jade"><Shield className="size-3" /> Enabled</span>
                  ) : (
                    <span className="text-[11px] text-chalk">Off</span>
                  )}
                </td>
                <td className="px-4 py-3 font-data text-[12px] text-ink">{member.currentJobs}</td>
                <td className="px-4 py-3 text-[12px] text-chalk">{member.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card>
        <Eyebrow className="mb-3">Role permissions matrix</Eyebrow>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="py-2 pr-4 font-sans text-[10px] font-medium uppercase tracking-wide text-chalk">Role</th>
                <th className="px-2 py-2 text-center font-sans text-[10px] font-medium uppercase tracking-wide text-chalk">Orders</th>
                <th className="px-2 py-2 text-center font-sans text-[10px] font-medium uppercase tracking-wide text-chalk">Designs</th>
                <th className="px-2 py-2 text-center font-sans text-[10px] font-medium uppercase tracking-wide text-chalk">Fabric</th>
                <th className="px-2 py-2 text-center font-sans text-[10px] font-medium uppercase tracking-wide text-chalk">Money</th>
                <th className="px-2 py-2 text-center font-sans text-[10px] font-medium uppercase tracking-wide text-chalk">Settings</th>
                <th className="px-2 py-2 text-center font-sans text-[10px] font-medium uppercase tracking-wide text-chalk">Staff</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => {
                const perms: Record<string, boolean> = {
                  OWNER: true, ADMIN: true, MANAGER: role === 'MANAGER', STAFF: role === 'STAFF',
                  TAILOR: false, ACCOUNTANT: role === 'ACCOUNTANT', READ_ONLY: false,
                };
                const canMoney = role === 'OWNER' || role === 'ADMIN' || role === 'ACCOUNTANT';
                const canSettings = role === 'OWNER' || role === 'ADMIN';
                const canStaff = role === 'OWNER';
                return (
                  <tr key={role} className="border-b border-ink/5 last:border-0">
                    <td className="py-2 pr-4"><Badge variant={ROLE_BADGE_VARIANT[role]}>{role.replace('_', ' ')}</Badge></td>
                    <td className="px-2 py-2 text-center"><PermDot granted={perms[role] ?? role === 'OWNER'} /></td>
                    <td className="px-2 py-2 text-center"><PermDot granted={role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER'} /></td>
                    <td className="px-2 py-2 text-center"><PermDot granted={role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER'} /></td>
                    <td className="px-2 py-2 text-center"><PermDot granted={canMoney} /></td>
                    <td className="px-2 py-2 text-center"><PermDot granted={canSettings} /></td>
                    <td className="px-2 py-2 text-center"><PermDot granted={canStaff} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-chalk">Explicit per-user grants always override role defaults. Tailor sees production board only — no prices, no contact details.</p>
      </Card>
    </div>
  );
}

function PermDot({ granted }: { granted: boolean }) {
  return (
    <span className={cn('inline-flex size-4 items-center justify-center rounded-full', granted ? 'bg-jade/15' : 'bg-ink/5')}>
      {granted && <Check className="size-2.5 text-jade" />}
    </span>
  );
}

function RatesSettings() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Eyebrow>Active rates · feed design costing automatically</Eyebrow>
        <Button size="sm"><Plus className="size-3.5" /> New rate</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rates.map((rate) => (
          <Card key={rate.id} className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-ink">{rate.name}</p>
              <p className="text-[11px] text-chalk">{rate.kind} · {rate.unit.replace('_', ' ')}</p>
            </div>
            <div className="text-right">
              <p className="font-data text-[14px] text-ink">{(rate.amountMinor / 100).toLocaleString()} PKR</p>
              {rate.active && <Badge variant="success">Active</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TrimsSettings() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Eyebrow>Trims inventory · feeds design cost dropdown</Eyebrow>
        <Button size="sm"><Plus className="size-3.5" /> New trim</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {trims.map((trim) => (
          <Card key={trim.id} className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-ink">{trim.name}</p>
              <p className="text-[11px] text-chalk">{trim.type} · per {trim.unit}</p>
            </div>
            <div className="text-right">
              <p className="font-data text-[14px] text-ink">{(trim.costMinor / 100).toLocaleString()} PKR</p>
              <p className="text-[10px] text-chalk">{trim.stock} in stock</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PlaceholderSettings({ sectionId }: { sectionId: string }) {
  const content: Record<string, { title: string; items: string[] }> = {
    sizing: {
      title: 'Sizing system',
      items: ['Size blocks (XS–XXL with inch measurements)', 'Fit profiles (slim, regular, relaxed)', 'House model archetypes', 'Custom measurement limits per garment type'],
    },
    shipping: {
      title: 'Shipping configuration',
      items: ['Courier partners (TCS, Leopards, DHL)', 'Rates by city tier (Metro, Tier 1, Tier 2)', 'Free shipping threshold', 'COD availability by region'],
    },
    payments: {
      title: 'Payment providers',
      items: ['Card processor (Stripe / local gateway)', 'Bank transfer details', 'Wallet integration', 'Payment plan rules (50% deposit, balance before dispatch)'],
    },
    lead: {
      title: 'Lead time rules',
      items: ['Base days per garment type (Kurti: 7d, Lehenga: 21d)', 'Queue depth buffer', 'Holiday calendar', 'Promised date = base + buffer + queue'],
    },
    notifications: {
      title: 'Notification settings',
      items: ['Email + WhatsApp on every status change', 'Balance-due reminder (configurable days)', 'Review request (7 days after delivery)', 'Template editor for each message type'],
    },
    reasons: {
      title: 'Reason codes',
      items: ['Cancellation reasons (customer request, out of stock, duplicate)', 'Price adjustment reasons (discount, error correction)', 'Stock adjustment reasons (damage, loss, correction)'],
    },
    business: {
      title: 'Business profile',
      items: ['Business name: AKS', 'NTN: 1234567-8', 'Address: Lahore, Pakistan', 'Logo upload'],
    },
    ai: {
      title: 'AI configuration',
      items: ['Provider: fal.ai', 'Monthly spend cap: 12,000 PKR', 'Kill switch: disable all AI generation', 'Spend this month: 8,450 PKR (70%)'],
    },
    backups: {
      title: 'Backup status',
      items: ['Automated daily backups: Active', 'Last backup: Aug 25, 2026 03:00', 'Last restore drill: Jul 15, 2026', 'Retention: 30 days'],
    },
  };

  const data = content[sectionId];
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Eyebrow className="mb-3">{data.title}</Eyebrow>
        <div className="flex flex-col gap-2">
          {data.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-[2px] bg-ink/[0.02] px-3 py-2.5">
              <Check className="size-3.5 text-jade" />
              <span className="text-[12.5px] text-ink">{item}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
