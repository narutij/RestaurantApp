import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export type Timeframe = 'week' | 'month' | 'quarter' | 'year';

interface StatWidgetProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  color?: 'primary' | 'success' | 'warning' | 'blue';
  subtitle?: string;
}

const colorClasses = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-green-500/10 text-green-600 dark:text-green-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

export function StatWidget({
  title,
  value,
  icon,
  timeframe,
  onTimeframeChange,
  color = 'primary',
  subtitle,
}: StatWidgetProps) {
  const { t } = useLanguage();

  const timeframeLabels: Record<Timeframe, string> = {
    week: t('timeframe.week') || 'Week',
    month: t('timeframe.month') || 'Month',
    quarter: t('timeframe.quarter') || 'Quarter',
    year: t('timeframe.year') || 'Year',
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${colorClasses[color]}`}>
              {icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{title}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
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
      </CardContent>
    </Card>
  );
}
