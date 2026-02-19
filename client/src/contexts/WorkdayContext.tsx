import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import type { Workday, Restaurant } from '@shared/schema';

interface WorkdayContextType {
  activeWorkday: Workday | null;
  isWorkdayActive: boolean;
  isWorkdayParticipant: boolean;
  isOrWasWorkdayParticipant: boolean;
  workdayWorkerIds: string[];
  elapsedTime: string;
  elapsedSeconds: number;
  selectedRestaurant: Restaurant | null;
  setSelectedRestaurant: (restaurant: Restaurant | null) => void;
  startWorkday: (workdayId: number) => Promise<void>;
  endWorkday: (workdayId: number) => Promise<void>;
  refreshWorkday: () => void;
  isLoading: boolean;
}

const WorkdayContext = createContext<WorkdayContextType | undefined>(undefined);

export function useWorkday() {
  const context = useContext(WorkdayContext);
  if (context === undefined) {
    throw new Error('useWorkday must be used within a WorkdayProvider');
  }
  return context;
}

function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function WorkdayProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { appUser, isAdmin } = useAuth();
  const { addMessageListener } = useWebSocketContext();
  const [selectedRestaurant, setSelectedRestaurantState] = useState<Restaurant | null>(() => {
    const saved = localStorage.getItem('selectedRestaurant');
    return saved ? JSON.parse(saved) : null;
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Persist restaurant selection
  const setSelectedRestaurant = useCallback((restaurant: Restaurant | null) => {
    setSelectedRestaurantState(restaurant);
    if (restaurant) {
      localStorage.setItem('selectedRestaurant', JSON.stringify(restaurant));
      localStorage.setItem('selectedRestaurantId', restaurant.id.toString());
    } else {
      localStorage.removeItem('selectedRestaurant');
      localStorage.removeItem('selectedRestaurantId');
    }
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('restaurantSelected', { detail: restaurant }));
  }, []);

  // Validate cached restaurant still exists and sync with latest data
  useEffect(() => {
    if (!selectedRestaurant) return;
    fetch('/api/restaurants')
      .then(res => res.json())
      .then((restaurants: Restaurant[]) => {
        const fresh = restaurants.find(r => r.id === selectedRestaurant.id);
        if (!fresh) {
          setSelectedRestaurant(restaurants[0] || null);
        } else if (fresh.name !== selectedRestaurant.name ||
                   fresh.address !== selectedRestaurant.address ||
                   fresh.imageUrl !== selectedRestaurant.imageUrl) {
          setSelectedRestaurant(fresh);
        }
      })
      .catch(() => {});
  }, []); // Run once on mount

  // Fetch active workday for selected restaurant
  const { data: activeWorkday, isLoading, refetch } = useQuery({
    queryKey: ['activeWorkday', selectedRestaurant?.id],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return null;
      const response = await fetch(`/api/workdays/active/${selectedRestaurant.id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch active workday');
      }
      return response.json() as Promise<Workday>;
    },
    enabled: !!selectedRestaurant?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch workday workers to determine participant status
  const { data: workdayWorkersData = [] } = useQuery({
    queryKey: ['workday-workers-ctx', activeWorkday?.id],
    queryFn: async () => {
      const res = await fetch(`/api/workdays/${activeWorkday!.id}/workers`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeWorkday?.id,
    staleTime: 10000,
  });

  const workdayWorkerIds = workdayWorkersData.map((w: any) => w.workerId as string);
  const activeWorkerIds = workdayWorkersData
    .filter((w: any) => w.status !== 'released')
    .map((w: any) => w.workerId as string);
  const isWorkdayActive = activeWorkday?.isActive || false;
  // Active participant: admin or currently working/resting (not released)
  const isWorkdayParticipant = isAdmin || (isWorkdayActive && activeWorkerIds.includes(appUser?.id || ''));
  // Was ever in this workday (includes released workers) - for history access
  const isOrWasWorkdayParticipant = isAdmin || (isWorkdayActive && workdayWorkerIds.includes(appUser?.id || ''));

  // Invalidate workday query when workday starts/ends via WebSocket (cross-user sync)
  useEffect(() => {
    const removeListener = addMessageListener((message) => {
      if (message.type === 'WORKDAY_STARTED' || message.type === 'WORKDAY_ENDED') {
        queryClient.invalidateQueries({ queryKey: ['activeWorkday'] });
        queryClient.invalidateQueries({ queryKey: ['workday-workers-ctx'] });
      }
      if (message.type === 'WORKER_JOINED' || message.type === 'WORKER_LEFT' || message.type === 'WORKER_STATUS_CHANGED') {
        queryClient.invalidateQueries({ queryKey: ['workday-workers-ctx'] });
      }
    });
    return removeListener;
  }, [addMessageListener, queryClient]);

  // Start workday mutation
  const startMutation = useMutation({
    mutationFn: async (workdayId: number) => {
      if (!workdayId || isNaN(workdayId)) {
        throw new Error(`Invalid workday ID: ${workdayId}`);
      }
      return await apiRequest(`/api/workdays/${workdayId}/start`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeWorkday'] });
      queryClient.invalidateQueries({ queryKey: ['workdays'] });
    },
  });

  // End workday mutation
  const endMutation = useMutation({
    mutationFn: async (workdayId: number) => {
      if (!workdayId || isNaN(workdayId)) {
        throw new Error(`Invalid workday ID: ${workdayId}`);
      }
      return await apiRequest(`/api/workdays/${workdayId}/end`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeWorkday'] });
      queryClient.invalidateQueries({ queryKey: ['workdays'] });
      setElapsedSeconds(0);
    },
  });

  // Timer effect - update elapsed time every second when workday is active
  useEffect(() => {
    if (!activeWorkday?.isActive || !activeWorkday?.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(activeWorkday.startedAt).getTime();

    const updateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);
    };

    // Initial update
    updateElapsed();

    // Update every second
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeWorkday?.isActive, activeWorkday?.startedAt]);

  // Listen for restaurant selection from other components
  useEffect(() => {
    const handleRestaurantSelected = (event: CustomEvent<Restaurant | null>) => {
      if (event.detail?.id !== selectedRestaurant?.id) {
        setSelectedRestaurantState(event.detail);
      }
    };

    window.addEventListener('restaurantSelected', handleRestaurantSelected as EventListener);
    return () => {
      window.removeEventListener('restaurantSelected', handleRestaurantSelected as EventListener);
    };
  }, [selectedRestaurant?.id]);

  const value: WorkdayContextType = {
    activeWorkday: activeWorkday || null,
    isWorkdayActive,
    isWorkdayParticipant,
    isOrWasWorkdayParticipant,
    workdayWorkerIds,
    elapsedTime: formatElapsedTime(elapsedSeconds),
    elapsedSeconds,
    selectedRestaurant,
    setSelectedRestaurant,
    startWorkday: (id) => startMutation.mutateAsync(id),
    endWorkday: (id) => endMutation.mutateAsync(id),
    refreshWorkday: refetch,
    isLoading,
  };

  return <WorkdayContext.Provider value={value}>{children}</WorkdayContext.Provider>;
}
