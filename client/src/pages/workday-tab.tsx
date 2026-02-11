import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWorkday } from '@/contexts/WorkdayContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { apiRequest } from '@/lib/queryClient';
import { userService, type AppUser } from '@/lib/firestore';
import { type Menu, type TableLayout } from '@shared/schema';
import {
  Play,
  Square,
  Clock,
  MenuSquare,
  Grid2X2,
  Users,
  Loader2,
  AlertCircle,
  Rocket,
  Coffee,
  UserMinus,
  UserPlus,
  Check,
  Settings2,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';


// Worker status during workday
type WorkerShiftStatus = 'working' | 'resting' | 'released';

interface WorkdayWorkerState {
  id: string;
  name: string;
  status: WorkerShiftStatus;
  startedAt?: Date;
  restStartedAt?: Date;
  totalWorkedMs: number;
  totalRestedMs: number;
  shiftStartTime: Date;
  releasedAt?: Date;
}

// Worker data stored in ended shift for display
interface EndedShiftWorkerData {
  id: string;
  name: string;
  totalWorkedMs: number;
  totalRestedMs: number;
  shiftStartTime: Date;
  shiftEndTime: Date;
}

// Ended shift with worker details
interface EndedShiftData {
  id: string;
  endedAt: Date;
  duration: string;
  workersCount: number;
  workers: EndedShiftWorkerData[];
  expanded: boolean;
}

export default function WorkdayTab() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { t } = useLanguage();
  const { isAdmin, appUser } = useAuth();
  const { addMessageListener } = useWebSocketContext();
  const {
    selectedRestaurant,
    activeWorkday,
    isWorkdayActive,
    elapsedTime,
    startWorkday,
    endWorkday,
    isLoading: workdayLoading
  } = useWorkday();

  // Local state
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [workdayWorkers, setWorkdayWorkers] = useState<WorkdayWorkerState[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [releaseWorkerConfirmId, setReleaseWorkerConfirmId] = useState<string | null>(null);
  const [dismissShiftsConfirmOpen, setDismissShiftsConfirmOpen] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [layoutExpanded, setLayoutExpanded] = useState(false);
  const [workersExpanded, setWorkersExpanded] = useState(false);

  // Persisted state for ended shifts (survives tab switches)
  // Use a helper to get today's date consistently
  const getTodayDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [endedShiftsDismissed, setEndedShiftsDismissed] = useState(() => {
    const today = getTodayDateString();
    const storedDate = localStorage.getItem('endedShiftsDate');

    // Clear ALL shift data if it's a new day or no date stored
    if (!storedDate || storedDate !== today) {
      localStorage.removeItem('endedShiftsDismissed');
      localStorage.removeItem('endedShiftsToday');
      localStorage.setItem('endedShiftsDate', today);
      return false;
    }
    return localStorage.getItem('endedShiftsDismissed') === 'true';
  });

  const [endedShiftsToday, setEndedShiftsToday] = useState<EndedShiftData[]>(() => {
    const today = getTodayDateString();
    const storedDate = localStorage.getItem('endedShiftsDate');

    // Return empty if not today's date
    if (!storedDate || storedDate !== today) {
      return [];
    }

    const stored = localStorage.getItem('endedShiftsToday');
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      // Filter and validate shifts - only include shifts from today
      return parsed
        .filter((shift: EndedShiftData) => {
          if (!shift || !shift.endedAt) return false;
          const shiftDate = new Date(shift.endedAt).toISOString().split('T')[0];
          return shiftDate === today;
        })
        .map((shift: EndedShiftData) => ({
          ...shift,
          endedAt: new Date(shift.endedAt),
          workers: (shift.workers || []).map(w => ({
            ...w,
            shiftStartTime: new Date(w.shiftStartTime),
            shiftEndTime: new Date(w.shiftEndTime),
          })),
        }));
    } catch {
      // Clear corrupted data
      localStorage.removeItem('endedShiftsToday');
      return [];
    }
  });

  // Clean up old shifts periodically (every time component renders or date changes)
  useEffect(() => {
    const today = getTodayDateString();
    const storedDate = localStorage.getItem('endedShiftsDate');
    
    // If the date has changed since last visit, clear everything
    if (storedDate && storedDate !== today) {
      localStorage.removeItem('endedShiftsDismissed');
      localStorage.removeItem('endedShiftsToday');
      localStorage.setItem('endedShiftsDate', today);
      setEndedShiftsToday([]);
      setEndedShiftsDismissed(false);
      return;
    }
    
    // Filter out any shifts that aren't from today (safety check)
    const validShifts = endedShiftsToday.filter(shift => {
      if (!shift || !shift.endedAt) return false;
      const shiftDate = new Date(shift.endedAt).toISOString().split('T')[0];
      return shiftDate === today;
    });
    
    // Only update if we filtered something out
    if (validShifts.length !== endedShiftsToday.length) {
      setEndedShiftsToday(validShifts);
    }
  }, []);

  // Persist ended shifts state to localStorage
  useEffect(() => {
    const today = getTodayDateString();
    const storedDate = localStorage.getItem('endedShiftsDate');

    // Only persist if we're still on the same day
    if (storedDate === today) {
      // Filter to only include today's shifts before persisting
      const todayShifts = endedShiftsToday.filter(shift => {
        if (!shift || !shift.endedAt) return false;
        const shiftDate = new Date(shift.endedAt).toISOString().split('T')[0];
        return shiftDate === today;
      });
      localStorage.setItem('endedShiftsToday', JSON.stringify(todayShifts));
    }
  }, [endedShiftsToday]);

  useEffect(() => {
    const today = getTodayDateString();
    const storedDate = localStorage.getItem('endedShiftsDate');

    // Only persist dismissed state for today
    if (storedDate === today) {
      localStorage.setItem('endedShiftsDismissed', String(endedShiftsDismissed));
    }
  }, [endedShiftsDismissed]);

  // Current date formatting
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Fetch menus - use same query key as MenuModal for cache consistency
  const { data: menus = [], isLoading: menusLoading } = useQuery<Menu[]>({
    queryKey: ['/api/menus', selectedRestaurant?.id],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return [];
      const res = await fetch(`/api/menus?restaurantId=${selectedRestaurant.id}`);
      if (!res.ok) throw new Error('Failed to fetch menus');
      return res.json();
    },
    enabled: !!selectedRestaurant?.id
  });

  // Fetch table layouts - use same query key as TableLayoutsModal for cache consistency
  const { data: tableLayouts = [], isLoading: layoutsLoading } = useQuery<TableLayout[]>({
    queryKey: ['/api/table-layouts', selectedRestaurant?.id],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return [];
      const res = await fetch(`/api/table-layouts?restaurantId=${selectedRestaurant.id}`);
      if (!res.ok) throw new Error('Failed to fetch table layouts');
      return res.json();
    },
    enabled: !!selectedRestaurant?.id
  });

  // Fetch all users (workers) and combine with mock workers
  const { data: realWorkers = [], isLoading: workersLoading } = useQuery<AppUser[]>({
    queryKey: ['all-workers'],
    queryFn: async () => {
      const users = await userService.getAll();
      return users.filter(u => u.status === 'active');
    },
  });

  // Filter out the main admin account from worker selection
  const allWorkers = realWorkers.filter(w => w.email !== 'narutisjustinas@gmail.com');

  // Fetch workers assigned to the active workday from the server
  // This ensures workers persist across tab switches
  const { data: serverWorkdayWorkers = [] } = useQuery<Array<{
    id: number; workdayId: number; workerId: string; joinedAt: string | null;
    status: string | null; totalWorkedMs: number | null; totalRestedMs: number | null;
    lastStatusChangeAt: string | null; releasedAt: string | null;
  }>>({
    queryKey: ['workday-workers', activeWorkday?.id],
    queryFn: async () => {
      if (!activeWorkday?.id) return [];
      const res = await fetch(`/api/workdays/${activeWorkday.id}/workers`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeWorkday?.id && isWorkdayActive,
  });

  // Create workday mutation
  const createWorkdayMutation = useMutation({
    mutationFn: async (data: {
      restaurantId: number;
      date: string;
      menuId: number | null;
      tableLayoutId: number | null;
    }) => {
      return await apiRequest('/api/workdays', {
        method: 'POST',
        body: { ...data, isActive: false }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workday'] });
    }
  });

  // Restore workday workers from server when returning to this tab (or on first load)
  useEffect(() => {
    if (isWorkdayActive && serverWorkdayWorkers.length > 0 && workdayWorkers.length === 0 && allWorkers.length > 0) {
      const restoredWorkers = serverWorkdayWorkers.map(sw => {
        const worker = allWorkers.find(w => w.id === sw.workerId);
        const joinedAt = sw.joinedAt ? new Date(sw.joinedAt) : new Date();
        const serverStatus = (sw.status as WorkerShiftStatus) || 'working';
        const lastChange = sw.lastStatusChangeAt ? new Date(sw.lastStatusChangeAt) : joinedAt;
        return {
          id: sw.workerId,
          name: worker?.name || 'Unknown',
          status: serverStatus,
          startedAt: serverStatus === 'working' ? lastChange : undefined,
          restStartedAt: serverStatus === 'resting' ? lastChange : undefined,
          totalWorkedMs: sw.totalWorkedMs || 0,
          totalRestedMs: sw.totalRestedMs || 0,
          shiftStartTime: joinedAt,
          releasedAt: sw.releasedAt ? new Date(sw.releasedAt) : undefined,
        };
      });
      setWorkdayWorkers(restoredWorkers);
    }
  }, [isWorkdayActive, serverWorkdayWorkers, allWorkers, workdayWorkers.length]);

  // Listen for WebSocket worker status changes from other users
  useEffect(() => {
    const removeListener = addMessageListener((message) => {
      if (message.type === 'WORKER_STATUS_CHANGED') {
        const { workdayId, workerId, status, totalWorkedMs, totalRestedMs } = message.payload as {
          workdayId: number; workerId: string; status: string; totalWorkedMs: number; totalRestedMs: number;
        };
        if (activeWorkday?.id === workdayId) {
          setWorkdayWorkers(prev => prev.map(w => {
            if (w.id !== workerId) return w;
            const now = new Date();
            return {
              ...w,
              status: status as WorkerShiftStatus,
              startedAt: status === 'working' ? now : undefined,
              restStartedAt: status === 'resting' ? now : undefined,
              totalWorkedMs,
              totalRestedMs,
              releasedAt: status === 'released' ? now : w.releasedAt,
            };
          }));
        }
      }
    });
    return removeListener;
  }, [addMessageListener, activeWorkday?.id]);

  // Handle start workday
  const handleStartWorkday = async () => {
    if (!selectedRestaurant?.id) {
      addNotification(t('workday.noRestaurantSelected'));
      return;
    }

    if (!selectedMenuId || !selectedLayoutId) {
      addNotification(t('workday.configRequired'));
      return;
    }

    setIsStarting(true);
    try {
      const workday = await createWorkdayMutation.mutateAsync({
        restaurantId: selectedRestaurant.id,
        date: dateString,
        menuId: selectedMenuId,
        tableLayoutId: selectedLayoutId
      });

      if (!workday?.id) {
        throw new Error('Workday was created but no ID was returned');
      }

      await startWorkday(workday.id);

      // Save workers to database for history tracking
      for (const workerId of selectedWorkerIds) {
        try {
          await fetch(`/api/workdays/${workday.id}/workers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workerId }),
          });
        } catch (e) {
          console.error('Failed to save worker to workday:', e);
        }
      }

      // Initialize workers
      const now = new Date();
      const initialWorkers = selectedWorkerIds.map(id => {
        const worker = allWorkers.find(w => w.id === id);
        return {
          id,
          name: worker?.name || 'Unknown',
          status: 'working' as WorkerShiftStatus,
          startedAt: now,
          totalWorkedMs: 0,
          totalRestedMs: 0,
          shiftStartTime: now,
        };
      });
      setWorkdayWorkers(initialWorkers);

      addNotification(t('workday.started'));
    } catch (error) {
      addNotification(t('workday.failedToStart'));
    } finally {
      setIsStarting(false);
    }
  };

  // Handle end workday with confirmation
  const handleEndWorkday = async () => {
    if (!activeWorkday?.id) return;

    setIsEnding(true);
    try {
      const endTime = new Date();

      // Finalize worker data - calculate final totals
      const finalWorkerData: EndedShiftWorkerData[] = workdayWorkers.map(w => {
        let finalWorkedMs = w.totalWorkedMs;
        let finalRestedMs = w.totalRestedMs;

        // If currently working, add time since last startedAt
        if (w.status === 'working' && w.startedAt) {
          finalWorkedMs += endTime.getTime() - w.startedAt.getTime();
        }
        // If currently resting, add time since rest started
        if (w.status === 'resting' && w.restStartedAt) {
          finalRestedMs += endTime.getTime() - w.restStartedAt.getTime();
        }

        return {
          id: w.id,
          name: w.name,
          totalWorkedMs: finalWorkedMs,
          totalRestedMs: finalRestedMs,
          shiftStartTime: w.shiftStartTime,
          shiftEndTime: endTime,
        };
      });

      // Persist final worker times to server BEFORE ending workday
      // This ensures totalWorkedMs is saved even if server-side finalization has issues
      for (const wd of finalWorkerData) {
        try {
          await fetch(`/api/workdays/${activeWorkday.id}/workers/${wd.id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'released',
              totalWorkedMs: wd.totalWorkedMs,
              totalRestedMs: wd.totalRestedMs,
            }),
          });
        } catch (e) {
          console.error('Failed to persist final worker time:', e);
        }
      }

      // Add to ended shifts array with worker details
      const newEndedShift: EndedShiftData = {
        id: `shift-${Date.now()}`,
        endedAt: endTime,
        duration: elapsedTime,
        workersCount: workdayWorkers.length,
        workers: finalWorkerData,
        expanded: false,
      };
      setEndedShiftsToday(prev => [...prev, newEndedShift]);
      setEndedShiftsDismissed(false);

      await endWorkday(activeWorkday.id);
      setWorkdayWorkers([]);
      setSelectedWorkerIds([]);
      setSelectedMenuId(null);
      setSelectedLayoutId(null);
      addNotification(t('workday.ended'));
    } catch (error) {
      addNotification(t('workday.failedToEnd'));
      // Remove the shift we just added on error
      setEndedShiftsToday(prev => prev.slice(0, -1));
    } finally {
      setIsEnding(false);
      setEndConfirmOpen(false);
    }
  };

  // Worker shift controls
  const handleWorkerAction = (workerId: string, action: 'start' | 'rest' | 'release') => {
    setWorkdayWorkers(prev => {
      const updated = prev.map(w => {
        if (w.id !== workerId) return w;

        const now = new Date();
        let newTotalWorked = w.totalWorkedMs;
        let newTotalRested = w.totalRestedMs;

        // Calculate worked time if transitioning from working
        if (w.status === 'working' && w.startedAt) {
          newTotalWorked += now.getTime() - w.startedAt.getTime();
        }

        // Calculate rested time if transitioning from resting
        if (w.status === 'resting' && w.restStartedAt) {
          newTotalRested += now.getTime() - w.restStartedAt.getTime();
        }

        const newStatus: WorkerShiftStatus = action === 'start' ? 'working' : action === 'rest' ? 'resting' : 'released';

        // Persist status change to server
        if (activeWorkday?.id) {
          fetch(`/api/workdays/${activeWorkday.id}/workers/${workerId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, totalWorkedMs: newTotalWorked, totalRestedMs: newTotalRested }),
          }).catch(e => console.error('Failed to persist worker status:', e));
        }

        switch (action) {
          case 'start':
            return {
              ...w,
              status: 'working' as WorkerShiftStatus,
              startedAt: now,
              restStartedAt: undefined,
              totalWorkedMs: newTotalWorked,
              totalRestedMs: newTotalRested,
            };
          case 'rest':
            return {
              ...w,
              status: 'resting' as WorkerShiftStatus,
              startedAt: undefined,
              restStartedAt: now,
              totalWorkedMs: newTotalWorked,
              totalRestedMs: newTotalRested,
            };
          case 'release':
            return {
              ...w,
              status: 'released' as WorkerShiftStatus,
              startedAt: undefined,
              restStartedAt: undefined,
              totalWorkedMs: newTotalWorked,
              totalRestedMs: newTotalRested,
              releasedAt: now,
            };
          default:
            return w;
        }
      });
      return updated;
    });
  };

  // Add worker during active workday
  const handleAddWorkerToShift = async (workerId: string) => {
    const worker = allWorkers.find(w => w.id === workerId);
    if (!worker) return;

    if (workdayWorkers.find(w => w.id === workerId)) return;

    // Save to database for history tracking
    if (activeWorkday?.id) {
      try {
        await fetch(`/api/workdays/${activeWorkday.id}/workers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workerId }),
        });
      } catch (e) {
        console.error('Failed to save worker to workday:', e);
      }
    }

    const now = new Date();
    setWorkdayWorkers(prev => [...prev, {
      id: workerId,
      name: worker.name,
      status: 'working',
      startedAt: now,
      totalWorkedMs: 0,
      totalRestedMs: 0,
      shiftStartTime: now,
    }]);
    setAddWorkerOpen(false);
  };

  // Format duration
  const formatDuration = (ms: number) => {
    const abs = Math.max(0, ms);
    const hours = Math.floor(abs / 3600000);
    const minutes = Math.floor((abs % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  // Toggle ended shift expansion
  const toggleShiftExpanded = (shiftId: string) => {
    setEndedShiftsToday(prev => prev.map(shift =>
      shift.id === shiftId ? { ...shift, expanded: !shift.expanded } : shift
    ));
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Toggle worker selection
  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkerIds(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  // No restaurant selected
  if (!selectedRestaurant) {
    return (
      <div className="p-4 pb-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="p-4 bg-amber-500/10 rounded-full mb-4">
          <AlertCircle className="h-12 w-12 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('workday.noRestaurantSelected')}</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          {t('workday.selectRestaurantFirst')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Current Date Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 * 0.1 }}
      >
        <Card className="overflow-hidden border-blue-500/20">
          <CardContent className="p-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent" />
            <div className="relative text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{formattedDate}</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Shifts Ended Today Banners - Each shift as separate expandable card */}
      {!isWorkdayActive && endedShiftsToday.length > 0 && !endedShiftsDismissed && (
        <motion.div 
          className="space-y-3 pb-4 mb-2 border-b border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 * 0.1 }}
        >
          {/* Header with dismiss button */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {endedShiftsToday.length === 1
                ? t('workday.shiftEndedToday')
                : `${endedShiftsToday.length} ${t('workday.shiftsEndedToday')}`}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setDismissShiftsConfirmOpen(true)}
            >
              {t('common.dismissAll') || 'Dismiss All'}
            </Button>
          </div>

          {/* Individual shift cards */}
          {endedShiftsToday.map((shift, index) => (
            <Card key={shift.id} className="border-amber-500/30 bg-amber-500/5 overflow-hidden">
              <CardContent className="p-0">
                {/* Clickable header */}
                <button
                  className="w-full p-4 flex items-center justify-between hover:bg-amber-500/5 transition-colors"
                  onClick={() => toggleShiftExpanded(shift.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-xl">
                      <Clock className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">
                        {t('workday.shift')} #{index + 1}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('workday.duration')}: {shift.duration} · {shift.workersCount} {t('workday.workers')} · {t('workday.endedAt')} {formatTime(shift.endedAt)}
                      </p>
                    </div>
                  </div>
                  {shift.expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {/* Expanded worker details */}
                {shift.expanded && shift.workers.length > 0 && (
                  <div className="border-t border-amber-500/20 divide-y divide-amber-500/10">
                    {shift.workers.map((worker) => (
                      <div key={worker.id} className="p-3 px-4 bg-background/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {worker.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{worker.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(worker.shiftStartTime)} - {formatTime(worker.shiftEndTime)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-green-600 dark:text-green-400">
                              {t('workday.worked') || 'Worked'}: {formatDuration(worker.totalWorkedMs)}
                            </p>
                            {worker.totalRestedMs > 0 && (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                {t('workday.rested') || 'Rested'}: {formatDuration(worker.totalRestedMs)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Active Workday Display */}
      {isWorkdayActive && activeWorkday && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 * 0.1 }}
        >
          {/* Active Timer Card */}
          <Card className="overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-500/10">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Animated Icon */}
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                  <div className="relative p-4 bg-green-500/10 rounded-full">
                    <Zap className="h-8 w-8 text-green-500 animate-pulse" />
                  </div>
                </div>

                <div>
                  <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 mb-2">
                    {t('workday.active') || 'Active'}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {t('workday.startedAt') || 'Started at'} {activeWorkday.startedAt ? new Date(activeWorkday.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </p>
                </div>

                {/* Large Timer */}
                <div className="py-4">
                  <span className="text-5xl font-bold font-mono tracking-wider text-green-600 dark:text-green-400">
                    {elapsedTime}
                  </span>
                </div>

                {/* End Workday Button */}
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full max-w-xs"
                  onClick={() => setEndConfirmOpen(true)}
                  disabled={isEnding}
                >
                  <Square className="mr-2 h-5 w-5" />
                  {t('workday.endWorkday') || 'End Workday'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Workers on Shift */}
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('workday.workersOnShift') || 'Workers on Shift'}</h3>
                    <p className="text-xs text-muted-foreground">
                      {workdayWorkers.filter(w => w.status === 'working').length} {t('workday.activeNow') || 'active now'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setAddWorkerOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  {t('workday.add') || 'Add'}
                </Button>
              </div>

              <ScrollArea className="max-h-[300px]">
                {workdayWorkers.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    {t('workday.noWorkersAssigned') || 'No workers assigned'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {workdayWorkers.map((worker) => (
                      <div key={worker.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            worker.status === 'working' ? 'bg-green-500' :
                            worker.status === 'resting' ? 'bg-amber-500' : 'bg-gray-400'
                          }`} />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{worker.name}</p>
                            {worker.status === 'released' ? (
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <p>
                                  {formatTime(worker.shiftStartTime)} - {worker.releasedAt ? formatTime(worker.releasedAt) : '--:--'}
                                </p>
                                <p>
                                  <span className="text-green-600 dark:text-green-400">{t('workday.worked') || 'Worked'}: {formatDuration(worker.totalWorkedMs)}</span>
                                  {worker.totalRestedMs > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400"> · {t('workday.rested') || 'Rested'}: {formatDuration(worker.totalRestedMs)}</span>
                                  )}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                {worker.status === 'working' && (
                                  <>
                                    {t('workday.working') || 'Working'}
                                    {worker.totalRestedMs > 0 && ` · ${formatDuration(worker.totalRestedMs)} ${t('workday.rested')?.toLowerCase() || 'rested'}`}
                                  </>
                                )}
                                {worker.status === 'resting' && (
                                  <>
                                    {t('workday.onBreak') || 'On break'}
                                    {worker.totalRestedMs > 0 && ` · ${formatDuration(worker.totalRestedMs)}`}
                                  </>
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          {(isAdmin || worker.id === appUser?.id) ? (
                            <>
                              {worker.status === 'resting' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2"
                                  onClick={() => handleWorkerAction(worker.id, 'start')}
                                >
                                  <Play className="h-3.5 w-3.5 mr-1" />
                                  {t('workday.start') || 'Start'}
                                </Button>
                              )}
                              {worker.status === 'working' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2"
                                    onClick={() => handleWorkerAction(worker.id, 'rest')}
                                  >
                                    <Coffee className="h-3.5 w-3.5 mr-1" />
                                    {t('workday.rest') || 'Rest'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2 text-red-500 hover:text-red-600"
                                    onClick={() => setReleaseWorkerConfirmId(worker.id)}
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {worker.status === 'released' && (
                                <Badge variant="secondary" className="text-xs">
                                  {t('workday.done') || 'Done'}
                                </Badge>
                              )}
                            </>
                          ) : (
                            worker.status === 'released' ? (
                              <Badge variant="secondary" className="text-xs">
                                {t('workday.done') || 'Done'}
                              </Badge>
                            ) : null
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Current Configuration */}
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 rounded-xl">
                  <Settings2 className="h-5 w-5 text-purple-500" />
                </div>
                <h3 className="font-semibold">{t('workday.workdaySetup') || 'Workday Setup'}</h3>
              </div>

              <div className="divide-y">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MenuSquare className="h-4 w-4" />
                    <span className="text-sm">{t('workday.menu') || 'Menu'}</span>
                  </div>
                  <span className="font-medium text-sm">
                    {menus.find(m => m.id === activeWorkday.menuId)?.name || t('common.notSet')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Grid2X2 className="h-4 w-4" />
                    <span className="text-sm">{t('workday.layout') || 'Layout'}</span>
                  </div>
                  <span className="font-medium text-sm">
                    {tableLayouts.find(l => l.id === activeWorkday.tableLayoutId)?.name || t('common.notSet')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Setup Section - Only show when no active workday */}
      {!isWorkdayActive && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 * 0.1 }}
        >
          {/* Menu Selection */}
          <Card>
            <CardContent className="p-0">
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                onClick={() => setMenuExpanded(!menuExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-500/10 rounded-xl">
                    <MenuSquare className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{t('workday.selectMenu')}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedMenuId
                        ? menus.find(m => m.id === selectedMenuId)?.name
                        : t('workday.selectMenuDescription')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedMenuId && <Check className="h-4 w-4 text-green-500" />}
                  {menuExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {menuExpanded && (
                <>
                  {menusLoading ? (
                    <div className="p-6 flex justify-center border-t">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : menus.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm border-t">
                      {t('workday.noMenusAvailable')}
                    </div>
                  ) : (
                    <div className="max-h-[156px] overflow-y-auto border-t">
                      <div className="p-2 space-y-1">
                        {menus.map((menu) => (
                          <button
                            key={menu.id}
                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                              selectedMenuId === menu.id
                                ? 'bg-primary/10 border border-primary/30'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => {
                              setSelectedMenuId(menu.id);
                              setMenuExpanded(false);
                            }}
                          >
                            <span className="font-medium text-sm">{menu.name}</span>
                            {selectedMenuId === menu.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Table Layout Selection */}
          <Card>
            <CardContent className="p-0">
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                onClick={() => setLayoutExpanded(!layoutExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 rounded-xl">
                    <Grid2X2 className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{t('workday.selectTableLayout')}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedLayoutId
                        ? tableLayouts.find(l => l.id === selectedLayoutId)?.name
                        : t('workday.selectTableLayoutDescription')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedLayoutId && <Check className="h-4 w-4 text-amber-500" />}
                  {layoutExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {layoutExpanded && (
                <>
                  {layoutsLoading ? (
                    <div className="p-6 flex justify-center border-t">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : tableLayouts.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm border-t">
                      {t('workday.noLayoutsAvailable')}
                    </div>
                  ) : (
                    <div className="max-h-[180px] overflow-y-auto border-t">
                      <div className="p-2 space-y-1">
                        {tableLayouts.map((layout) => (
                          <button
                            key={layout.id}
                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                              selectedLayoutId === layout.id
                                ? 'bg-primary/10 border border-primary/30'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => {
                              setSelectedLayoutId(layout.id);
                              setLayoutExpanded(false);
                            }}
                          >
                            <div className="text-left">
                              <span className="font-medium text-sm block">{layout.name}</span>
                              {layout.description && (
                                <span className="text-xs text-muted-foreground">{layout.description}</span>
                              )}
                            </div>
                            {selectedLayoutId === layout.id && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Worker Selection */}
          <Card>
            <CardContent className="p-0">
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                onClick={() => setWorkersExpanded(!workersExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{t('workday.selectWorkers')}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedWorkerIds.length > 0
                        ? `${selectedWorkerIds.length} ${t('workday.selected')}`
                        : t('workday.selectWorkersDescription')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedWorkerIds.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedWorkerIds.length}
                    </Badge>
                  )}
                  {workersExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {workersExpanded && (
                <>
                  {workersLoading ? (
                    <div className="p-6 flex justify-center border-t">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : allWorkers.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm border-t">
                      {t('workday.noWorkersAvailable')}
                    </div>
                  ) : (
                    <div className="max-h-[200px] overflow-y-auto border-t">
                      <div className="p-2 space-y-1">
                        {allWorkers.map((worker) => (
                          <button
                            key={worker.id}
                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                              selectedWorkerIds.includes(worker.id)
                                ? 'bg-primary/10 border border-primary/30'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => toggleWorkerSelection(worker.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-xs font-medium">
                                    {worker.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </span>
                                </div>
                                {/* Online indicator */}
                                <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                                  worker.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                }`} />
                              </div>
                              <div className="text-left">
                                <span className="font-medium text-sm block">{worker.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {worker.role} · {worker.isOnline ? t('workday.online') : t('workday.offline')}
                                </span>
                              </div>
                            </div>
                            {selectedWorkerIds.includes(worker.id) && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Start Workday Button */}
          <Card 
            className={`overflow-hidden border-green-500/30 bg-green-500/5 cursor-pointer transition-colors hover:bg-green-500/10 ${
              (isStarting || !selectedMenuId || !selectedLayoutId || workdayLoading) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => {
              if (!isStarting && selectedMenuId && selectedLayoutId && !workdayLoading) {
                setStartConfirmOpen(true);
              }
            }}
          >
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-2 text-center">
                {isStarting ? (
                  <Loader2 className="h-6 w-6 text-green-600 dark:text-green-400 animate-spin" />
                ) : (
                  <Rocket className="h-6 w-6 text-green-600 dark:text-green-400" />
                )}
                <div className="font-medium text-green-600 dark:text-green-400">
                  {isStarting ? (t('workday.starting') || 'Starting...') : (t('workday.letsGetToWork') || "Let's Get to Work!")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {(!selectedMenuId || !selectedLayoutId) 
                    ? (t('workday.selectBothRequired') || 'Select menu and layout first')
                    : (t('workday.readyToStart') || 'Ready to start the workday')}
                </div>
              </div>
            </CardContent>
          </Card>

        </motion.div>
      )}

      {/* Start Workday Confirmation Dialog */}
      <AlertDialog open={startConfirmOpen} onOpenChange={setStartConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('workday.startWorkdayConfirmTitle') || 'Start Workday?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('workday.startWorkdayConfirmDescription') || 'Are you sure you want to start the workday? Make sure you have selected the correct menu and table layout.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setStartConfirmOpen(false);
                handleStartWorkday();
              }}
              className="bg-green-500 hover:bg-green-600"
              disabled={isStarting}
            >
              {isStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('workday.starting') || 'Starting...'}
                </>
              ) : (
                t('workday.startWorkday') || 'Start Workday'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Workday Confirmation Dialog */}
      <AlertDialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('workday.endWorkdayConfirmTitle') || 'End Workday?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('workday.endWorkdayConfirmDescription') || 'Are you sure you want to end the workday? This will close all active sessions and finalize the day\'s records.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndWorkday}
              className="bg-red-500 hover:bg-red-600"
              disabled={isEnding}
            >
              {isEnding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('workday.ending') || 'Ending...'}
                </>
              ) : (
                t('workday.endWorkday') || 'End Workday'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Release Worker Confirmation Dialog */}
      <AlertDialog open={!!releaseWorkerConfirmId} onOpenChange={(open) => { if (!open) setReleaseWorkerConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('workday.endShiftConfirmTitle') || 'End Shift?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('workday.endShiftConfirmDescription') || 'Are you sure you want to end this worker\'s shift? This will release them from the current workday.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (releaseWorkerConfirmId) {
                  handleWorkerAction(releaseWorkerConfirmId, 'release');
                }
                setReleaseWorkerConfirmId(null);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              {t('workday.endShift') || 'End Shift'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Worker Dialog */}
      <AlertDialog open={addWorkerOpen} onOpenChange={setAddWorkerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('workday.addWorkerTitle') || 'Add Worker to Shift'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('workday.addWorkerDescription') || 'Select a worker to add to today\'s shift'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ScrollArea className="max-h-[300px] my-4">
            <div className="space-y-2">
              {allWorkers
                .filter(w => !workdayWorkers.find(ww => ww.id === w.id))
                .map((worker) => (
                  <button
                    key={worker.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    onClick={() => handleAddWorkerToShift(worker.id)}
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {worker.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="font-medium block">{worker.name}</span>
                      <span className="text-xs text-muted-foreground">{worker.role}</span>
                    </div>
                  </button>
                ))}
              {allWorkers.filter(w => !workdayWorkers.find(ww => ww.id === w.id)).length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  {t('workday.allWorkersAssigned') || 'All workers are already assigned'}
                </p>
              )}
            </div>
          </ScrollArea>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dismiss Shifts Confirmation Dialog */}
      <AlertDialog open={dismissShiftsConfirmOpen} onOpenChange={setDismissShiftsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('workday.dismissShiftsTitle') || 'Dismiss Shift History?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('workday.dismissShiftsDescription') || 'Are you sure you want to dismiss all ended shift banners? The shift data will still be saved, but the banners will be hidden until tomorrow.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEndedShiftsDismissed(true);
                setDismissShiftsConfirmOpen(false);
              }}
            >
              {t('common.dismiss') || 'Dismiss'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
