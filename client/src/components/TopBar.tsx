import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Users, Building2, Menu, Bell, Trash2, Upload, Image as ImageIcon, Plus, Pencil, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocketContext } from '@/contexts/WebSocketContext';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Restaurant, Workday } from '@shared/schema';

interface Notification {
  id: string;
  message: string;
  userName?: string;
  timestamp: Date;
  read: boolean;
}

interface TopBarProps {
  selectedRestaurant: Restaurant | null;
  activeWorkday: Workday | null;
  workdayElapsedTime: string;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onMenuClick?: () => void;
  notifications?: Notification[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
}

const MIN_COMPONENT_GAP = 5;

export default function TopBar({
  selectedRestaurant,
  activeWorkday,
  workdayElapsedTime,
  onSelectRestaurant,
  onMenuClick,
  notifications = [],
  onMarkNotificationRead,
  onMarkAllAsRead,
}: TopBarProps) {
  const { connectedUsers, connectedUsersList, addMessageListener } = useWebSocketContext();
  const { t } = useLanguage();
  const { isAdmin, isFloorOrKitchen, appUser } = useAuth();

  const allConnectedUsers = connectedUsersList || [];

  const totalConnectedUsers = connectedUsers;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [usersPopoverOpen, setUsersPopoverOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [restaurantPopoverOpen, setRestaurantPopoverOpen] = useState(false);

  // Restaurant form states
  const [createMode, setCreateMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newRestaurantName, setNewRestaurantName] = useState('');
  const [newRestaurantAddress, setNewRestaurantAddress] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [restaurantToEdit, setRestaurantToEdit] = useState<Restaurant | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Refs for measuring TopBar sections to center the pill
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [pillWidth, setPillWidth] = useState(9999);
  const [pillOffset, setPillOffset] = useState(0);

  const updatePillLayout = useCallback(() => {
    if (!containerRef.current || !leftRef.current || !rightRef.current || !pillRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const left = leftRef.current.getBoundingClientRect();
    const right = rightRef.current.getBoundingClientRect();

    const center = container.width / 2;
    const leftBoundary = left.right - container.left + MIN_COMPONENT_GAP;
    const rightBoundary = right.left - container.left - MIN_COMPONENT_GAP;
    const availableWidth = Math.max(0, rightBoundary - leftBoundary);

    // Measure natural (full-content) pill width independently from current rendered width.
    let naturalPillWidth = pillWidth;
    const pillClone = pillRef.current.cloneNode(true) as HTMLElement;
    pillClone.style.position = 'fixed';
    pillClone.style.left = '-10000px';
    pillClone.style.top = '-10000px';
    pillClone.style.width = 'max-content';
    pillClone.style.maxWidth = 'none';
    pillClone.style.minWidth = '0';
    pillClone.style.transform = 'none';
    pillClone.style.visibility = 'hidden';
    pillClone.style.pointerEvents = 'none';
    pillClone.style.opacity = '0';

    try {
      document.body.appendChild(pillClone);
      naturalPillWidth = Math.ceil(pillClone.getBoundingClientRect().width);
    } finally {
      if (pillClone.parentNode) {
        pillClone.parentNode.removeChild(pillClone);
      }
    }

    // Full width when it fits, otherwise maximum allowed width.
    const targetPillWidth = Math.max(0, Math.min(availableWidth, naturalPillWidth));
    const renderedPillWidth = Math.max(0, targetPillWidth);

    // Keep pill centered unless it would collide, then slide (usually left when timer is visible).
    const minCenter = leftBoundary + renderedPillWidth / 2;
    const maxCenter = rightBoundary - renderedPillWidth / 2;
    const targetCenter =
      minCenter > maxCenter
        ? (leftBoundary + rightBoundary) / 2
        : Math.min(Math.max(center, minCenter), maxCenter);
    const newOffset = Math.round(targetCenter - center);

    setPillWidth(prev => {
      const val = Math.round(targetPillWidth);
      return prev === val ? prev : val;
    });
    setPillOffset(prev => prev === newOffset ? prev : newOffset);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(updatePillLayout);

    const observer = new ResizeObserver(updatePillLayout);
    if (containerRef.current) observer.observe(containerRef.current);
    if (leftRef.current) observer.observe(leftRef.current);
    if (rightRef.current) observer.observe(rightRef.current);
    if (pillRef.current) observer.observe(pillRef.current);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [updatePillLayout]);

  useEffect(() => {
    const frame = requestAnimationFrame(updatePillLayout);
    return () => cancelAnimationFrame(frame);
  }, [
    updatePillLayout,
    selectedRestaurant?.name,
    totalConnectedUsers,
    activeWorkday?.isActive,
    workdayElapsedTime,
  ]);

  // Fetch restaurants
  const { data: allRestaurants = [], isLoading: restaurantsLoading } = useQuery({
    queryKey: ['/api/restaurants'],
    queryFn: () => apiRequest('/api/restaurants'),
    refetchInterval: 30000, // Refresh every 30s so new restaurants appear for all users
  });

  // Filter restaurants based on user role and assignments
  // Kitchen/Floor: only see assigned restaurants (no fallback)
  // Admin/Manager: see all restaurants
  const restaurants = useMemo(() => {
    if (isAdmin) return allRestaurants;
    if (isFloorOrKitchen) {
      if (!appUser?.assignedRestaurants || appUser.assignedRestaurants.length === 0) {
        return []; // No assignments = no restaurants visible
      }
      return allRestaurants.filter((r: Restaurant) =>
        appUser.assignedRestaurants!.includes(r.id)
      );
    }
    // For other roles, show all
    return allRestaurants;
  }, [allRestaurants, isAdmin, isFloorOrKitchen, appUser?.assignedRestaurants]);

  // Auto-select first assigned restaurant if current selection isn't in the filtered list
  useEffect(() => {
    if (restaurants.length === 0) return;
    if (selectedRestaurant && restaurants.some((r: Restaurant) => r.id === selectedRestaurant.id)) return;
    // Current selection is not in the visible list — select the first one
    onSelectRestaurant(restaurants[0]);
  }, [restaurants, selectedRestaurant]);

  // Sync selectedRestaurant with latest fetched data (name/image/address changes)
  useEffect(() => {
    if (!selectedRestaurant || allRestaurants.length === 0) return;
    const fresh = allRestaurants.find((r: Restaurant) => r.id === selectedRestaurant.id);
    if (!fresh) return;
    if (fresh.name !== selectedRestaurant.name ||
        fresh.address !== selectedRestaurant.address ||
        fresh.imageUrl !== selectedRestaurant.imageUrl) {
      onSelectRestaurant(fresh);
    }
  }, [allRestaurants, selectedRestaurant]);

  // Listen for RESTAURANT_UPDATED WebSocket message to refetch instantly
  useEffect(() => {
    const removeListener = addMessageListener((message) => {
      if (message.type === 'RESTAURANT_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] });
      }
    });
    return removeListener;
  }, [addMessageListener, queryClient]);

  // Create restaurant mutation
  const createRestaurantMutation = useMutation({
    mutationFn: async (data: { name: string; address: string }) => {
      const restaurant = await apiRequest('/api/restaurants', { method: 'POST', body: data });
      if (selectedImage && restaurant.id) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        await fetch(`/api/restaurants/${restaurant.id}/upload-image`, { method: 'POST', body: formData });
        const updatedRestaurant = await apiRequest(`/api/restaurants/${restaurant.id}`);
        return updatedRestaurant;
      }
      return restaurant;
    },
    onSuccess: async (data) => {
      resetForm();
      setCreateMode(false);
      await queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] });
      onSelectRestaurant(data);
      setRestaurantPopoverOpen(false);
      toast({ title: 'Restaurant Created', description: `${data.name} has been added successfully.` });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create restaurant.', variant: 'destructive' });
    },
  });

  // Update restaurant mutation
  const updateRestaurantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; address: string } }) => {
      const restaurant = await apiRequest(`/api/restaurants/${id}`, { method: 'PUT', body: data });
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        await fetch(`/api/restaurants/${id}/upload-image`, { method: 'POST', body: formData });
        const updatedRestaurant = await apiRequest(`/api/restaurants/${id}`);
        return updatedRestaurant;
      }
      return restaurant;
    },
    onSuccess: async (data) => {
      resetForm();
      setEditMode(false);
      setRestaurantToEdit(null);
      await queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] });
      if (selectedRestaurant?.id === data.id) {
        onSelectRestaurant(data);
      }
      toast({ title: 'Restaurant Updated', description: `${data.name} has been updated successfully.` });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update restaurant.', variant: 'destructive' });
    },
  });

  // Delete restaurant mutation
  const deleteRestaurantMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/restaurants/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setRestaurantToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants'] });
      toast({ title: 'Restaurant Deleted', description: 'The restaurant has been deleted.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete restaurant.', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setNewRestaurantName('');
    setNewRestaurantAddress('');
    setSelectedImage(null);
    setImagePreview('');
  };

  const handleCancel = () => {
    setCreateMode(false);
    setEditMode(false);
    setRestaurantToEdit(null);
    resetForm();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    onSelectRestaurant(restaurant);
    setRestaurantPopoverOpen(false);
  };

  const handleEditClick = (e: React.MouseEvent, restaurant: Restaurant) => {
    e.stopPropagation();
    setRestaurantToEdit(restaurant);
    setNewRestaurantName(restaurant.name);
    setNewRestaurantAddress(restaurant.address);
    if (restaurant.imageUrl) setImagePreview(restaurant.imageUrl);
    setEditMode(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, restaurant: Restaurant) => {
    e.stopPropagation();
    setRestaurantToDelete(restaurant);
    setDeleteDialogOpen(true);
  };

  const handleCreateRestaurant = () => {
    if (!newRestaurantName.trim() || !newRestaurantAddress.trim()) {
      toast({ title: 'Invalid Input', description: 'Name and address are required.', variant: 'destructive' });
      return;
    }
    createRestaurantMutation.mutate({ name: newRestaurantName.trim(), address: newRestaurantAddress.trim() });
  };

  const handleUpdateRestaurant = () => {
    if (!newRestaurantName.trim() || !newRestaurantAddress.trim() || !restaurantToEdit) return;
    updateRestaurantMutation.mutate({ id: restaurantToEdit.id, data: { name: newRestaurantName.trim(), address: newRestaurantAddress.trim() } });
  };

  const handleNotificationsOpenChange = (open: boolean) => {
    setNotificationsOpen(open);
    if (open && onMarkAllAsRead) {
      onMarkAllAsRead();
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('lt-LT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('time.justNow') || 'just now';
    if (diffMins < 60) return `${diffMins} ${t('time.minAgo') || 'min ago'}`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${t('time.hourAgo') || 'h ago'}`;

    return formatTime(date);
  };

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-4 pt-3">
      <div ref={containerRef} className="relative flex h-[48px] items-center justify-between">
        {/* Left: Menu Button */}
        <div ref={leftRef} className="flex-shrink-0 pointer-events-auto">
          <button
            onClick={onMenuClick}
            className="p-2.5 bg-white/25 dark:bg-[#181E23]/25 backdrop-blur-xl backdrop-saturate-150 hover:bg-white/40 dark:hover:bg-[#1A242E]/40 rounded-full transition-colors shadow-lg shadow-black/10 dark:shadow-black/20 border border-white/50 dark:border-white/10"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Center: Restaurant Pill — absolutely centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <motion.div
            ref={pillRef}
            className="flex items-center bg-white/25 dark:bg-[#181E23]/25 backdrop-blur-xl backdrop-saturate-150 rounded-full shadow-lg shadow-black/10 dark:shadow-black/20 border border-white/50 dark:border-white/10 p-1 overflow-hidden"
            animate={{ width: pillWidth, x: pillOffset }}
            initial={false}
            transition={{
              width: { duration: 0.08, ease: 'linear' },
              x: { duration: 0.1, ease: 'linear' },
            }}
          >
            {/* Restaurant Selector */}
            <Popover open={restaurantPopoverOpen} onOpenChange={(open) => {
              setRestaurantPopoverOpen(open);
              if (!open) handleCancel();
            }}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/30 dark:hover:bg-white/10 transition-colors min-w-0"
                >
                  {selectedRestaurant ? (
                    <>
                      {selectedRestaurant.imageUrl ? (
                        <img
                          src={selectedRestaurant.imageUrl}
                          alt={selectedRestaurant.name}
                          className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      <span className="block min-w-0 font-semibold text-sm truncate">
                        {selectedRestaurant.name}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    </>
                  ) : (
                    <>
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="block min-w-0 text-sm text-muted-foreground truncate">
                        {t('topbar.selectRestaurant')}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </>
                  )}
                </button>
              </PopoverTrigger>
            <PopoverContent sideOffset={3} className="w-80 p-0 popover-center">
              {createMode || editMode ? (
                // Create/Edit Form
                <div className="p-4">
                  <h4 className="font-semibold text-sm mb-4">
                    {createMode ? (t('modal.createRestaurant') || 'Create Restaurant') : 'Edit Restaurant'}
                  </h4>

                  {/* Image Upload */}
                  <div className="flex justify-center mb-4">
                    <Input
                      id="restaurant-image-topbar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('restaurant-image-topbar')?.click()}
                      className="relative w-20 h-20 border-2 border-dashed border-muted-foreground/30 rounded-full hover:border-muted-foreground/50 transition-colors group overflow-hidden"
                    >
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload className="h-4 w-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs">Name</Label>
                      <Input
                        id="name"
                        placeholder="Restaurant name"
                        value={newRestaurantName}
                        onChange={(e) => setNewRestaurantName(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="text-xs">Address</Label>
                      <Input
                        id="address"
                        placeholder="Restaurant address"
                        value={newRestaurantAddress}
                        onChange={(e) => setNewRestaurantAddress(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={handleCancel}>
                      {t('common.cancel') || 'Cancel'}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={createMode ? handleCreateRestaurant : handleUpdateRestaurant}
                      disabled={createRestaurantMutation.isPending || updateRestaurantMutation.isPending}
                    >
                      {createRestaurantMutation.isPending || updateRestaurantMutation.isPending
                        ? t('common.saving') || 'Saving...'
                        : t('common.save') || 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                // Restaurant List
                <>
                  <div className="p-3 border-b">
                    <h4 className="font-semibold text-sm">{t('topbar.selectRestaurant') || 'Select Restaurant'}</h4>
                  </div>
                  <ScrollArea className="max-h-[280px]">
                    {restaurantsLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {t('common.loading') || 'Loading...'}
                      </div>
                    ) : restaurants.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No restaurants found
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {restaurants.map((restaurant: Restaurant) => (
                          <button
                            key={restaurant.id}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors group ${
                              selectedRestaurant?.id === restaurant.id
                                ? 'bg-primary/10'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handleRestaurantSelect(restaurant)}
                          >
                            {restaurant.imageUrl ? (
                              <img
                                src={restaurant.imageUrl}
                                alt={restaurant.name}
                                className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{restaurant.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{restaurant.address}</p>
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => handleEditClick(e, restaurant)}
                                >
                                  <Pencil className="h-3.5 w-3.5 text-amber-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => handleDeleteClick(e, restaurant)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  {isAdmin && (
                    <>
                      <Separator />
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2 h-9"
                          onClick={() => setCreateMode(true)}
                        >
                          <Plus className="h-4 w-4" />
                          {t('modal.createRestaurant') || 'Create New Restaurant'}
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </PopoverContent>
          </Popover>

            {/* Separator */}
            <div className="w-px h-6 bg-white/30 dark:bg-white/10 mx-1 flex-shrink-0" />

            {/* Connected Workers - Inside Center Pill */}
            <Popover open={usersPopoverOpen} onOpenChange={setUsersPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/30 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium">{totalConnectedUsers}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent sideOffset={3} className="w-64 p-0 popover-center">
                <div className="p-3 border-b">
                  <h4 className="font-semibold text-sm">{t('topbar.activeUsers') || 'Active Users'}</h4>
                  <p className="text-xs text-muted-foreground">{totalConnectedUsers} {t('topbar.usersOnline') || 'users online'}</p>
                </div>
                <ScrollArea className="max-h-[250px]">
                  {allConnectedUsers.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {allConnectedUsers.map((user, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative">
                              {user.photoUrl ? (
                                <img
                                  src={user.photoUrl}
                                  alt={user.name}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-xs font-medium">
                                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </span>
                                </div>
                              )}
                              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                            </div>
                            <span className="text-sm font-medium truncate">{user.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatRelativeTime(user.connectedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {t('topbar.noUsersOnline') || 'No users online'}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </motion.div>
        </div>

        {/* Right: Timer + Notifications */}
        <div ref={rightRef} className="flex items-center gap-[5px] flex-shrink-0">
          <AnimatePresence>
            {activeWorkday?.isActive && (
              <motion.div
                key="workday-timer"
                initial={{ opacity: 0, scale: 0.8, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                exit={{ opacity: 0, scale: 0.8, width: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="flex-shrink-0 pointer-events-auto"
              >
                <div className="px-3 py-2.5 rounded-full bg-white/25 dark:bg-[#181E23]/25 backdrop-blur-xl backdrop-saturate-150 shadow-lg shadow-black/10 dark:shadow-black/20 border border-green-500/50">
                  <span className="text-xs font-mono font-bold text-green-500 whitespace-nowrap">
                    {workdayElapsedTime.split(':').slice(0, 2).join(':')}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pointer-events-auto">
            <Popover open={notificationsOpen} onOpenChange={handleNotificationsOpenChange}>
              <PopoverTrigger asChild>
                <button className="relative p-2.5 bg-white/25 dark:bg-[#181E23]/25 backdrop-blur-xl backdrop-saturate-150 hover:bg-white/40 dark:hover:bg-[#1A242E]/40 rounded-full transition-colors shadow-lg shadow-black/10 dark:shadow-black/20 border border-white/50 dark:border-white/10">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0">
                <div className="p-3 border-b">
                  <h4 className="font-semibold text-sm">{t('topbar.notifications') || 'Notifications'}</h4>
                </div>
                <ScrollArea className="h-[200px]">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {t('topbar.noNotifications') || 'No notifications'}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                            !notification.read ? 'bg-primary/5' : ''
                          }`}
                          onClick={() => onMarkNotificationRead?.(notification.id)}
                        >
                          <p className="text-sm">{notification.message}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {notification.userName && (
                              <span className="font-medium">{notification.userName}</span>
                            )}
                            <span>{formatTime(notification.timestamp)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </header>

    {/* Delete Restaurant Confirmation */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Restaurant?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete "{restaurantToDelete?.name}" and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setRestaurantToDelete(null)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => restaurantToDelete && deleteRestaurantMutation.mutate(restaurantToDelete.id)}
            className="bg-red-500 hover:bg-red-600"
            disabled={deleteRestaurantMutation.isPending}
          >
            {deleteRestaurantMutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
