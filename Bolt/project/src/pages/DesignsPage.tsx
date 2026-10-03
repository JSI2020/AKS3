import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Copy,
  Eye,
  TrendingUp,
  Layers,
  Palette,
  Sparkles,
  Package,
  ChevronRight,
} from 'lucide-react';
import { SectionHeader, Card, Eyebrow, Badge, Button, Money, EmptyState } from '@/components/ui';
import { designs, fabrics, orders } from '@/data/mock';
import { cn, formatDate } from '@/lib/utils';
import { designStatusLabel, designStatusColor } from '@/lib/status';
import type { Design } from '@/data/types';

export function DesignsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return designs.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      return true;
    });
  }, [search, statusFilter]);

  const selected = designs.find((d) => d.id === selectedId);

  return (
    <div className="animate-fade-in">
      <SectionHeader
        eyebrow="Create · Designs"
        title="Designs"
        description="Your catalog — each design's cost and margin computed automatically from fabric, rates, trims, and AI spend."
        action={<Button size="sm"><Plus className="size-3.5" /> New design</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-[2px] border border-ink/10 bg-milk px-3 py-2">
          <Search className="size-3.5 text-chalk" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search designs..."
            className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-chalk focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-[2px] px-3 py-1.5 text-[12px] font-medium transition-colors',
                statusFilter === s ? 'bg-indigo text-greige' : 'bg-milk text-ink/60 hover:bg-ink/5',
              )}
            >
              {s === 'ALL' ? 'All' : designStatusLabel(s as any)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No designs yet"
          message="Create your first design to start building your catalog. The cost breakdown will compute itself."
          action={<Button size="sm"><Plus className="size-3.5" /> New design</Button>}
          icon={<Palette className="size-8" />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((design) => (
            <DesignCard key={design.id} design={design} onClick={() => setSelectedId(design.id)} />
          ))}
        </div>
      )}

      {selected && <DesignDetailDrawer design={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function DesignCard({ design, onClick }: { design: Design; onClick: () => void }) {
  const fabric = fabrics.find((f) => f.id === design.fabricId);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-[2px] border border-ink/8 bg-milk transition-all hover:border-ink/15 hover:shadow-sm"
    >
      <div
        className="relative flex h-40 items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${fabric?.swatchColor ?? '#1e2152'}22, ${fabric?.swatchColor ?? '#1e2152'}66)` }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: `radial-gradient(circle at 30% 40%, ${fabric?.swatchColor ?? '#1e2152'}88, transparent 60%)` }}
        />
        <div className="relative flex flex-col items-center gap-2 text-center">
          <Palette className="size-8 text-milk/70" />
          <p className="font-display text-lg text-milk/90">{design.name}</p>
        </div>
        <div className="absolute right-2 top-2">
          <Badge variant={designStatusColor(design.status)}>{designStatusLabel(design.status)}</Badge>
        </div>
        {design.featured && (
          <div className="absolute left-2 top-2">
            <Badge variant="accent"><Sparkles className="size-2.5" /> Featured</Badge>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-wide text-chalk">{design.category}</p>
            <p className="text-[11px] text-chalk">{design.occasion.join(' · ')}</p>
          </div>
          {design.sellingPriceMinor > 0 && <Money minor={design.sellingPriceMinor} className="text-[14px] font-medium text-ink" />}
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-ink/5 pt-3">
          <div className="flex flex-1 flex-col">
            <span className="text-[9px] uppercase tracking-wide text-chalk">Margin</span>
            <span className={cn('font-data text-[13px] font-medium', design.marginPercent > 60 ? 'text-jade' : design.marginPercent > 40 ? 'text-zari' : design.marginPercent > 0 ? 'text-madder' : 'text-chalk')}>
              {design.marginPercent > 0 ? `${design.marginPercent.toFixed(1)}%` : '—'}
            </span>
          </div>
          <div className="flex flex-1 flex-col">
            <span className="text-[9px] uppercase tracking-wide text-chalk">Orders</span>
            <span className="font-data text-[13px] text-ink">{design.orderCount}</span>
          </div>
          <div className="flex flex-1 flex-col">
            <span className="text-[9px] uppercase tracking-wide text-chalk">Revenue</span>
            <Money minor={design.revenueMinor} short className="text-[13px] text-ink" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignDetailDrawer({ design, onClose }: { design: Design; onClose: () => void }) {
  const fabric = fabrics.find((f) => f.id === design.fabricId);
  const designOrders = orders.filter((o) => o.items.some((i) => i.designId === design.id));
  const fabricCost = design.fabricMeters * (fabric?.costPerMetreMinor ?? 0);

  const costLines = [
    { label: `Fabric (${design.fabricMeters}m × ${fabric ? (fabric.costPerMetreMinor / 100).toLocaleString() : 0}/m)`, value: fabricCost },
    { label: 'Embroidery', value: design.embroideryCostMinor },
    { label: 'Stitching', value: design.stitchingCostMinor },
    { label: 'Trims', value: design.trimsCostMinor },
    { label: 'Packaging', value: design.packagingCostMinor },
    { label: 'AI generation', value: design.aiCostMinor },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 animate-fade-in" onClick={onClose}>
      <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-greige animate-slide-right scrollbar-thin" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/8 bg-greige/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="font-display text-lg text-ink">{design.name}</p>
            <p className="text-[11px] text-chalk">Created {formatDate(design.createdAt)}</p>
          </div>
          <button onClick={onClose} className="text-[13px] text-chalk hover:text-ink">Close</button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant={designStatusColor(design.status)}>{designStatusLabel(design.status)}</Badge>
            <Badge variant="neutral">{design.category}</Badge>
            <Badge variant="neutral">{design.season}</Badge>
            {design.featured && <Badge variant="accent"><Sparkles className="size-2.5" /> Featured</Badge>}
          </div>

          <div
            className="flex h-32 items-center justify-center rounded-[2px]"
            style={{ background: `linear-gradient(135deg, ${fabric?.swatchColor ?? '#1e2152'}33, ${fabric?.swatchColor ?? '#1e2152'}88)` }}
          >
            <Palette className="size-10 text-milk/60" />
          </div>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="size-4 text-indigo" />
              <Eyebrow>Cost breakdown · computed</Eyebrow>
            </div>
            <div className="flex flex-col gap-2">
              {costLines.map((line) => (
                <div key={line.label} className="flex justify-between text-[12.5px]">
                  <span className="text-chalk">{line.label}</span>
                  <Money minor={line.value} className="text-ink" />
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-ink/10 pt-2">
                <span className="text-[13px] font-medium text-ink">Total cost</span>
                <Money minor={design.totalCostMinor} className="text-[14px] font-medium text-ink" />
              </div>
              <div className="flex justify-between">
                <span className="text-[13px] font-medium text-ink">Selling price</span>
                <Money minor={design.sellingPriceMinor} className="text-[14px] font-medium text-ink" />
              </div>
              <div className="flex justify-between rounded-[2px] bg-ink/[0.03] px-2 py-1.5">
                <span className="text-[13px] font-medium text-ink">Margin</span>
                <span className={cn('font-data text-[14px] font-medium', design.marginPercent > 60 ? 'text-jade' : design.marginPercent > 40 ? 'text-zari' : 'text-madder')}>
                  {design.marginPercent > 0 ? `${design.marginPercent.toFixed(1)}%` : 'Set a price'}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <Eyebrow className="mb-2">Fabric</Eyebrow>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-[2px]" style={{ backgroundColor: fabric?.swatchColor }} />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-ink">{design.fabricName}</p>
                <p className="text-[11px] text-chalk">{design.fabricMeters}m needed · {(fabric?.costPerMetreMinor ?? 0) / 100} PKR/m</p>
              </div>
              <Layers className="size-4 text-chalk" />
            </div>
            <div className="mt-2 flex gap-4 text-[11px] text-chalk">
              <span>On hand: {fabric?.totalOnHand}m</span>
              <span>Reserved: {fabric?.totalReserved}m</span>
              <span>Available: {(fabric?.totalOnHand ?? 0) - (fabric?.totalReserved ?? 0)}m</span>
            </div>
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <Eyebrow>Orders with this design</Eyebrow>
              <span className="font-data text-[12px] text-ink">{designOrders.length}</span>
            </div>
            {designOrders.length === 0 ? (
              <p className="text-[12px] text-chalk">No orders yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {designOrders.map((order) => (
                  <a key={order.id} href="#/orders" className="flex items-center justify-between rounded-[2px] bg-ink/[0.02] px-3 py-2 transition-colors hover:bg-ink/[0.05]">
                    <div>
                      <p className="font-data text-[12px] text-ink">{order.number}</p>
                      <p className="text-[10px] text-chalk">{order.customerName} · {formatDate(order.date)}</p>
                    </div>
                    <ChevronRight className="size-3.5 text-chalk" />
                  </a>
                ))}
              </div>
            )}
          </Card>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Eye className="size-3.5" /> View on site</Button>
            <Button variant="secondary" size="sm"><Copy className="size-3.5" /> Duplicate</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
