import { Building2, CalendarDays, Receipt, UtensilsCrossed, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTab, type TabId } from '@/contexts/TabContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface NavItemProps {
  tabId: TabId;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onSelect: (tabId: TabId) => void;
}

function NavItem({ tabId, icon, label, isActive, onSelect }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tabId)}
      className={cn(
        'flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200',
        'min-w-[60px]',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      )}
    >
      <div className={cn('transition-transform duration-200', isActive && 'scale-110')}>
        {icon}
      </div>
      <span className={cn('text-[10px] mt-1 font-medium', isActive && 'font-semibold')}>
        {label}
      </span>
    </button>
  );
}

export default function TabNavigation() {
  const { activeTab, setActiveTab } = useTab();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();

  const tabs: { tabId: TabId; icon: React.ReactNode; label: string }[] = [
    ...(isAdmin
      ? [{ tabId: 'restaurant' as TabId, icon: <Building2 className="h-5 w-5" />, label: t('nav.restaurant') }]
      : []),
    { tabId: 'workday', icon: <CalendarDays className="h-5 w-5" />, label: t('nav.workday') },
    { tabId: 'orders', icon: <Receipt className="h-5 w-5" />, label: t('nav.orders') },
    { tabId: 'kitchen', icon: <UtensilsCrossed className="h-5 w-5" />, label: t('nav.kitchen') },
    { tabId: 'history', icon: <History className="h-5 w-5" />, label: t('nav.history') },
  ];

  return (
    <nav className="flex-shrink-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-t safe-bottom">
      <div className="max-w-lg mx-auto px-2 py-1">
        <div className="flex justify-around items-center gap-1">
          {tabs.map((tab) => (
            <NavItem
              key={tab.tabId}
              tabId={tab.tabId}
              icon={tab.icon}
              label={tab.label}
              isActive={activeTab === tab.tabId}
              onSelect={setActiveTab}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
