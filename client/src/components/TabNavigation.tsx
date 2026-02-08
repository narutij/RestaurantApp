import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  CalendarClock, 
  ShoppingBag, 
  ChefHat, 
  BarChart3 
} from 'lucide-react';
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
  onMeasure: (tabId: TabId, rect: DOMRect) => void;
}

function NavItem({ tabId, icon, label, isActive, onSelect, onMeasure }: NavItemProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (ref.current) {
      onMeasure(tabId, ref.current.getBoundingClientRect());
    }
  }, [tabId, onMeasure]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(tabId)}
      className={cn(
        'relative flex-1 flex flex-col items-center justify-center py-1.5 rounded-full z-10 transition-colors duration-200',
        isActive
          ? 'text-gray-900 dark:text-white'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <motion.div
        initial={false}
        animate={{ 
          scale: isActive ? 1.1 : 1,
          y: isActive ? -2 : 0
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {icon}
      </motion.div>
      <motion.span 
        className={cn('text-[9px] mt-0.5 font-medium')}
        initial={false}
        animate={{ 
          fontWeight: isActive ? 600 : 500,
          opacity: isActive ? 1 : 0.8
        }}
      >
        {label}
      </motion.span>
    </button>
  );
}

export default function TabNavigation() {
  const { activeTab, setActiveTab } = useTab();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const buttonsContainerRef = useRef<HTMLDivElement>(null);
  const [tabRects, setTabRects] = useState<Record<string, DOMRect>>({});
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  // Measure buttons container on mount
  useEffect(() => {
    if (buttonsContainerRef.current) {
      setContainerRect(buttonsContainerRef.current.getBoundingClientRect());
    }
    
    const handleResize = () => {
      if (buttonsContainerRef.current) {
        setContainerRect(buttonsContainerRef.current.getBoundingClientRect());
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMeasure = (tabId: TabId, rect: DOMRect) => {
    setTabRects(prev => ({ ...prev, [tabId]: rect }));
  };

  // Restaurant tab is now visible to all users (with restricted content for non-admins)
  const tabs: { tabId: TabId; icon: React.ReactNode; label: string }[] = useMemo(() => [
    { tabId: 'restaurant' as TabId, icon: <Building2 className="h-[17px] w-[17px] stroke-[1.75]" />, label: t('nav.restaurant') },
    { tabId: 'workday', icon: <CalendarClock className="h-[17px] w-[17px] stroke-[1.75]" />, label: t('nav.workday') },
    { tabId: 'orders', icon: <ShoppingBag className="h-[17px] w-[17px] stroke-[1.75]" />, label: t('nav.orders') },
    { tabId: 'kitchen', icon: <ChefHat className="h-[17px] w-[17px] stroke-[1.75]" />, label: t('nav.kitchen') },
    { tabId: 'history', icon: <BarChart3 className="h-[17px] w-[17px] stroke-[1.75]" />, label: t('nav.history') },
  ], [t]);

  // Calculate highlight position relative to buttons container
  const activeRect = tabRects[activeTab];
  const highlightStyle = activeRect && containerRect ? {
    left: activeRect.left - containerRect.left,
    width: activeRect.width,
  } : { left: 0, width: 0 };

  return (
    <nav
      className="fixed bottom-3 left-0 right-0 z-50 px-4 pointer-events-none"
      style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-md md:max-w-lg mx-auto pointer-events-auto">
        {/* Floating Pill Container */}
        <div className="relative bg-white dark:bg-[#181E23] rounded-full shadow-lg shadow-black/10 dark:shadow-black/40 border border-gray-200 dark:border-white/5 p-1.5">
          {/* Tab Items Container */}
          <div 
            ref={buttonsContainerRef}
            className="relative flex items-center"
          >
            {/* Animated Highlight Background */}
            <AnimatePresence>
              {highlightStyle.width > 0 && (
                <motion.div
                  className="absolute top-0 bottom-0 bg-gray-100 dark:bg-[#1A242E] rounded-full"
                  initial={false}
                  animate={{
                    left: highlightStyle.left,
                    width: highlightStyle.width,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
            </AnimatePresence>

            {tabs.map((tab) => (
              <NavItem
                key={tab.tabId}
                tabId={tab.tabId}
                icon={tab.icon}
                label={tab.label}
                isActive={activeTab === tab.tabId}
                onSelect={setActiveTab}
                onMeasure={handleMeasure}
              />
            ))}
          </div>

          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-transparent to-white/5 pointer-events-none" />
        </div>
      </div>
    </nav>
  );
}
