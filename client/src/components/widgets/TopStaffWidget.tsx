import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Users, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type StaffTimeframe = 'day' | 'week' | 'month' | 'year';

interface TopWorker {
  workerId: string;
  name: string;
  totalMinutes: number;
  avatarUrl?: string | null;
}

interface TopStaffWidgetProps {
  workers: TopWorker[];
  timeframe: StaffTimeframe;
  onTimeframeChange: (tf: StaffTimeframe) => void;
  isLoading?: boolean;
}

// Format minutes to hours:minutes display
const formatWorkTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

export function TopStaffWidget({
  workers,
  timeframe,
  onTimeframeChange,
  isLoading = false,
}: TopStaffWidgetProps) {
  const { t } = useLanguage();

  const timeframeLabels: Record<StaffTimeframe, string> = {
    day: t('timeframe.day') || 'Today',
    week: t('timeframe.week') || 'Week',
    month: t('timeframe.month') || 'Month',
    year: t('timeframe.year') || 'Year',
  };

  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder = workers.length >= 3
    ? [workers[1], workers[0], workers[2]]
    : workers;

  const getPodiumStyle = (index: number) => {
    if (workers.length < 3) return { height: 'h-10', emoji: index === 0 ? '🥇' : '🥈' };

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

  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="overflow-hidden border-purple-500/20">
      <CardContent className="p-4 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/20">
                <Users className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {t('restaurant.topStaff') || 'Top Staff'}
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
                <DropdownMenuItem onClick={() => onTimeframeChange('day')}>
                  {timeframeLabels.day}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTimeframeChange('week')}>
                  {timeframeLabels.week}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTimeframeChange('month')}>
                  {timeframeLabels.month}
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
          ) : workers.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {t('restaurant.noStaffData') || 'No data available'}
            </div>
          ) : (
            <div className="flex items-end justify-center gap-2 pt-2">
              {podiumOrder.map((worker, index) => {
                const { height, emoji } = getPodiumStyle(index);
                return (
                  <div
                    key={worker.workerId}
                    className="flex flex-col items-center flex-1 max-w-[90px]"
                  >
                    {/* Avatar */}
                    <div className="relative mb-1">
                      {worker.avatarUrl ? (
                        <img
                          src={worker.avatarUrl}
                          alt={worker.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 1
                            ? 'bg-purple-500/30 text-purple-600 dark:text-purple-400'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {getInitials(worker.name)}
                        </div>
                      )}
                      <span className="absolute -top-1 -right-1 text-sm">{emoji}</span>
                    </div>

                    {/* Name */}
                    <p className="text-[10px] font-medium text-center truncate w-full mb-1">
                      {worker.name.split(' ')[0]}
                    </p>

                    {/* Podium block */}
                    <div
                      className={`w-full ${height} rounded-t-lg flex flex-col items-center justify-end pb-1 ${
                        index === 1
                          ? 'bg-gradient-to-t from-purple-500/30 to-purple-500/10'
                          : index === 0
                          ? 'bg-gradient-to-t from-gray-400/30 to-gray-400/10'
                          : 'bg-gradient-to-t from-violet-700/30 to-violet-700/10'
                      }`}
                    >
                      <div className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[9px] font-bold">{formatWorkTime(worker.totalMinutes)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
