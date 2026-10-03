import { useState, useMemo } from 'react';
import { Plus, Search, AlertTriangle, Layers, X, Building2, TrendingDown } from 'lucide-react';
import { SectionHeader, Card, Eyebrow, Badge, Button, Money, EmptyState } from '@/components/ui';
import { fabrics, designs, orders } from '@/data/mock';
import { cn, formatDate } from '@/lib/utils';
import type { Fabric } from '@/data/types';

export function FabricPage() {
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return fabrics.filter((f) => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (lowStockOnly && f.totalOnHand - f.totalReserved > f.reorderPoint) return false;
      return true;
    });
  }, [search, lowStockOnly]);

  const selected = fabrics.find((f) => f.id === selectedId);

  return (
    <div className="animate-fade-in">
      <SectionHeader
        eyebrow="Create · Fabric"
        title="Fabric"
        description="Stock in metres, tracked by dye lot. Reserved on order confirmation, depleted at cutting, released on cancellation."
        action={<Button size="sm"><Plus className="size-3.5" /> New fabric</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-[2px] border border-ink/10 bg-milk px-3 py-2">
          <Search className="size-3.5 text-chalk" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fabric..."
            className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-chalk focus:outline-none"
          />
        </div>
        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={cn(
            'flex items-center gap-1.5 rounded-[2px] px-3 py-2 text-[12px] font-medium transition-colors',
            lowStockOnly ? 'bg-madder/10 text-madder' : 'bg-milk text-ink/60 hover:bg-ink/5',
          )}
        >
          <AlertTriangle className="size-3.5" />
          Low stock only
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((fabric) => {
          const available = fabric.totalOnHand - fabric.totalReserved;
          const isLow = available <= fabric.reorderPoint;
          return (
            <div
              key={fabric.id}
              onClick={() => setSelectedId(fabric.id)}
              className="group cursor-pointer rounded-[2px] border border-ink/8 bg-milk p-4 transition-all hover:border-ink/15 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="size-12 shrink-0 rounded-[2px] ring-1 ring-ink/10" style={{ backgroundColor: fabric.swatchColor }} />
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-[13px] font-medium text-ink">{fabric.name}</p>
                  <p className="text-[11px] text-chalk">{fabric.composition} · {fabric.weight}</p>
                  <p className="text-[11px] text-chalk">{fabric.supplier}</p>
                </div>
                {isLow && <Badge variant="error"><AlertTriangle className="size-2.5" /> Low</Badge>}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ink/5 pt-3 text-center">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-chalk">On hand</p>
                  <p className="font-data text-[13px] text-ink">{fabric.totalOnHand}m</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-chalk">Reserved</p>
                  <p className="font-data text-[13px] text-zari">{fabric.totalReserved}m</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-chalk">Available</p>
                  <p className={cn('font-data text-[13px] font-medium', isLow ? 'text-madder' : 'text-jade')}>{available.toFixed(1)}m</p>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-chalk">Cost: {(fabric.costPerMetreMinor / 100).toLocaleString()} PKR/m</span>
                <span className="text-[10px] text-chalk">Reorder at {fabric.reorderPoint}m</span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState title="No fabric found" message="Try a different search or add a new fabric." icon={<Layers className="size-8" />} />
      )}

      {selected && <FabricDetailDrawer fabric={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function FabricDetailDrawer({ fabric, onClose }: { fabric: Fabric; onClose: () => void }) {
  const relatedDesigns = designs.filter((d) => d.fabricId === fabric.id);
  const relatedOrders = orders.filter((o) =>
    o.items.some((i) => relatedDesigns.some((d) => d.id === i.designId)),
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 animate-fade-in" onClick={onClose}>
      <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-greige animate-slide-right scrollbar-thin" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/8 bg-greige/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-[2px] ring-1 ring-ink/10" style={{ backgroundColor: fabric.swatchColor }} />
            <div>
              <p className="font-display text-lg text-ink">{fabric.name}</p>
              <p className="text-[11px] text-chalk">{fabric.composition}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[13px] text-chalk hover:text-ink">Close</button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <Card>
            <Eyebrow className="mb-3">Properties</Eyebrow>
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <PropRow label="Weight" value={fabric.weight} />
              <PropRow label="Width" value={fabric.width} />
              <PropRow label="Drape" value={fabric.drape} />
              <PropRow label="Care" value={fabric.care} />
              <PropRow label="Cost / metre" value={`${(fabric.costPerMetreMinor / 100).toLocaleString()} PKR`} />
              <PropRow label="Reorder point" value={`${fabric.reorderPoint}m`} />
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Building2 className="size-4 text-indigo" />
              <Eyebrow>Dye lots · never split a garment across lots</Eyebrow>
            </div>
            <div className="flex flex-col gap-2">
              {fabric.lots.map((lot) => (
                <div key={lot.id} className="rounded-[2px] border border-ink/8 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-data text-[12px] font-medium text-ink">{lot.lotCode}</span>
                    <span className="text-[10px] text-chalk">Received {formatDate(lot.receivedDate)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                    <LotStat label="Received" value={`${lot.metresReceived}m`} />
                    <LotStat label="On hand" value={`${lot.metresOnHand}m`} />
                    <LotStat label="Reserved" value={`${lot.metresReserved}m`} />
                    <LotStat label="Available" value={`${(lot.metresOnHand - lot.metresReserved).toFixed(1)}m`} variant={lot.metresOnHand - lot.metresReserved < 5 ? 'warning' : 'success'} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <Eyebrow>Designs using this fabric</Eyebrow>
              <span className="font-data text-[12px] text-ink">{relatedDesigns.length}</span>
            </div>
            {relatedDesigns.length === 0 ? (
              <p className="text-[12px] text-chalk">No designs use this fabric yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {relatedDesigns.map((d) => (
                  <a key={d.id} href="#/designs" className="flex items-center justify-between rounded-[2px] bg-ink/[0.02] px-3 py-2 hover:bg-ink/[0.05]">
                    <div>
                      <p className="text-[12px] text-ink">{d.name}</p>
                      <p className="text-[10px] text-chalk">{d.fabricMeters}m per garment · {d.orderCount} orders</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <Eyebrow>Orders consuming this fabric</Eyebrow>
              <span className="font-data text-[12px] text-ink">{relatedOrders.length}</span>
            </div>
            {relatedOrders.length === 0 ? (
              <p className="text-[12px] text-chalk">No orders yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {relatedOrders.map((o) => (
                  <a key={o.id} href="#/orders" className="flex items-center justify-between rounded-[2px] bg-ink/[0.02] px-3 py-2 hover:bg-ink/[0.05]">
                    <div>
                      <p className="font-data text-[12px] text-ink">{o.number}</p>
                      <p className="text-[10px] text-chalk">{o.customerName} · {formatDate(o.date)}</p>
                    </div>
                    <Money minor={o.totalMinor} short className="text-[12px] text-ink" />
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wide text-chalk">{label}</span>
      <span className="text-[12px] text-ink">{value}</span>
    </div>
  );
}

function LotStat({ label, value, variant }: { label: string; value: string; variant?: 'success' | 'warning' }) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-wide text-chalk">{label}</p>
      <p className={cn('font-data text-[12px] font-medium', variant === 'warning' ? 'text-zari' : variant === 'success' ? 'text-jade' : 'text-ink')}>{value}</p>
    </div>
  );
}
