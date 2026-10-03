import { useState } from 'react';
import {
  ShoppingBag,
  Ruler,
  AlertTriangle,
  Wallet,
  Layers,
  Building2,
  Palette,
  MessageCircle,
  Check,
  ArrowRight,
  TrendingUp,
  Package,
  Truck,
} from 'lucide-react';
import { SectionHeader, Card, Eyebrow, Money } from '@/components/ui';
import { orders, designs, fabrics, customers } from '@/data/mock';
import { cn, formatMoneyShort, daysUntil } from '@/lib/utils';
import { useRouter } from '@/hooks/useRouter';

interface ActionCard {
  label: string;
  hint: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  alert?: boolean;
}

export function OverviewPage() {
  const { navigate } = useRouter();

  const awaitingConfirmation = orders.filter((o) => o.productionStatus === 'RECEIVED').length;
  const measurementsUnverified = orders.filter((o) => o.productionStatus === 'CONFIRMED').length;
  const atRisk = orders.filter((o) => o.atRisk).length;
  const balanceDue = orders.filter((o) => o.paymentStatus === 'BALANCE_DUE' || o.paymentStatus === 'UNPAID').length;
  const lowStock = fabrics.filter((f) => f.totalOnHand - f.totalReserved <= f.reorderPoint).length;
  const bankTransfer = orders.filter((o) => o.paymentMethod === 'BANK_TRANSFER' && o.paymentStatus === 'DEPOSIT_PAID').length;
  const designsReview = designs.filter((d) => d.status === 'DRAFT').length;

  const cards: ActionCard[] = [
    { label: 'Orders awaiting confirmation', hint: 'New orders needing your review', count: awaitingConfirmation, icon: ShoppingBag, href: '/orders' },
    { label: 'Measurements not verified', hint: 'Blocks cutting — verify to proceed', count: measurementsUnverified, icon: Ruler, href: '/orders' },
    { label: 'Orders at risk', hint: 'Past or nearing promised date', count: atRisk, icon: AlertTriangle, href: '/orders', alert: true },
    { label: 'Balance payments outstanding', hint: 'Deposits received, balance pending', count: balanceDue, icon: Wallet, href: '/orders', alert: balanceDue > 0 },
    { label: 'Fabric below reorder point', hint: 'Restock before stock runs out', count: lowStock, icon: Layers, href: '/fabric', alert: lowStock > 0 },
    { label: 'Bank transfers to verify', hint: 'Confirm receipt before processing', count: bankTransfer, icon: Building2, href: '/orders' },
    { label: 'Designs awaiting review', hint: 'Drafts not yet published', count: designsReview, icon: Palette, href: '/designs' },
    { label: 'Unread customer messages', hint: 'WhatsApp and email inquiries', count: 2, icon: MessageCircle, href: '/customers' },
  ];

  const needsYou = cards.filter((c) => c.count > 0);
  const clearCards = cards.filter((c) => c.count === 0);

  const todayStats = {
    ordersPlaced: orders.filter((o) => daysUntil(o.date) <= 0 && daysUntil(o.date) >= -2).length,
    revenue: orders.filter((o) => o.paymentStatus === 'PAID').reduce((sum, o) => sum + o.totalMinor, 0),
    inProduction: orders.filter((o) => ['CUTTING', 'STITCHING', 'EMBROIDERY', 'FINISHING', 'QUALITY_CHECK'].includes(o.productionStatus)).length,
    dispatched: orders.filter((o) => o.productionStatus === 'DISPATCHED' || o.productionStatus === 'DELIVERED').length,
  };

  const totalCustomers = customers.length;
  const totalDesigns = designs.filter((d) => d.status === 'PUBLISHED').length;
  const avgMargin = designs.filter((d) => d.marginPercent > 0).reduce((sum, d) => sum + d.marginPercent, 0) / designs.filter((d) => d.marginPercent > 0).length;

  const revenueByDay = [
    { day: 'Aug 13', value: 35000 },
    { day: 'Aug 14', value: 0 },
    { day: 'Aug 15', value: 52000 },
    { day: 'Aug 16', value: 0 },
    { day: 'Aug 17', value: 0 },
    { day: 'Aug 18', value: 89000 },
    { day: 'Aug 19', value: 0 },
    { day: 'Aug 20', value: 35000 },
    { day: 'Aug 21', value: 0 },
    { day: 'Aug 22', value: 62000 },
    { day: 'Aug 23', value: 0 },
    { day: 'Aug 24', value: 48500 },
    { day: 'Aug 25', value: 0 },
    { day: 'Aug 26', value: 0 },
  ];
  const maxRevenue = Math.max(...revenueByDay.map((d) => d.value));

  return (
    <div className="animate-fade-in">
      <SectionHeader
        eyebrow="AKS · Admin"
        title="Overview"
        description="What needs your attention right now — everything below is derived live from real order state."
      />

      {needsYou.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <Check className="size-8 text-jade" />
          <p className="font-display text-xl text-ink">All clear for now</p>
          <p className="text-[13px] text-chalk">No orders waiting, no fabric low, no payments pending. Enjoy it.</p>
        </Card>
      ) : (
        <div className="mb-8">
          <Eyebrow className="mb-3">Needs you</Eyebrow>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {needsYou.map((card) => {
              const Icon = card.icon;
              return (
                <a
                  key={card.label}
                  href={`#${card.href}`}
                  className={cn(
                    'group flex items-center gap-4 rounded-[2px] border bg-milk p-4 transition-all hover:border-ink/15 hover:shadow-sm',
                    card.alert ? 'border-l-[3px] border-l-madder border-ink/8' : 'border-ink/8',
                  )}
                >
                  <div className={cn('flex size-10 items-center justify-center rounded-[2px]', card.alert ? 'bg-madder/10' : 'bg-ink/5')}>
                    <Icon className={cn('size-5', card.alert ? 'text-madder' : 'text-ink/50')} />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <p className="text-[12.5px] font-medium text-ink">{card.label}</p>
                    <p className="text-[11px] text-chalk">{card.hint}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn('font-data text-2xl font-medium', card.alert ? 'text-madder' : 'text-ink')}>
                      {card.count}
                    </span>
                    <ArrowRight className="size-3 text-chalk opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {clearCards.length > 0 && (
        <div className="mb-8">
          <Eyebrow className="mb-3">All clear</Eyebrow>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {clearCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="flex items-center gap-3 rounded-[2px] border border-ink/6 bg-milk/50 p-3">
                  <Icon className="size-4 text-jade" />
                  <div className="flex-1">
                    <p className="text-[11.5px] text-ink/70">{card.label}</p>
                  </div>
                  <Check className="size-3.5 text-jade" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <Eyebrow>Revenue trend</Eyebrow>
              <p className="mt-1 font-data text-2xl font-medium text-ink">
                <Money minor={todayStats.revenue} />
              </p>
              <p className="text-[11px] text-chalk">Last 14 days · {orders.length} orders total</p>
            </div>
            <TrendingUp className="size-5 text-jade" />
          </div>
          <div className="flex h-[120px] items-end gap-1.5">
            {revenueByDay.map((d, i) => {
              const height = d.value > 0 ? Math.max((d.value / maxRevenue) * 100, 6) : 2;
              return (
                <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
                  <div
                    className={cn('w-full rounded-t-[1px] transition-all', d.value > 0 ? 'bg-indigo/70 hover:bg-indigo' : 'bg-ink/8')}
                    style={{ height: `${height}%` }}
                  />
                  {d.value > 0 && (
                    <div className="absolute -top-7 hidden whitespace-nowrap rounded-[2px] bg-ink px-2 py-1 font-data text-[10px] text-milk group-hover:block">
                      {formatMoneyShort(d.value)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1.5">
            {revenueByDay.map((d, i) => (
              <span key={i} className="flex-1 text-center text-[8px] text-chalk/60">
                {d.day.split(' ')[1]}
              </span>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <StatTile label="Orders placed" value={String(todayStats.ordersPlaced)} hint="Last 2 days" icon={<ShoppingBag className="size-4" />} />
          <StatTile label="In production" value={String(todayStats.inProduction)} hint="Currently in workshop" icon={<Package className="size-4" />} />
          <StatTile label="Dispatched" value={String(todayStats.dispatched)} hint="Out for delivery" icon={<Truck className="size-4" />} />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center justify-between">
          <div>
            <Eyebrow>Published designs</Eyebrow>
            <p className="mt-1 font-data text-xl text-ink">{totalDesigns}</p>
          </div>
          <Palette className="size-5 text-chalk" />
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <Eyebrow>Active customers</Eyebrow>
            <p className="mt-1 font-data text-xl text-ink">{totalCustomers}</p>
          </div>
          <ShoppingBag className="size-5 text-chalk" />
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <Eyebrow>Avg margin</Eyebrow>
            <p className="mt-1 font-data text-xl text-jade">{avgMargin.toFixed(1)}%</p>
          </div>
          <TrendingUp className="size-5 text-chalk" />
        </Card>
      </div>
    </div>
  );
}

function StatTile({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: React.ReactNode }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex size-10 items-center justify-center rounded-[2px] bg-ink/5">
        <span className="text-ink/50">{icon}</span>
      </div>
      <div className="flex-1">
        <Eyebrow>{label}</Eyebrow>
        <p className="font-data text-xl font-medium text-ink">{value}</p>
        <p className="text-[10px] text-chalk">{hint}</p>
      </div>
    </Card>
  );
}
