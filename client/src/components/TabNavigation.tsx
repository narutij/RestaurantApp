import { useLocation, Link } from 'wouter';
import { Building2, CalendarDays, Receipt, UtensilsCrossed, History, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function TabNavigation() {
  const [location] = useLocation();
  const { isAdmin } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black shadow-md">
      <div className="max-w-md mx-auto flex justify-around">
        {/* Restaurant tab - Admin only, first in order */}
        {isAdmin && (
          <Link href="/restaurant">
            <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
              location === '/restaurant' ? 'text-primary' : 'text-slate-500 dark:text-white'
            }`}>
              <Building2 className="h-6 w-6" />
              <span className="text-xs mt-1">Restaurant</span>
            </a>
          </Link>
        )}

        {/* Settings tab - Available for everyone, second in order (or first for non-admins) */}
        <Link href="/settings">
          <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
            location === '/settings' ? 'text-primary' : 'text-slate-500 dark:text-white'
          }`}>
            <Settings className="h-6 w-6" />
            <span className="text-xs mt-1">Settings</span>
          </a>
        </Link>

        <Link href="/workday">
          <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
            location === '/workday' ? 'text-primary' : 'text-slate-500 dark:text-white'
          }`}>
            <CalendarDays className="h-6 w-6" />
            <span className="text-xs mt-1">Workday</span>
          </a>
        </Link>

        <Link href="/orders">
          <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
            location === '/orders' ? 'text-primary' : 'text-slate-500 dark:text-white'
          }`}>
            <Receipt className="h-6 w-6" />
            <span className="text-xs mt-1">Orders</span>
          </a>
        </Link>

        <Link href="/kitchen">
          <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
            location === '/kitchen' ? 'text-primary' : 'text-slate-500 dark:text-white'
          }`}>
            <UtensilsCrossed className="h-6 w-6" />
            <span className="text-xs mt-1">Kitchen</span>
          </a>
        </Link>

        <Link href="/history">
          <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
            location === '/history' ? 'text-primary' : 'text-slate-500 dark:text-white'
          }`}>
            <History className="h-6 w-6" />
            <span className="text-xs mt-1">History</span>
          </a>
        </Link>
      </div>
    </nav>
  );
}
