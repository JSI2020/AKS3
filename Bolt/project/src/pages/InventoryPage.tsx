import { Package, Layers, Scissors, Box, AlertTriangle } from 'lucide-react';
import { SectionHeader, Card, Eyebrow, Badge, Money } from '@/components/ui';
import { fabrics, trims, designs } from '@/data/mock';
import { cn } from '@/lib/utils';

export function InventoryPage() {
  const fabricItems = fabrics.map((f) => ({
    id: f.id,
    name: f.name,
    type: 'Fabric',
    swatchColor: f.swatchColor,
    onHand: f.totalOnHand,
    reserved: f.totalReserved,
    unit: 'metres',
    available: f.totalOnHand - f.totalReserved,
    reorderPoint: f.reorderPoint,
  }));

  const trimItems = trims.map((t) => ({
    id: t.id,
    name: t.name,
    type: 'Trim',
    swatchColor: '#8a8578',
    onHand: t.stock,
    reserved: 0,
    unit: t.unit + 's',
    available: t.stock,
    reorderPoint: 20,
  }));

  const allItems = [...fabricItems, ...trimItems];
  const lowStock = allItems.filter((i) => i.available <= i.reorderPoint);

  return (
    <div className="animate-fade-in">
      <SectionHeader
        eyebrow="Make · Inventory"
        title="Inventory"
        description="Fabric in metres, trims in units. Reserved quantities are derived from confirmed orders — never manually entered."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>Total items</Eyebrow>
            <Package className="size-4 text-chalk" />
          </div>
          <p className="mt-1 font-data text-2xl text-ink">{allItems.length}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>Fabric in stock</Eyebrow>
            <Layers className="size-4 text-chalk" />
          </div>
          <p className="mt-1 font-data text-2xl text-ink">{fabrics.reduce((s, f) => s + f.totalOnHand, 0).toFixed(1)}m</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>Reserved</Eyebrow>
            <Box className="size-4 text-chalk" />
          </div>
          <p className="mt-1 font-data text-2xl text-zari">{fabrics.reduce((s, f) => s + f.totalReserved, 0).toFixed(1)}m</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow>Low stock alerts</Eyebrow>
            <AlertTriangle className="size-4 text-madder" />
          </div>
          <p className="mt-1 font-data text-2xl text-madder">{lowStock.length}</p>
        </Card>
      </div>

      <div className="overflow-hidden rounded-[2px] border border-ink/8 bg-milk">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-ink/8 bg-ink/[0.02]">
                <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Item</th>
                <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Type</th>
                <th className="px-4 py-3 text-right font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">On hand</th>
                <th className="px-4 py-3 text-right font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Reserved</th>
                <th className="px-4 py-3 text-right font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Available</th>
                <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Status</th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item) => {
                const isLow = item.available <= item.reorderPoint;
                return (
                  <tr key={item.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="size-4 rounded-[2px] ring-1 ring-ink/10" style={{ backgroundColor: item.swatchColor }} />
                        <span className="text-[12.5px] font-medium text-ink">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant={item.type === 'Fabric' ? 'accent' : 'neutral'}>{item.type}</Badge></td>
                    <td className="px-4 py-3 text-right font-data text-[12px] text-ink">{item.onHand} {item.unit}</td>
                    <td className="px-4 py-3 text-right font-data text-[12px] text-zari">{item.reserved} {item.unit}</td>
                    <td className="px-4 py-3 text-right font-data text-[12px] font-medium text-ink">{item.available.toFixed(1)} {item.unit}</td>
                    <td className="px-4 py-3">
                      {isLow ? <Badge variant="error"><AlertTriangle className="size-2.5" /> Low</Badge> : <Badge variant="success">OK</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
