import { useState, useMemo } from 'react';
import {
  Plus,
  Filter,
  Download,
  ChevronRight,
  X,
  MapPin,
  CreditCard,
  Clock,
  MessageSquare,
  FileText,
  Package,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { SectionHeader, Card, Eyebrow, Badge, Button, Money, EmptyState } from '@/components/ui';
import { orders } from '@/data/mock';
import { cn, formatDate, formatDateTime, daysUntil } from '@/lib/utils';
import {
  productionStatusLabel,
  productionStatusColor,
  paymentStatusLabel,
  paymentStatusColor,
  PRODUCTION_PIPELINE,
} from '@/lib/status';
import type { Order, ProductionStatus } from '@/data/types';

const STATUS_FILTERS: { label: string; value: ProductionStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Received', value: 'RECEIVED' },
  { label: 'In Production', value: 'STITCHING' },
  { label: 'At Risk', value: 'AT_RISK' as any },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'Completed', value: 'COMPLETED' },
];

export function OrdersPage() {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search && !o.number.toLowerCase().includes(search.toLowerCase()) && !o.customerName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'ALL') return true;
      if (filter === 'AT_RISK') return o.atRisk;
      if (filter === 'STITCHING') return ['CUTTING', 'STITCHING', 'EMBROIDERY', 'FINISHING', 'QUALITY_CHECK'].includes(o.productionStatus);
      return o.productionStatus === filter;
    });
  }, [filter, search]);

  const selected = orders.find((o) => o.id === selectedId);

  return (
    <div className="animate-fade-in">
      <SectionHeader
        eyebrow="Sell"
        title="Orders"
        description="The spine of your business — two independent tracks: production status and payment status."
        action={
          <>
            <Button variant="secondary" size="sm"><Download className="size-3.5" /> Export</Button>
            <Button size="sm"><Plus className="size-3.5" /> New order</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-[2px] border border-ink/10 bg-milk px-3 py-2">
          <Filter className="size-3.5 text-chalk" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number or customer..."
            className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-chalk focus:outline-none"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'whitespace-nowrap rounded-[2px] px-3 py-1.5 text-[12px] font-medium transition-colors',
                filter === f.value ? 'bg-indigo text-greige' : 'bg-milk text-ink/60 hover:bg-ink/5',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No orders here"
          message="No orders match this filter. Try a different status or clear the search."
          icon={<Package className="size-8" />}
        />
      ) : (
        <div className="overflow-hidden rounded-[2px] border border-ink/8 bg-milk">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink/8 bg-ink/[0.02]">
                  <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Order</th>
                  <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Customer</th>
                  <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Date</th>
                  <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Production</th>
                  <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Payment</th>
                  <th className="px-4 py-3 text-right font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Total</th>
                  <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Due</th>
                  <th className="px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const daysToDue = daysUntil(order.promisedDate);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedId(order.id)}
                      className="cursor-pointer border-b border-ink/5 transition-colors hover:bg-ink/[0.02] last:border-0"
                    >
                      <td className="px-4 py-3">
                        <span className="font-data text-[12px] font-medium text-ink">{order.number}</span>
                        {order.atRisk && <AlertTriangle className="ml-1.5 inline size-3.5 text-madder" />}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-ink">{order.customerName}</td>
                      <td className="px-4 py-3 text-[12px] text-chalk">{formatDate(order.date)}</td>
                      <td className="px-4 py-3"><Badge variant={productionStatusColor(order.productionStatus)}>{productionStatusLabel(order.productionStatus)}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={paymentStatusColor(order.paymentStatus)}>{paymentStatusLabel(order.paymentStatus)}</Badge></td>
                      <td className="px-4 py-3 text-right"><Money minor={order.totalMinor} className="text-[12.5px] text-ink" /></td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[12px]', daysToDue < 0 ? 'text-madder' : daysToDue <= 3 ? 'text-zari' : 'text-chalk')}>
                          {daysToDue < 0 ? `${Math.abs(daysToDue)}d overdue` : `${daysToDue}d`}
                        </span>
                      </td>
                      <td className="px-2 py-3"><ChevronRight className="size-4 text-chalk" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && <OrderDetailDrawer order={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function OrderDetailDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const currentStageIndex = PRODUCTION_PIPELINE.indexOf(order.productionStatus);
  const nextStage = currentStageIndex >= 0 && currentStageIndex < PRODUCTION_PIPELINE.length - 1
    ? PRODUCTION_PIPELINE[currentStageIndex + 1]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 animate-fade-in" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-greige animate-slide-right scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/8 bg-greige/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="font-data text-[13px] font-medium text-ink">{order.number}</p>
            <p className="text-[11px] text-chalk">{formatDate(order.date)} · via {order.source}</p>
          </div>
          <button onClick={onClose} className="rounded-[2px] p-1 text-chalk hover:bg-ink/5 hover:text-ink">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant={productionStatusColor(order.productionStatus)}>{productionStatusLabel(order.productionStatus)}</Badge>
            <Badge variant={paymentStatusColor(order.paymentStatus)}>{paymentStatusLabel(order.paymentStatus)}</Badge>
            {order.atRisk && <Badge variant="error"><AlertTriangle className="size-3" /> At risk</Badge>}
          </div>

          <Card>
            <Eyebrow className="mb-2">Customer</Eyebrow>
            <p className="font-display text-lg text-ink">{order.customerName}</p>
            <div className="mt-2 flex flex-col gap-1 text-[12px] text-chalk">
              <span>{order.customerPhone}</span>
              <span>{order.customerEmail}</span>
            </div>
          </Card>

          <Card>
            <Eyebrow className="mb-2">Shipping address</Eyebrow>
            <div className="flex gap-2 text-[12.5px] text-ink">
              <MapPin className="size-4 shrink-0 text-chalk" />
              <span>{order.shippingAddress}</span>
            </div>
          </Card>

          <Card>
            <Eyebrow className="mb-3">Items</Eyebrow>
            {order.items.map((item) => (
              <div key={item.id} className="border-b border-ink/5 py-2 last:border-0 last:py-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{item.designName}</p>
                    <p className="text-[11px] text-chalk">{item.colourway} · {item.sizeMode === 'STANDARD' ? `Size ${item.sizeLabel}` : 'Custom measurements'}</p>
                  </div>
                  <Money minor={item.priceMinor} className="text-[13px] text-ink" />
                </div>
                {item.customizations.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.customizations.map((c) => (
                      <Badge key={c} variant="neutral">{c}</Badge>
                    ))}
                  </div>
                )}
                {item.customMeasurements && (
                  <div className="mt-2 grid grid-cols-4 gap-2 rounded-[2px] bg-ink/[0.02] p-2">
                    {Object.entries(item.customMeasurements).map(([key, val]) => (
                      <div key={key}>
                        <p className="text-[9px] uppercase tracking-wide text-chalk">{key}</p>
                        <p className="font-data text-[12px] text-ink">{val}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <Eyebrow className="mb-2">Payment</Eyebrow>
              <div className="flex flex-col gap-1.5 text-[12px]">
                <div className="flex justify-between"><span className="text-chalk">Method</span><span className="text-ink">{order.paymentMethod.replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-chalk">Total</span><Money minor={order.totalMinor} className="text-ink" /></div>
                <div className="flex justify-between"><span className="text-chalk">Deposit</span><Money minor={order.depositMinor} className="text-jade" /></div>
                <div className="flex justify-between"><span className="text-chalk">Balance</span><Money minor={order.balanceMinor} className={order.balanceMinor > 0 ? 'text-madder' : 'text-jade'} /></div>
              </div>
            </Card>
            <Card>
              <Eyebrow className="mb-2">Production</Eyebrow>
              <div className="flex flex-col gap-1.5 text-[12px]">
                <div className="flex justify-between"><span className="text-chalk">Karigar</span><span className="text-ink">{order.assignedKarigar ?? 'Not assigned'}</span></div>
                <div className="flex items-center justify-between"><span className="text-chalk">Promised</span><span className="flex items-center gap-1 text-ink"><Calendar className="size-3" />{formatDate(order.promisedDate)}</span></div>
                <div className="flex justify-between"><span className="text-chalk">Days left</span><span className={cn(daysUntil(order.promisedDate) < 0 ? 'text-madder' : 'text-ink')}>{daysUntil(order.promisedDate) < 0 ? `${Math.abs(daysUntil(order.promisedDate))}d overdue` : `${daysUntil(order.promisedDate)}d`}</span></div>
              </div>
            </Card>
          </div>

          {nextStage && (
            <div className="rounded-[2px] border border-indigo/20 bg-indigo/5 p-4">
              <Eyebrow className="mb-2">Advance production</Eyebrow>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-ink">{productionStatusLabel(order.productionStatus)}</span>
                <ChevronRight className="size-4 text-chalk" />
                <span className="text-[12px] font-medium text-indigo">{productionStatusLabel(nextStage)}</span>
                <Button size="sm" className="ml-auto" onClick={() => {}}>Advance to {productionStatusLabel(nextStage)}</Button>
              </div>
              <p className="mt-2 text-[10px] text-chalk">Customer will be notified automatically via email and WhatsApp.</p>
            </div>
          )}

          <Card>
            <Eyebrow className="mb-3">Timeline</Eyebrow>
            <div className="flex flex-col gap-3">
              {order.timeline.map((event) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="size-2 rounded-full bg-indigo" />
                    {event !== order.timeline[order.timeline.length - 1] && <div className="w-px flex-1 bg-ink/10" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-ink">{productionStatusLabel(event.toStatus)}</span>
                      {event.notified && <Badge variant="success"><MessageSquare className="size-2.5" /> Notified</Badge>}
                    </div>
                    <p className="text-[11px] text-chalk">{event.remark || 'No remark'}</p>
                    <p className="text-[10px] text-chalk/60">{formatDateTime(event.timestamp)} · {event.actor}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {order.customerRemarks && (
            <Card className="border-l-[3px] border-l-sky pl-4">
              <Eyebrow className="mb-1">Customer note</Eyebrow>
              <p className="text-[12.5px] text-ink">{order.customerRemarks}</p>
            </Card>
          )}

          {order.internalRemarks && (
            <Card className="border-l-[3px] border-l-zari pl-4">
              <Eyebrow className="mb-1">Internal remarks</Eyebrow>
              <p className="text-[12.5px] text-ink">{order.internalRemarks}</p>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><FileText className="size-3.5" /> Invoice</Button>
            <Button variant="secondary" size="sm"><Package className="size-3.5" /> Packing slip</Button>
            <Button variant="secondary" size="sm"><CreditCard className="size-3.5" /> Tailor spec</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
