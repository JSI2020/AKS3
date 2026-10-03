import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Package,
  AlertCircle,
  Target,
  Download,
} from 'lucide-react';
import { SectionHeader, Card, Eyebrow, Badge, Button, Money } from '@/components/ui';
import { orders, designs, recurringCosts, rates } from '@/data/mock';
import { cn, formatMoneyShort } from '@/lib/utils';

export function MoneyPage() {
  const totalRevenue = orders.filter((o) => o.paymentStatus === 'PAID').reduce((s, o) => s + o.totalMinor, 0);
  const totalDeposits = orders.filter((o) => o.paymentStatus === 'DEPOSIT_PAID' || o.paymentStatus === 'BALANCE_DUE').reduce((s, o) => s + o.depositMinor, 0);
  const outstandingBalance = orders.filter((o) => o.paymentStatus === 'BALANCE_DUE' || o.paymentStatus === 'UNPAID').reduce((s, o) => s + o.balanceMinor, 0);
  const outstandingCOD = orders.filter((o) => o.paymentMethod === 'COD' && o.productionStatus === 'DISPATCHED').reduce((s, o) => s + o.totalMinor, 0);

  const monthlyRecurring = recurringCosts
    .filter((rc) => rc.active && rc.cycle === 'MONTHLY')
    .reduce((s, rc) => s + rc.amountMinor, 0);
  const yearlyRecurring = recurringCosts
    .filter((rc) => rc.active && rc.cycle === 'YEARLY')
    .reduce((s, rc) => s + rc.amountMinor, 0);
  const monthlyFromYearly = yearlyRecurring / 12;
  const totalMonthlyCosts = monthlyRecurring + monthlyFromYearly;

  const totalDesignCosts = designs.filter((d) => d.status === 'PUBLISHED').reduce((s, d) => s + d.totalCostMinor, 0);
  const avgMargin = designs.filter((d) => d.marginPercent > 0).reduce((s, d) => s + d.marginPercent, 0) / designs.filter((d) => d.marginPercent > 0).length;
  const avgOrderValue = totalRevenue / orders.filter((o) => o.paymentStatus === 'PAID').length;

  const contributionMargin = totalRevenue - totalDesignCosts;
  const breakEvenOrders = totalMonthlyCosts > 0 && avgOrderValue > 0
    ? Math.ceil((totalMonthlyCosts - contributionMargin * 0.3) / (avgOrderValue * (avgMargin / 100)))
    : 0;

  const rankedDesigns = [...designs].filter((d) => d.marginPercent > 0).sort((a, b) => b.marginPercent - a.marginPercent);

  return (
    <div className="animate-fade-in">
      <SectionHeader
        eyebrow="Money"
        title="Payments & Finance"
        description="Am I profitable? Recurring costs, variable costs, revenue, and margin — all derived from real orders."
        action={<Button variant="secondary" size="sm"><Download className="size-3.5" /> Export for accounting</Button>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total revenue"
          value={totalRevenue}
          hint="From paid orders"
          icon={<TrendingUp className="size-4" />}
          variant="success"
        />
        <StatTile
          label="Deposits held"
          value={totalDeposits}
          hint="From in-progress orders"
          icon={<Wallet className="size-4" />}
          variant="info"
        />
        <StatTile
          label="Balance outstanding"
          value={outstandingBalance}
          hint="From unpaid & balance-due orders"
          icon={<AlertCircle className="size-4" />}
          variant="error"
        />
        <StatTile
          label="Outstanding COD"
          value={outstandingCOD}
          hint="Delivered, not yet remitted"
          icon={<DollarSign className="size-4" />}
          variant="warning"
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <Eyebrow>Recurring costs · monthly</Eyebrow>
            <Money minor={totalMonthlyCosts} className="text-[14px] font-medium text-ink" />
          </div>
          <div className="flex flex-col gap-2">
            {recurringCosts.filter((rc) => rc.active).map((rc) => (
              <div key={rc.id} className="flex items-center justify-between border-b border-ink/5 py-2 last:border-0">
                <div>
                  <p className="text-[12.5px] text-ink">{rc.name}</p>
                  <p className="text-[10px] text-chalk">{rc.category} · {rc.cycle}</p>
                </div>
                <div className="text-right">
                  <Money minor={rc.amountMinor} className="text-[12px] text-ink" />
                  <p className="text-[9px] text-chalk">{rc.cycle === 'YEARLY' ? `${formatMoneyShort(rc.amountMinor / 12)}/mo` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <Eyebrow>Variable costs · per order</Eyebrow>
            <TrendingDown className="size-4 text-madder" />
          </div>
          <div className="flex flex-col gap-3">
            <CostBar label="Fabric" value={designs.reduce((s, d) => s + d.fabricMeters * 850 * 100, 0)} max={totalDesignCosts} />
            <CostBar label="Stitching" value={designs.reduce((s, d) => s + d.stitchingCostMinor, 0)} max={totalDesignCosts} />
            <CostBar label="Embroidery" value={designs.reduce((s, d) => s + d.embroideryCostMinor, 0)} max={totalDesignCosts} />
            <CostBar label="Trims" value={designs.reduce((s, d) => s + d.trimsCostMinor, 0)} max={totalDesignCosts} />
            <CostBar label="Packaging" value={designs.reduce((s, d) => s + d.packagingCostMinor, 0)} max={totalDesignCosts} />
            <CostBar label="AI generation" value={designs.reduce((s, d) => s + d.aiCostMinor, 0)} max={totalDesignCosts} />
          </div>
          <div className="mt-3 flex justify-between border-t border-ink/10 pt-2">
            <span className="text-[13px] font-medium text-ink">Total cost (all designs)</span>
            <Money minor={totalDesignCosts} className="text-[13px] font-medium text-ink" />
          </div>
        </Card>
      </div>

      <Card className="mb-6 border-l-[3px] border-l-indigo">
        <div className="flex items-center gap-3">
          <Target className="size-5 text-indigo" />
          <div className="flex-1">
            <Eyebrow>Break-even this month</Eyebrow>
            <p className="mt-1 font-display text-lg text-ink">
              You need <span className="text-indigo">{breakEvenOrders} more orders</span> to break even.
            </p>
            <p className="text-[11px] text-chalk">
              Monthly fixed costs {formatMoneyShort(totalMonthlyCosts)} · Avg order value {formatMoneyShort(avgOrderValue)} · Avg margin {avgMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Eyebrow className="mb-3">Most profitable designs</Eyebrow>
          <div className="flex flex-col gap-2">
            {rankedDesigns.slice(0, 3).map((d, i) => (
              <div key={d.id} className="flex items-center gap-3 rounded-[2px] bg-ink/[0.02] px-3 py-2.5">
                <span className="font-display text-lg text-chalk">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-[12.5px] font-medium text-ink">{d.name}</p>
                  <p className="text-[10px] text-chalk">{d.orderCount} orders · {formatMoneyShort(d.revenueMinor)} revenue</p>
                </div>
                <div className="text-right">
                  <span className={cn('font-data text-[14px] font-medium', d.marginPercent > 60 ? 'text-jade' : 'text-zari')}>
                    {d.marginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Eyebrow className="mb-3">Least profitable designs</Eyebrow>
          <div className="flex flex-col gap-2">
            {rankedDesigns.slice(-3).reverse().map((d, i) => (
              <div key={d.id} className="flex items-center gap-3 rounded-[2px] bg-ink/[0.02] px-3 py-2.5">
                <span className="font-display text-lg text-chalk">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-[12.5px] font-medium text-ink">{d.name}</p>
                  <p className="text-[10px] text-chalk">{d.orderCount} orders · {formatMoneyShort(d.revenueMinor)} revenue</p>
                </div>
                <div className="text-right">
                  <span className={cn('font-data text-[14px] font-medium', d.marginPercent < 40 ? 'text-madder' : 'text-zari')}>
                    {d.marginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <Eyebrow>Stitching & embroidery rates</Eyebrow>
          <Badge variant="neutral">{rates.length} active</Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {rates.filter((r) => r.active).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-[2px] bg-ink/[0.02] px-3 py-2">
              <div>
                <p className="text-[12px] text-ink">{r.name}</p>
                <p className="text-[10px] text-chalk">{r.kind} · {r.unit.replace('_', ' ')}</p>
              </div>
              <Money minor={r.amountMinor} className="text-[12px] text-ink" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatTile({ label, value, hint, icon, variant }: { label: string; value: number; hint: string; icon: React.ReactNode; variant: 'success' | 'info' | 'error' | 'warning' }) {
  const colors: Record<string, string> = {
    success: 'text-jade bg-jade/10',
    info: 'text-sky bg-sky/10',
    error: 'text-madder bg-madder/10',
    warning: 'text-zari bg-zari/15',
  };
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Eyebrow>{label}</Eyebrow>
        <span className={cn('flex size-8 items-center justify-center rounded-[2px]', colors[variant])}>{icon}</span>
      </div>
      <Money minor={value} className="text-xl font-medium text-ink" />
      <p className="text-[10px] text-chalk">{hint}</p>
    </Card>
  );
}

function CostBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-chalk">{label}</span>
        <Money minor={value} short className="text-ink" />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/5">
        <div className="h-full rounded-full bg-indigo/60 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
