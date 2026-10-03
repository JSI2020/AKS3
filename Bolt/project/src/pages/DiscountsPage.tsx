import { Plus, Percent, Calendar, Tag, TrendingUp } from 'lucide-react';
import { SectionHeader, Card, Eyebrow, Badge, Button, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Discount {
  id: string;
  name: string;
  code: string;
  type: 'PERCENTAGE' | 'FLAT';
  value: number;
  active: boolean;
  uses: number;
  maxUses: number | null;
  expiresAt: string | null;
}

const discounts: Discount[] = [
  { id: 'd1', name: 'Eid Sale', code: 'EID2026', type: 'PERCENTAGE', value: 15, active: true, uses: 34, maxUses: 100, expiresAt: '2026-09-15' },
  { id: 'd2', name: 'First Order', code: 'WELCOME10', type: 'PERCENTAGE', value: 10, active: true, uses: 12, maxUses: null, expiresAt: null },
  { id: 'd3', name: 'Summer Clearance', code: 'CLEAR20', type: 'PERCENTAGE', value: 20, active: false, uses: 45, maxUses: 50, expiresAt: '2026-08-31' },
  { id: 'd4', name: 'Flat PKR 500 Off', code: 'FLAT500', type: 'FLAT', value: 500, active: true, uses: 8, maxUses: null, expiresAt: null },
];

export function DiscountsPage() {
  return (
    <div className="animate-fade-in">
      <SectionHeader
        eyebrow="Sell · Discounts"
        title="Discounts"
        description="Discount codes for your storefront. Select from these everywhere — never retype a discount."
        action={<Button size="sm"><Plus className="size-3.5" /> New discount</Button>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>Active discounts</Eyebrow>
            <Percent className="size-4 text-chalk" />
          </div>
          <p className="mt-1 font-data text-2xl text-ink">{discounts.filter((d) => d.active).length}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>Total uses</Eyebrow>
            <TrendingUp className="size-4 text-chalk" />
          </div>
          <p className="mt-1 font-data text-2xl text-ink">{discounts.reduce((s, d) => s + d.uses, 0)}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>Expiring soon</Eyebrow>
            <Calendar className="size-4 text-chalk" />
          </div>
          <p className="mt-1 font-data text-2xl text-zari">1</p>
        </Card>
      </div>

      {discounts.length === 0 ? (
        <EmptyState
          title="No discounts yet"
          message="Create discount codes for seasonal sales, first-order offers, or clearance events."
          action={<Button size="sm"><Plus className="size-3.5" /> New discount</Button>}
          icon={<Percent className="size-8" />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {discounts.map((discount) => (
            <Card key={discount.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('flex size-10 items-center justify-center rounded-[2px]', discount.active ? 'bg-jade/10' : 'bg-ink/5')}>
                    <Percent className={cn('size-5', discount.active ? 'text-jade' : 'text-chalk')} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-ink">{discount.name}</p>
                    <p className="font-data text-[12px] text-indigo">{discount.code}</p>
                  </div>
                </div>
                <Badge variant={discount.active ? 'success' : 'neutral'}>{discount.active ? 'Active' : 'Inactive'}</Badge>
              </div>

              <div className="flex items-center gap-4 border-t border-ink/5 pt-3">
                <div className="flex flex-1 flex-col">
                  <span className="text-[9px] uppercase tracking-wide text-chalk">Value</span>
                  <span className="font-data text-[14px] text-ink">
                    {discount.type === 'PERCENTAGE' ? `${discount.value}%` : `PKR ${discount.value.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-[9px] uppercase tracking-wide text-chalk">Uses</span>
                  <span className="font-data text-[14px] text-ink">
                    {discount.uses}{discount.maxUses && ` / ${discount.maxUses}`}
                  </span>
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-[9px] uppercase tracking-wide text-chalk">Expires</span>
                  <span className="text-[12px] text-ink">{discount.expiresAt ?? 'Never'}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
