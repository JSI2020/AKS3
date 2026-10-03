import { useState } from 'react';
import { ChevronRight, Users, AlertTriangle } from 'lucide-react';
import { SectionHeader, Card, Eyebrow, Badge } from '@/components/ui';
import { orders, staff } from '@/data/mock';
import { cn, formatDate, daysUntil } from '@/lib/utils';
import {
  productionStatusLabel,
  productionStatusColor,
  PRODUCTION_PIPELINE,
} from '@/lib/status';
import type { ProductionStatus, Order } from '@/data/types';

const BOARD_COLUMNS: { status: ProductionStatus; label: string }[] = [
  { status: 'RECEIVED', label: 'Received' },
  { status: 'CONFIRMED', label: 'Confirmed' },
  { status: 'MEASUREMENTS_VERIFIED', label: 'Measurements Verified' },
  { status: 'CUTTING', label: 'Cutting' },
  { status: 'STITCHING', label: 'Stitching' },
  { status: 'EMBROIDERY', label: 'Embroidery' },
  { status: 'FINISHING', label: 'Finishing' },
  { status: 'QUALITY_CHECK', label: 'Quality Check' },
  { status: 'PACKED', label: 'Packed' },
  { status: 'DISPATCHED', label: 'Dispatched' },
];

export function ProductionPage() {
  const [advancing, setAdvancing] = useState<string | null>(null);

  const ordersByStatus: Record<string, Order[]> = {};
  BOARD_COLUMNS.forEach((col) => {
    ordersByStatus[col.status] = orders.filter((o) => o.productionStatus === col.status);
  });

  const tailors = staff.filter((s) => s.role === 'TAILOR' && s.active);

  return (
    <div className="animate-fade-in">
      <SectionHeader
        eyebrow="Workshop"
        title="Production"
        description="Drag a card to the next column to advance. Touch-first — built for the workshop floor."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {tailors.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-[2px] border border-ink/8 bg-milk px-3 py-1.5">
            <div className="flex size-6 items-center justify-center rounded-full bg-indigo/10">
              <Users className="size-3 text-indigo" />
            </div>
            <span className="text-[12px] text-ink">{t.name}</span>
            <Badge variant={t.currentJobs > 0 ? 'warning' : 'success'}>{t.currentJobs} active</Badge>
          </div>
        ))}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
        {BOARD_COLUMNS.map((col) => {
          const colOrders = ordersByStatus[col.status] ?? [];
          return (
            <div key={col.status} className="flex w-[240px] shrink-0 flex-col gap-2">
              <div className="flex items-center justify-between rounded-[2px] bg-ink/[0.03] px-3 py-2">
                <span className="font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">{col.label}</span>
                <span className={cn('flex size-5 items-center justify-center rounded-full text-[10px] font-medium', colOrders.length > 0 ? 'bg-indigo text-milk' : 'bg-ink/5 text-chalk')}>
                  {colOrders.length}
                </span>
              </div>

              {colOrders.length === 0 ? (
                <div className="rounded-[2px] border border-dashed border-ink/10 py-8 text-center">
                  <p className="text-[10px] text-chalk/50">Empty</p>
                </div>
              ) : (
                colOrders.map((order) => {
                  const daysToDue = daysUntil(order.promisedDate);
                  const isAtRisk = order.atRisk || daysToDue < 0;
                  const isAdvancing = advancing === order.id;
                  const currentIdx = PRODUCTION_PIPELINE.indexOf(order.productionStatus);
                  const nextStatus = currentIdx >= 0 && currentIdx < PRODUCTION_PIPELINE.length - 1
                    ? PRODUCTION_PIPELINE[currentIdx + 1]
                    : null;

                  return (
                    <div
                      key={order.id}
                      className={cn(
                        'rounded-[2px] border bg-milk p-3 transition-all',
                        isAtRisk ? 'border-l-[3px] border-l-madder border-ink/8' : 'border-ink/8',
                        isAdvancing && 'ring-2 ring-indigo',
                      )}
                    >
                      <a href="#/orders" className="block">
                        <p className="font-data text-[11px] font-medium text-ink">{order.number}</p>
                        <p className="mt-0.5 text-[12px] text-ink">{order.customerName}</p>
                        <p className="mt-0.5 text-[10px] text-chalk">{order.items[0]?.designName}</p>
                      </a>

                      <div className="mt-2 flex items-center gap-2">
                        {order.assignedKarigar && (
                          <span className="rounded-[2px] bg-ink/5 px-1.5 py-0.5 text-[9px] text-chalk">{order.assignedKarigar}</span>
                        )}
                        {isAtRisk && (
                          <span className="flex items-center gap-0.5 text-[9px] text-madder">
                            <AlertTriangle className="size-2.5" />
                            {daysToDue < 0 ? `${Math.abs(daysToDue)}d overdue` : `${daysToDue}d left`}
                          </span>
                        )}
                        {!isAtRisk && (
                          <span className="text-[9px] text-chalk">{daysToDue}d left</span>
                        )}
                      </div>

                      {nextStatus && (
                        <button
                          onClick={() => setAdvancing(advancing === order.id ? null : order.id)}
                          className="mt-2 flex w-full items-center justify-between rounded-[2px] bg-indigo/5 px-2 py-1 text-[10px] text-indigo transition-colors hover:bg-indigo/10"
                        >
                          <span>Advance to {productionStatusLabel(nextStatus)}</span>
                          <ChevronRight className="size-3" />
                        </button>
                      )}

                      {isAdvancing && nextStatus && (
                        <div className="mt-2 rounded-[2px] border border-indigo/20 bg-indigo/5 p-2 animate-slide-up">
                          <p className="text-[10px] text-chalk">Move to {productionStatusLabel(nextStatus)}?</p>
                          <p className="text-[9px] text-chalk">Customer notified via email + WhatsApp automatically.</p>
                          <div className="mt-2 flex gap-1.5">
                            <button
                              onClick={() => setAdvancing(null)}
                              className="flex-1 rounded-[2px] bg-indigo px-2 py-1 text-[10px] font-medium text-milk"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setAdvancing(null)}
                              className="rounded-[2px] bg-ink/5 px-2 py-1 text-[10px] text-chalk"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <Eyebrow>Total in production</Eyebrow>
          <p className="mt-1 font-data text-2xl text-ink">{orders.filter((o) => !['COMPLETED', 'CANCELLED', 'REFUNDED', 'DELIVERY_REFUSED'].includes(o.productionStatus)).length}</p>
        </Card>
        <Card>
          <Eyebrow>At risk</Eyebrow>
          <p className="mt-1 font-data text-2xl text-madder">{orders.filter((o) => o.atRisk).length}</p>
        </Card>
        <Card>
          <Eyebrow>Active karigars</Eyebrow>
          <p className="mt-1 font-data text-2xl text-ink">{tailors.length}</p>
        </Card>
      </div>
    </div>
  );
}
