import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Timeframe } from './StatWidget';

interface TopItem {
  name: string;
  count: number;
  revenue: number;
}

interface TopItemsWidgetProps {
  items: TopItem[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  isLoading?: boolean;
  noCard?: boolean;
}

export function TopItemsWidget({
  items,
  timeframe,
  onTimeframeChange,
  isLoading = false,
  noCard = false,
}: TopItemsWidgetProps) {
  const { t } = useLanguage();

  const timeframeLabels: Record<Timeframe, string> = {
    week: t('timeframe.week') || 'Week',
    month: t('timeframe.month') || 'Month',
    quarter: t('timeframe.quarter') || 'Quarter',
    year: t('timeframe.year') || 'Year',
  };

  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder = items.length >= 3
    ? [items[1], items[0], items[2]]
    : items;

  const getPodiumStyle = (index: number) => {
    // For podium layout: index 0 = 2nd place (left), 1 = 1st place (center), 2 = 3rd place (right)
    if (items.length < 3) return { height: 'h-10', emoji: index === 0 ? '🥇' : '🥈' };

    switch (index) {
      case 0: // 2nd place (left)
        return { height: 'h-8', emoji: '🥈' };
      case 1: // 1st place (center)
        return { height: 'h-12', emoji: '🥇' };
      case 2: // 3rd place (right)
        return { height: 'h-6', emoji: '🥉' };
      default:
        return { height: 'h-6', emoji: '' };
    }
  };

  const inner = (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/20">
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            {t('restaurant.topDishes') || 'Top Dishes'}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-[11px] font-normal">
              {timeframeLabels[timeframe]}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onTimeframeChange('week')}>
              {timeframeLabels.week}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTimeframeChange('month')}>
              {timeframeLabels.month}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTimeframeChange('quarter')}>
              {timeframeLabels.quarter}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTimeframeChange('year')}>
              {timeframeLabels.year}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          {t('common.loading') || 'Loading...'}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          {t('restaurant.noItems') || 'No data available'}
        </div>
      ) : (
        <div className="flex items-end justify-center gap-2 pt-2">
          {podiumOrder.map((item, index) => {
            const { height, emoji } = getPodiumStyle(index);
            return (
              <div
                key={item.name}
                className="flex flex-col items-center flex-1 max-w-[90px]"
              >
                <span className="text-lg mb-1">{emoji}</span>
                <p className="text-[10px] font-medium text-center truncate w-full mb-1">
                  {item.name}
                </p>
                <div
                  className={`w-full ${height} rounded-t-lg flex flex-col items-center justify-end pb-1 ${
                    index === 1
                      ? 'bg-gradient-to-t from-yellow-500/30 to-yellow-500/10'
                      : index === 0
                      ? 'bg-gradient-to-t from-gray-400/30 to-gray-400/10'
                      : 'bg-gradient-to-t from-amber-700/30 to-amber-700/10'
                  }`}
                >
                  <span className="text-xs font-bold">x{item.count}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (noCard) return <div className="h-full">{inner}</div>;

  return (
    <Card className="overflow-hidden border-purple-500/20 h-full">
      <CardContent className="p-4 relative h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-transparent" />
        <div className="relative">{inner}</div>
      </CardContent>
    </Card>
  );
}
