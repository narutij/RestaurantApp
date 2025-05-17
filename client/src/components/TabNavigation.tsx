import { useLocation, Link } from 'wouter';
import { Building2, CalendarDays, Receipt, UtensilsCrossed } from 'lucide-react';

export default function TabNavigation() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 shadow-md">
      <div className="max-w-md mx-auto flex justify-around">
        <Link href="/restaurant">
          <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
            location === '/restaurant' ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
          }`}>
            <Building2 className="h-6 w-6" />
            <span className="text-xs mt-1">Restaurant</span>
          </a>
        </Link>
        <Link href="/">
          <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
            location === '/' ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
          }`}>
            <CalendarDays className="h-6 w-6" />
            <span className="text-xs mt-1">Workday</span>
          </a>
        </Link>
        <Link href="/orders">
          <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
            location === '/orders' ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
          }`}>
            <Receipt className="h-6 w-6" />
            <span className="text-xs mt-1">Orders</span>
          </a>
        </Link>
        <Link href="/kitchen">
          <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
            location === '/kitchen' ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
          }`}>
            <UtensilsCrossed className="h-6 w-6" />
            <span className="text-xs mt-1">Kitchen</span>
          </a>
        </Link>
      </div>
    </nav>
  );
}
