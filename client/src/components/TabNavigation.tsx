import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { type OrderWithDetails } from '@shared/schema';
import { Settings, LayoutGrid, BookOpen } from 'lucide-react';

export default function TabNavigation() {
  const [location] = useLocation();
  
  // Fetch new orders for notification badge
  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders/new'],
  });

  // Count incomplete orders for notification badge
  const newOrdersCount = orders.filter(order => !order.completed).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-md">
      <div className="max-w-md mx-auto flex justify-around">
        <Link href="/">
          <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
            location === '/' ? 'text-primary' : 'text-slate-500'
          }`}>
            <Settings className="h-6 w-6" />
            <span className="text-xs mt-1">Setup</span>
          </a>
        </Link>
        <Link href="/orders">
          <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
            location === '/orders' ? 'text-primary' : 'text-slate-500'
          }`}>
            <LayoutGrid className="h-6 w-6" />
            <span className="text-xs mt-1">Orders</span>
          </a>
        </Link>
        <Link href="/kitchen">
          <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 relative ${
            location === '/kitchen' ? 'text-primary' : 'text-slate-500'
          }`}>
            <BookOpen className="h-6 w-6" />
            <span className="text-xs mt-1">Kitchen</span>
            {newOrdersCount > 0 && (
              <span className="absolute top-2 right-6 bg-warning text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {newOrdersCount}
              </span>
            )}
          </a>
        </Link>
      </div>
    </nav>
  );
}
