import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  Bell,
  Plus,
  Trash2,
  Calendar,
  User,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import type { Reminder } from '@shared/schema';

interface RemindersSectionProps {
  restaurantId: number | undefined;
}

export function RemindersSection({ restaurantId }: RemindersSectionProps) {
  const [newReminder, setNewReminder] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { appUser } = useAuth();
  const { t } = useLanguage();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ['reminders', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const response = await fetch(`/api/reminders?restaurantId=${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch reminders');
      return response.json();
    },
    enabled: !!restaurantId,
  });

  const createMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          text,
          createdBy: appUser?.id || 'unknown',
          createdByName: appUser?.name || 'Unknown User',
        }),
      });
      if (!response.ok) throw new Error('Failed to create reminder');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', restaurantId] });
      setNewReminder('');
      addNotification(t('restaurant.reminderAdded') || 'Reminder added');
    },
    onError: () => {
      addNotification(t('restaurant.reminderError') || 'Failed to add reminder');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/reminders/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete reminder');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', restaurantId] });
      addNotification(t('restaurant.reminderDeleted') || 'Reminder deleted');
    },
  });

  const handleAddReminder = () => {
    if (newReminder.trim()) {
      createMutation.mutate(newReminder.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddReminder();
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('lt-LT', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayedReminders = isExpanded ? reminders : reminders.slice(0, 3);

  if (!restaurantId) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">
              {t('restaurant.reminders') || 'Reminders'}
            </CardTitle>
            {reminders.length > 0 && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                {reminders.length}
              </span>
            )}
          </div>
          {reminders.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs"
            >
              {isExpanded
                ? (t('common.showLess') || 'Show less')
                : (t('common.showMore') || `Show all (${reminders.length})`)}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Reminders List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('restaurant.noReminders') || 'No reminders yet'}
            </p>
          </div>
        ) : (
          <ScrollArea className={isExpanded ? 'h-[200px]' : ''}>
            <div className="space-y-2">
              {displayedReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{reminder.text}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {reminder.createdByName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(reminder.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteMutation.mutate(reminder.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Add Reminder Input */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Input
            placeholder={t('restaurant.reminderPlaceholder') || 'Add a reminder...'}
            value={newReminder}
            onChange={(e) => setNewReminder(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={createMutation.isPending}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleAddReminder}
            disabled={!newReminder.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
