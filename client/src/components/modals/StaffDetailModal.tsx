import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X,
  Clock,
  Calendar,
  User,
  Mail,
  Shield,
  ChefHat,
  Footprints,
  Loader2,
  Building2,
  TrendingUp
} from 'lucide-react';
import type { AppUser } from '@/lib/firestore';

type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

interface WorkerStatistics {
  totalHours: number;
  shiftsCount: number;
  averageShiftLength: number;
  restaurants: Array<{ id: number; name: string; hours: number }>;
}

interface StaffDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
  isOnline?: boolean;
}

export function StaffDetailModal({ open, onOpenChange, user, isOnline }: StaffDetailModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week');

  // Fetch worker statistics
  const { data: stats, isLoading } = useQuery<WorkerStatistics>({
    queryKey: ['worker-statistics', user?.id, selectedPeriod],
    queryFn: async () => {
      if (!user?.id) {
        return { totalHours: 0, shiftsCount: 0, averageShiftLength: 0, restaurants: [] };
      }
      const res = await fetch(`/api/workers/${user.id}/statistics?period=${selectedPeriod}`);
      if (!res.ok) throw new Error('Failed to fetch statistics');
      return res.json();
    },
    enabled: open && !!user?.id,
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-5 w-5 text-purple-400" />;
      case 'kitchen':
        return <ChefHat className="h-5 w-5 text-orange-400" />;
      case 'floor':
        return <Footprints className="h-5 w-5 text-blue-400" />;
      default:
        return <User className="h-5 w-5 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'kitchen':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'floor':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'kitchen': return 'Kitchen';
      case 'floor': return 'Floor';
      default: return 'Staff';
    }
  };

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const getPeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10 overflow-hidden max-h-[85vh]" hideCloseButton>
        {/* Header with user info */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-transparent" />
          <div className="relative px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.name}
                      className="h-16 w-16 rounded-full object-cover border-2 border-white/10"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center border-2 border-white/10">
                      <span className="text-xl font-bold">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                  )}
                  <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-[#1E2429] ${
                    isOnline ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                </div>

                {/* Name and details */}
                <div>
                  <h2 className="text-lg font-semibold">{user.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={getRoleColor(user.role || 'floor')}>
                      {getRoleIcon(user.role || 'floor')}
                      <span className="ml-1.5">{getRoleLabel(user.role || 'floor')}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Email */}
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <ScrollArea className="max-h-[calc(85vh-200px)]">
          <div className="p-6 pt-2 space-y-4">
            {/* Period Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Work Statistics</span>
              </div>
              <Select value={selectedPeriod} onValueChange={(v: TimePeriod) => setSelectedPeriod(v)}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <Clock className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="text-xl font-bold">{formatHours(stats?.totalHours || 0)}</div>
                    <div className="text-xs text-muted-foreground">Total Hours</div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <Calendar className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="text-xl font-bold">{stats?.shiftsCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Shifts</div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <TrendingUp className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-xl font-bold">{formatHours(stats?.averageShiftLength || 0)}</div>
                    <div className="text-xs text-muted-foreground">Avg Shift</div>
                  </div>
                </div>

                {/* Restaurants Breakdown */}
                {stats?.restaurants && stats.restaurants.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Hours by Restaurant</span>
                    </div>
                    <div className="space-y-2">
                      {stats.restaurants.map((restaurant) => (
                        <div
                          key={restaurant.id}
                          className="p-3 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 flex items-center justify-between"
                        >
                          <span className="text-sm font-medium">{restaurant.name}</span>
                          <Badge variant="secondary" className="bg-green-500/10 text-green-400">
                            {formatHours(restaurant.hours)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No data state */}
                {(!stats || (stats.totalHours === 0 && stats.shiftsCount === 0)) && (
                  <div className="text-center py-6">
                    <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No work data for {getPeriodLabel(selectedPeriod).toLowerCase()}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
