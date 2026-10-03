import { AdminShell } from '@/components/AdminShell';
import { useRouter } from '@/hooks/useRouter';
import { OverviewPage } from '@/pages/OverviewPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { DesignsPage } from '@/pages/DesignsPage';
import { FabricPage } from '@/pages/FabricPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { MoneyPage } from '@/pages/MoneyPage';
import { InsightsPage } from '@/pages/InsightsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProductionPage } from '@/pages/ProductionPage';
import { DiscountsPage } from '@/pages/DiscountsPage';
import { InventoryPage } from '@/pages/InventoryPage';

function Router() {
  const { path } = useRouter();

  if (path === '/' || path === '') return <OverviewPage />;
  if (path === '/orders') return <OrdersPage />;
  if (path === '/designs') return <DesignsPage />;
  if (path === '/fabric') return <FabricPage />;
  if (path === '/customers') return <CustomersPage />;
  if (path === '/money' || path === '/finance') return <MoneyPage />;
  if (path === '/insights') return <InsightsPage />;
  if (path === '/settings') return <SettingsPage />;
  if (path === '/production') return <ProductionPage />;
  if (path === '/discounts') return <DiscountsPage />;
  if (path === '/inventory') return <InventoryPage />;

  return <OverviewPage />;
}

export default function App() {
  return (
    <AdminShell>
      <Router />
    </AdminShell>
  );
}
