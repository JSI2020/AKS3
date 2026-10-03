import { useState, useMemo } from 'react';
import { Search, Download, Users, X, ShoppingBag, MapPin, Tag, Ban } from 'lucide-react';
import { SectionHeader, Card, Eyebrow, Badge, Button, Money, EmptyState } from '@/components/ui';
import { customers, orders } from '@/data/mock';
import { cn, formatDate } from '@/lib/utils';
import type { Customer } from '@/data/types';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q);
    });
  }, [search]);

  const selected = customers.find((c) => c.id === selectedId);

  return (
    <div className="animate-fade-in">
      <SectionHeader
        eyebrow="Sell · Customers"
        title="Customers"
        description="People, history, and saved measurements. Customers are created automatically by orders."
        action={<Button variant="secondary" size="sm"><Download className="size-3.5" /> Export</Button>}
      />

      <div className="mb-4 flex items-center gap-2 rounded-[2px] border border-ink/10 bg-milk px-3 py-2">
        <Search className="size-3.5 text-chalk" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, WhatsApp, or email..."
          className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-chalk focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No customers found" message="Try a different search." icon={<Users className="size-8" />} />
      ) : (
        <div className="overflow-hidden rounded-[2px] border border-ink/8 bg-milk">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink/8 bg-ink/[0.02]">
                  <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Name</th>
                  <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Contact</th>
                  <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">City</th>
                  <th className="px-4 py-3 text-right font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Orders</th>
                  <th className="px-4 py-3 text-right font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">LTV</th>
                  <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Last order</th>
                  <th className="px-4 py-3 font-sans text-[10px] font-medium uppercase tracking-[0.1em] text-chalk">Tags</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => setSelectedId(customer.id)}
                    className="cursor-pointer border-b border-ink/5 transition-colors hover:bg-ink/[0.02] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <span className="text-[12.5px] font-medium text-ink">{customer.name}</span>
                      {!customer.codEnabled && <Ban className="ml-1.5 inline size-3 text-madder" />}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-chalk">{customer.phone}</td>
                    <td className="px-4 py-3 text-[12px] text-chalk">{customer.city}</td>
                    <td className="px-4 py-3 text-right font-data text-[12px] text-ink">{customer.orderCount}</td>
                    <td className="px-4 py-3 text-right"><Money minor={customer.lifetimeValueMinor} short className="text-[12.5px] text-ink" /></td>
                    <td className="px-4 py-3 text-[12px] text-chalk">{formatDate(customer.lastOrderDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.map((tag) => (
                          <Badge key={tag} variant={tag === 'VIP' ? 'accent' : tag === 'COD disabled' ? 'error' : 'neutral'}>{tag}</Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && <CustomerDetailDrawer customer={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function CustomerDetailDrawer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const customerOrders = orders.filter((o) => o.customerId === customer.id);
  const fabricsBought = new Set<string>();
  customerOrders.forEach((o) => {
    o.items.forEach((i) => {
      // We'd map designId to fabricId in real code
      fabricsBought.add(i.designName);
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 animate-fade-in" onClick={onClose}>
      <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-greige animate-slide-right scrollbar-thin" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/8 bg-greige/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="font-display text-lg text-ink">{customer.name}</p>
            <p className="text-[11px] text-chalk">Customer since {formatDate(customer.lastOrderDate)}</p>
          </div>
          <button onClick={onClose} className="text-[13px] text-chalk hover:text-ink">Close</button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap gap-2">
            {customer.tags.map((tag) => (
              <Badge key={tag} variant={tag === 'VIP' ? 'accent' : 'neutral'}><Tag className="size-2.5" /> {tag}</Badge>
            ))}
            {!customer.codEnabled && <Badge variant="error"><Ban className="size-2.5" /> COD disabled</Badge>}
          </div>

          <Card>
            <Eyebrow className="mb-2">Contact</Eyebrow>
            <div className="flex flex-col gap-1.5 text-[12px]">
              <div className="flex items-center gap-2"><span className="text-chalk">Phone</span><span className="text-ink">{customer.phone}</span></div>
              <div className="flex items-center gap-2"><span className="text-chalk">WhatsApp</span><span className="text-ink">{customer.whatsapp}</span></div>
              <div className="flex items-center gap-2"><span className="text-chalk">Email</span><span className="text-ink">{customer.email}</span></div>
              <div className="flex items-center gap-2"><MapPin className="size-3 text-chalk" /><span className="text-ink">{customer.city}, {customer.province}</span></div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <Eyebrow>Lifetime value</Eyebrow>
              <Money minor={customer.lifetimeValueMinor} className="mt-1 text-xl text-ink" />
            </Card>
            <Card>
              <Eyebrow>Order count</Eyebrow>
              <p className="mt-1 font-data text-xl text-ink">{customer.orderCount}</p>
            </Card>
          </div>

          {customer.savedMeasurements.length > 0 && (
            <Card>
              <Eyebrow className="mb-2">Saved measurement profiles</Eyebrow>
              <div className="flex flex-col gap-2">
                {customer.savedMeasurements.map((m) => (
                  <div key={m.label} className="rounded-[2px] bg-ink/[0.02] p-3">
                    <p className="mb-2 text-[11px] font-medium text-ink">{m.label}</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {Object.entries(m.values).map(([k, v]) => (
                        <div key={k}>
                          <p className="text-[9px] uppercase text-chalk">{k}</p>
                          <p className="font-data text-[12px] text-ink">{v}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <Eyebrow>Order history</Eyebrow>
              <span className="font-data text-[12px] text-ink">{customerOrders.length}</span>
            </div>
            {customerOrders.length === 0 ? (
              <p className="text-[12px] text-chalk">No orders yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {customerOrders.map((o) => (
                  <a key={o.id} href="#/orders" className="flex items-center justify-between rounded-[2px] bg-ink/[0.02] px-3 py-2 hover:bg-ink/[0.05]">
                    <div>
                      <p className="font-data text-[12px] text-ink">{o.number}</p>
                      <p className="text-[10px] text-chalk">{formatDate(o.date)} · {o.items[0].designName}</p>
                    </div>
                    <Money minor={o.totalMinor} short className="text-[12px] text-ink" />
                  </a>
                ))}
              </div>
            )}
          </Card>

          {customer.codRefusals > 0 && (
            <Card className="border-l-[3px] border-l-madder pl-4">
              <Eyebrow className="mb-1">COD refused</Eyebrow>
              <p className="text-[12.5px] text-ink">{customer.codRefusals} refusal{customer.codRefusals > 1 ? 's' : ''}. Cash-on-delivery has been automatically disabled for this customer.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
