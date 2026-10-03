import {
  TrendingUp,
  Ruler,
  Repeat,
  Clock,
  MapPin,
  Palette,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { SectionHeader, Card, Eyebrow, Badge, Money } from '@/components/ui';
import { orders, designs, customers, fabrics } from '@/data/mock';
import { cn, formatDate, daysUntil, formatMoneyShort } from '@/lib/utils';

export function InsightsPage() {
  const totalRevenue = orders.filter((o) => o.paymentStatus === 'PAID').reduce((s, o) => s + o.totalMinor, 0);
  const totalOrders = orders.length;
  const repeatCustomers = customers.filter((c) => c.orderCount > 1).length;
  const repeatRate = (repeatCustomers / customers.length * 100).toFixed(0);

  const customOrders = orders.filter((o) => o.items.some((i) => i.sizeMode === 'CUSTOM')).length;
  const standardOrders = orders.filter((o) => o.items.some((i) => i.sizeMode === 'STANDARD')).length;
  const customPct = (customOrders / totalOrders * 100).toFixed(0);

  const sizesSold: Record<string, number> = {};
  orders.forEach((o) => o.items.forEach((i) => {
    if (i.sizeLabel) sizesSold[i.sizeLabel] = (sizesSold[i.sizeLabel] ?? 0) + 1;
  }));

  const citySales: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((o) => {
    const c = customers.find((c) => c.id === o.customerId);
    if (c) {
      citySales[c.city] = citySales[c.city] ?? { count: 0, revenue: 0 };
      citySales[c.city].count++;
      citySales[c.city].revenue += o.totalMinor;
    }
  });

  const salesByDesign: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((o) => o.items.forEach((i) => {
    salesByDesign[i.designName] = salesByDesign[i.designName] ?? { count: 0, revenue: 0 };
    salesByDesign[i.designName].count++;
    salesByDesign[i.designName].revenue += i.priceMinor;
  }));

  const leadTimes = orders
    .filter((o) => ['DELIVERED', 'COMPLETED', 'DISPATCHED'].includes(o.productionStatus))
    .map((o) => {
      const placed = new Date(o.date).getTime();
      const promised = new Date(o.promisedDate).getTime();
      return { number: o.number, promised: daysUntil(o.promisedDate), actual: Math.ceil((promised - placed) / (1000 * 60 * 60 * 24)) };
    });

  return (
    <div className="animate-fade-in">
      <SectionHeader
        eyebrow="Money · Insights"
        title="Insights"
        description="Derived reports from real orders — filterable, exportable, every row links to its entity."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Total revenue" value={formatMoneyShort(totalRevenue)} icon={<TrendingUp className="size-4" />} />
        <MiniStat label="Repeat rate" value={`${repeatRate}%`} hint={`${repeatCustomers} of ${customers.length}`} icon={<Repeat className="size-4" />} />
        <MiniStat label="Custom vs standard" value={`${customPct}% custom`} hint={`${customOrders} custom · ${standardOrders} standard`} icon={<Ruler className="size-4" />} />
        <MiniStat label="Avg order value" value={formatMoneyShort(totalRevenue / totalOrders)} icon={<ShoppingBag className="size-4" />} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Palette className="size-4 text-indigo" />
            <Eyebrow>Sales by design</Eyebrow>
          </div>
          <div className="flex flex-col gap-2">
            {Object.entries(salesByDesign)
              .sort(([, a], [, b]) => b.revenue - a.revenue)
              .map(([name, data]) => (
                <a key={name} href="#/designs" className="flex items-center justify-between rounded-[2px] bg-ink/[0.02] px-3 py-2.5 transition-colors hover:bg-ink/[0.05]">
                  <div className="flex-1">
                    <p className="text-[12.5px] font-medium text-ink">{name}</p>
                    <p className="text-[10px] text-chalk">{data.count} orders</p>
                  </div>
                  <Money minor={data.revenue} short className="text-[12.5px] text-ink" />
                </a>
              ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="size-4 text-indigo" />
            <Eyebrow>Sales by city</Eyebrow>
          </div>
          <div className="flex flex-col gap-2">
            {Object.entries(citySales)
              .sort(([, a], [, b]) => b.revenue - a.revenue)
              .map(([city, data]) => (
                <div key={city} className="flex items-center justify-between rounded-[2px] bg-ink/[0.02] px-3 py-2.5">
                  <div className="flex-1">
                    <p className="text-[12.5px] font-medium text-ink">{city}</p>
                    <p className="text-[10px] text-chalk">{data.count} orders</p>
                  </div>
                  <Money minor={data.revenue} short className="text-[12.5px] text-ink" />
                </div>
              ))}
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Ruler className="size-4 text-indigo" />
            <Eyebrow>Which sizes actually sell</Eyebrow>
          </div>
          <p className="mb-3 text-[11px] text-chalk">This tunes your pattern blocks — stock more of what moves.</p>
          <div className="flex flex-col gap-2">
            {Object.entries(sizesSold)
              .sort(([, a], [, b]) => b - a)
              .map(([size, count]) => {
                const maxCount = Math.max(...Object.values(sizesSold));
                const pct = (count / maxCount) * 100;
                return (
                  <div key={size} className="flex items-center gap-3">
                    <span className="w-10 text-[12px] font-medium text-ink">{size}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded-[2px] bg-ink/5">
                      <div className="flex h-full items-center rounded-[2px] bg-indigo/60 px-2 text-[10px] text-milk transition-all" style={{ width: `${pct}%` }}>
                        {count}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Clock className="size-4 text-indigo" />
            <Eyebrow>Promised vs actual lead time</Eyebrow>
          </div>
          <div className="flex flex-col gap-2">
            {leadTimes.map((lt) => (
              <div key={lt.number} className="flex items-center justify-between rounded-[2px] bg-ink/[0.02] px-3 py-2.5">
                <span className="font-data text-[12px] text-ink">{lt.number}</span>
                <div className="flex gap-4 text-[12px]">
                  <span className="text-chalk">Promised: {lt.actual}d</span>
                  <span className={cn('font-medium', lt.promised < 0 ? 'text-madder' : 'text-jade')}>
                    {lt.promised < 0 ? `${Math.abs(lt.promised)}d overdue` : `${lt.promised}d left`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Layers className="size-4 text-indigo" />
          <Eyebrow>Fabric consumption</Eyebrow>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {fabrics.map((f) => {
            const consumingDesigns = designs.filter((d) => d.fabricId === f.id);
            const totalConsumed = consumingDesigns.reduce((s, d) => s + d.fabricMeters * d.orderCount, 0);
            return (
              <div key={f.id} className="flex items-center gap-3 rounded-[2px] bg-ink/[0.02] px-3 py-2.5">
                <div className="size-8 rounded-[2px] ring-1 ring-ink/10" style={{ backgroundColor: f.swatchColor }} />
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-ink">{f.name}</p>
                  <p className="text-[10px] text-chalk">{consumingDesigns.length} designs · {totalConsumed.toFixed(1)}m consumed</p>
                </div>
                <div className="text-right">
                  <p className="font-data text-[12px] text-ink">{f.totalOnHand}m</p>
                  <p className="text-[9px] text-chalk">on hand</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Eyebrow>{label}</Eyebrow>
        <span className="text-chalk">{icon}</span>
      </div>
      <p className="font-data text-xl font-medium text-ink">{value}</p>
      {hint && <p className="text-[10px] text-chalk">{hint}</p>}
    </Card>
  );
}


