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
  Clipboard,
  Plus,
  Trash2,
  Calendar,
  User,
  Loader2,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import type { Reminder } from '@shared/schema';

interface RemindersSectionProps {
  restaurantId: number | undefined;
}

export function RemindersSection({ restaurantId }: RemindersSectionProps) {
  const [newReminder, setNewReminder] = useState('');
  const [isImportant, setIsImportant] = useState(false);
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
    mutationFn: async ({ text, important }: { text: string; important: boolean }) => {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          text,
          createdBy: appUser?.id || 'unknown',
          createdByName: appUser?.name || 'Unknown User',
          isImportant: important,
        }),
      });
      if (!response.ok) throw new Error('Failed to create reminder');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', restaurantId] });
      setNewReminder('');
      setIsImportant(false);
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
      createMutation.mutate({ text: newReminder.trim(), important: isImportant });
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

  if (!restaurantId) {
    return null;
  }

  return (
    <Card className="overflow-hidden border-cyan-500/20">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent" />
        <CardHeader className="pb-3 relative">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-xl">
              <Clipboard className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <CardTitle className="text-base">
                Restaurant Board
              </CardTitle>
              {reminders.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {reminders.length} note{reminders.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </div>
      <CardContent className="pt-0">
        {/* Notes List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="p-3 bg-cyan-500/10 rounded-full mb-3">
              <MessageSquare className="h-6 w-6 text-cyan-500/50" />
            </div>
            <p className="text-sm text-muted-foreground">
              No notes yet. Add one below!
            </p>
          </div>
        ) : (
          <ScrollArea className={reminders.length > 3 ? 'h-[220px]' : ''}>
            <div className="space-y-2 pr-2 pt-2">
              {/* Notes sorted by posting time (newest first from API) */}
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`p-3 rounded-xl border group transition-colors relative ${
                    reminder.isImportant 
                      ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50' 
                      : 'bg-[#181818] border-white/5 hover:border-white/10'
                  }`}
                >
                  {/* Important badge at top right */}
                  {reminder.isImportant && (
                    <div className="absolute -top-1.5 -right-1.5 p-1 bg-amber-500 rounded-full shadow-lg">
                      <AlertTriangle className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <p className="text-sm flex-1" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {reminder.text}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
                      onClick={() => deleteMutation.mutate(reminder.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
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
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Add Note Input */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
          <Input
            placeholder="Add a note to the board..."
            value={newReminder}
            onChange={(e) => setNewReminder(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={createMutation.isPending}
            className={`flex-1 bg-[#181818] border-white/10 focus:border-cyan-500/50 ${
              isImportant ? 'border-amber-500/30' : ''
            }`}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsImportant(!isImportant)}
            className={`flex-shrink-0 ${
              isImportant 
                ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' 
                : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
            }`}
            title={isImportant ? 'Marked as important' : 'Mark as important'}
          >
            <AlertTriangle className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleAddReminder}
            disabled={!newReminder.trim() || createMutation.isPending}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400"
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
