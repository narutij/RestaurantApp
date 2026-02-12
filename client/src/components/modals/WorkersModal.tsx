import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { accountRequestService, userService, type AppUser, type AccountRequest } from "@/lib/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { secondaryAuth } from "@/lib/firebase";
import { StaffDetailModal } from './StaffDetailModal';
import { apiRequest } from '@/lib/queryClient';
import type { Restaurant } from '@shared/schema';
import {
  UserCheck,
  UserX,
  Clock,
  Shield,
  Loader2,
  ChefHat,
  Users,
  X,
  Check,
  Ban,
  Footprints,
  Building2,
  ChevronDown,
  Trash2
} from 'lucide-react';


type WorkerRole = 'admin' | 'kitchen' | 'floor';

interface WorkersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewOnly?: boolean;
}

export function WorkersModal({ open, onOpenChange, viewOnly = false }: WorkersModalProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const { connectedUsersList } = useWebSocketContext();
  const queryClient = useQueryClient();

  // Derive online status from WebSocket connected users
  const onlineNames = useMemo(() => {
    return new Set(connectedUsersList.map(u => u.name));
  }, [connectedUsersList]);

  const isUserOnline = (name: string) => onlineNames.has(name);
  const [activeUsers, setActiveUsers] = useState<AppUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, WorkerRole>>({});
  const [selectedRestaurantsForRequest, setSelectedRestaurantsForRequest] = useState<Record<string, number[]>>({});

  // Staff detail modal state
  const [selectedStaff, setSelectedStaff] = useState<AppUser | null>(null);
  const [staffDetailOpen, setStaffDetailOpen] = useState(false);

  // Restaurant assignment popover state
  const [restaurantAssignOpen, setRestaurantAssignOpen] = useState<string | null>(null);

  // Role change confirmation state
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    user: AppUser;
    newRole: WorkerRole;
  } | null>(null);

  // Delete user confirmation state
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<AppUser | null>(null);

  // Fetch all restaurants for assignment
  const { data: allRestaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
    queryFn: () => apiRequest('/api/restaurants'),
    enabled: open && isAdmin,
  });

  // Update user's assigned restaurants
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ userId, restaurantIds }: { userId: string; restaurantIds: number[] }) => {
      await userService.update(userId, { assignedRestaurants: restaurantIds });
    },
    onSuccess: () => {
      toast({
        title: t('staff.restaurantsUpdated'),
        description: t('staff.restaurantsUpdatedDesc'),
      });
      loadData();
    },
    onError: (error: any) => {
      toast({
        title: t('staff.updateFailed'),
        description: error.message || t('staff.failedToUpdateRestaurants'),
        variant: "destructive"
      });
    },
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    const roles: Record<string, WorkerRole> = {};
    pendingRequests.forEach(req => {
      if (!selectedRoles[req.id]) {
        roles[req.id] = 'floor';
      }
    });
    if (Object.keys(roles).length > 0) {
      setSelectedRoles(prev => ({ ...prev, ...roles }));
    }
  }, [pendingRequests]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResult, requestsResult] = await Promise.allSettled([
        userService.getAll(),
        accountRequestService.getPending()
      ]);

      const realUsers = usersResult.status === 'fulfilled' ? usersResult.value : [];
      const realRequests = requestsResult.status === 'fulfilled' ? requestsResult.value : [];

      // Filter: only active users, hide developer account
      const HIDDEN_EMAILS = ['narutisjustinas@gmail.com'];
      const filteredUsers = realUsers.filter(u =>
        u.status === 'active' && !HIDDEN_EMAILS.includes(u.email?.toLowerCase())
      );

      setActiveUsers(filteredUsers);
      setPendingRequests(realRequests);
    } catch (error) {
      console.error('Error loading workers data:', error);
      setActiveUsers([]);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (request: AccountRequest) => {
    const role = selectedRoles[request.id] || 'floor';
    const assignedRestaurants = selectedRestaurantsForRequest[request.id] || [];
    try {
      setProcessingRequest(request.id);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, request.email, request.password);
      await signOut(secondaryAuth);
      await userService.add({
        uid: userCredential.user.uid,
        email: request.email,
        name: request.name,
        role: role,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        approvedAt: new Date(),
        ...(role !== 'admin' && assignedRestaurants.length > 0 ? { assignedRestaurants } : {})
      });
      await accountRequestService.update(request.id, {
        status: 'approved',
        role: role,
        approvedAt: new Date()
      });
      await loadData();
      
      toast({
        title: t('staff.requestApproved'),
        description: `${request.name} ${t('staff.approvedAs')} ${getRoleLabel(role)}`,
      });
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: t('staff.approvalFailed'),
        description: error.message || t('staff.failedToApprove'),
        variant: "destructive"
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (request: AccountRequest) => {
    try {
      setProcessingRequest(request.id);
      
      await accountRequestService.update(request.id, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: 'Rejected by admin'
      });
      await loadData();
      
      toast({
        title: t('staff.requestDeclined'),
        description: `${request.name} ${t('staff.requestDeclinedDesc')}`,
      });
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: t('staff.declineFailed'),
        description: error.message || t('staff.failedToDecline'),
        variant: "destructive"
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: WorkerRole) => {
    try {
      await userService.update(userId, { role: newRole });
      toast({
        title: t('staff.roleUpdated'),
        description: `${t('staff.roleUpdatedTo')} ${getRoleLabel(newRole)}`,
      });
      await loadData();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: t('staff.updateFailed'),
        description: error.message || t('staff.failedToUpdateRole'),
        variant: "destructive"
      });
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin': return t('staff.roleAdmin');
      case 'kitchen': return t('staff.roleKitchen');
      case 'floor': return t('staff.roleFloor');
      default: return t('staff.roleFloor');
    }
  };

  const handleConfirmRoleChange = () => {
    if (!roleChangeConfirm) return;

    const { user, newRole } = roleChangeConfirm;
    handleUpdateUserRole(user.id, newRole);
    setRoleChangeConfirm(null);
  };

  const handleDeleteUser = async (user: AppUser) => {
    try {
      await userService.delete(user.id);
      toast({
        title: t('staff.userRemoved'),
        description: `${user.name} ${t('staff.removedFromStaff')}`,
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: t('staff.removeFailed'),
        description: error.message || t('staff.failedToRemove'),
        variant: "destructive"
      });
    } finally {
      setDeleteUserConfirm(null);
    }
  };


  // View-only staff list for non-admins or when viewOnly is set
  if (!isAdmin || viewOnly) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[440px] p-0 bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10 overflow-hidden max-h-[85vh]" hideCloseButton>
            {/* Header */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-violet-500/10 to-transparent" />
              <div className="relative px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/20 rounded-xl">
                      <Users className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{t('staff.title')}</h2>
                      <p className="text-xs text-muted-foreground">{activeUsers.length} {t('staff.teamMembers')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="max-h-[calc(85vh-100px)]">
                <div className="p-6 pt-2 space-y-2">
                  {activeUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">{t('staff.noStaffFound')}</p>
                    </div>
                  ) : (
                    activeUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedStaff(user);
                          setStaffDetailOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            {user.photoUrl ? (
                              <img
                                src={user.photoUrl}
                                alt={user.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </span>
                              </div>
                            )}
                            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                              isUserOnline(user.name) ? 'bg-green-500' : 'bg-gray-500'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{user.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {user.role === 'admin' && <Shield className="h-3 w-3 text-purple-400" />}
                              {user.role === 'kitchen' && <ChefHat className="h-3 w-3 text-orange-400" />}
                              {user.role === 'floor' && <Footprints className="h-3 w-3 text-blue-400" />}
                              <span className="text-xs text-muted-foreground">{getRoleLabel(user.role || 'floor')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>

        {/* Staff Detail Modal */}
        <StaffDetailModal
          open={staffDetailOpen}
          onOpenChange={setStaffDetailOpen}
          user={selectedStaff}
          isOnline={selectedStaff ? isUserOnline(selectedStaff.name) : false}
        />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10 overflow-hidden max-h-[85vh]" hideCloseButton>
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-violet-500/10 to-transparent" />
          <div className="relative px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 rounded-xl">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t('staff.management')}</h2>
                  <p className="text-xs text-muted-foreground">{activeUsers.length} {t('staff.approvedMembers')}</p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(85vh-100px)]">
            <div className="p-6 pt-2 space-y-6">
              {/* Pending Requests Section */}
              {pendingRequests.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-amber-500/20 rounded-lg">
                      <Clock className="h-4 w-4 text-amber-400" />
                    </div>
                    <h3 className="text-sm font-medium">{t('staff.pendingRequests')}</h3>
                  </div>
                  <div className="space-y-2">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5"
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-amber-400">
                              {request.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          
                          {/* Info & Actions */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{request.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{request.email}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t('staff.requested')} {(() => {
                                const date = request.requestedAt;
                                if (!date) return t('staff.recently');
                                // Handle Firestore Timestamp objects
                                const d = typeof (date as any)?.toDate === 'function'
                                  ? (date as any).toDate()
                                  : new Date(date);
                                return isNaN(d.getTime()) ? t('staff.recently') : d.toLocaleDateString();
                              })()}
                            </p>
                            
                            {/* Role & Restaurant Row */}
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-white/5">
                              {/* Role Selection */}
                              <Select
                                value={selectedRoles[request.id] || 'floor'}
                                onValueChange={(role: WorkerRole) => {
                                  setSelectedRoles(prev => ({ ...prev, [request.id]: role }));
                                }}
                                disabled={processingRequest === request.id}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 flex-shrink-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                      <Shield className="h-4 w-4 flex-shrink-0 text-purple-400" />
                                      {t('staff.roleAdmin')}
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="kitchen">
                                    <div className="flex items-center gap-2">
                                      <ChefHat className="h-4 w-4 flex-shrink-0 text-orange-400" style={{ minWidth: '16px', minHeight: '16px' }} />
                                      {t('staff.roleKitchen')}
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="floor">
                                    <div className="flex items-center gap-2">
                                      <Footprints className="h-4 w-4 flex-shrink-0 text-blue-400" />
                                      {t('staff.roleFloor')}
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>

                              {/* Restaurant Assignment (for non-admin roles) */}
                              {(selectedRoles[request.id] || 'floor') !== 'admin' && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 flex-1 justify-between text-xs bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10"
                                      disabled={processingRequest === request.id}
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                                        <span className="truncate">
                                          {(selectedRestaurantsForRequest[request.id] || []).length === 0
                                            ? t('staff.selectRestaurants') || 'Select restaurants'
                                            : `${(selectedRestaurantsForRequest[request.id] || []).length} ${t('staff.restaurants')}`
                                          }
                                        </span>
                                      </div>
                                      <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground ml-1" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="p-2" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                                        {t('staff.assignToRestaurants')}
                                      </p>
                                      {allRestaurants.map((restaurant) => {
                                        const currentSelections = selectedRestaurantsForRequest[request.id] || [];
                                        const isSelected = currentSelections.includes(restaurant.id);
                                        return (
                                          <div
                                            key={restaurant.id}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                                            onClick={() => {
                                              const newSelections = isSelected
                                                ? currentSelections.filter(id => id !== restaurant.id)
                                                : [...currentSelections, restaurant.id];
                                              setSelectedRestaurantsForRequest(prev => ({
                                                ...prev,
                                                [request.id]: newSelections
                                              }));
                                            }}
                                          >
                                            <Checkbox
                                              checked={isSelected}
                                              className="h-4 w-4"
                                            />
                                            <span className="text-sm truncate">{restaurant.name}</span>
                                          </div>
                                        );
                                      })}
                                      {allRestaurants.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-2">
                                          {t('staff.noRestaurantsAvailable')}
                                        </p>
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>

                            {/* Approve/Reject buttons */}
                            <div className="flex gap-2 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 h-8 bg-green-500/10 hover:bg-green-500/20 text-green-400"
                                onClick={() => handleApproveRequest(request)}
                                disabled={processingRequest === request.id}
                              >
                                {processingRequest === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    {t('staff.approve')}
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1 h-8 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                onClick={() => handleRejectRequest(request)}
                                disabled={processingRequest === request.id}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                {t('staff.decline')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Users Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-green-500/20 rounded-lg">
                    <UserCheck className="h-4 w-4 text-green-400" />
                  </div>
                  <h3 className="text-sm font-medium">{t('staff.approvedStaff')}</h3>
                </div>
                <div className="space-y-2">
                  {activeUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">{t('staff.noApprovedStaff')}</p>
                    </div>
                  ) : (
                    activeUsers.map((user) => {
                      const allRestaurantIds = new Set(allRestaurants.map(r => r.id));
                      const assignedRestaurants = (user.assignedRestaurants || []).filter(id => allRestaurantIds.has(id));

                      return (
                        <div
                          key={user.id}
                          className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors"
                        >
                          {/* Clickable user info */}
                          <div
                            className="flex items-center gap-3 min-w-0 cursor-pointer"
                            onClick={() => {
                              setSelectedStaff(user);
                              setStaffDetailOpen(true);
                            }}
                          >
                            <div className="relative flex-shrink-0">
                              {user.photoUrl ? (
                                <img
                                  src={user.photoUrl}
                                  alt={user.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                                  <span className="text-sm font-medium">
                                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </span>
                                </div>
                              )}
                              <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                                isUserOnline(user.name) ? 'bg-green-500' : 'bg-gray-500'
                              }`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>

                          {/* Role and Restaurant Assignment Row */}
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-white/5">
                            {/* Role Select */}
                            <Select
                              value={user.role || 'floor'}
                              onValueChange={(role: WorkerRole) => {
                                if (role !== user.role) {
                                  setRoleChangeConfirm({
                                    user,
                                    newRole: role,
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="w-[130px] h-8 text-xs bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 flex-shrink-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 flex-shrink-0 text-purple-400" />
                                    {t('staff.roleAdmin')}
                                  </div>
                                </SelectItem>
                                <SelectItem value="kitchen">
                                  <div className="flex items-center gap-2">
                                    <ChefHat className="h-4 w-4 flex-shrink-0 text-orange-400" style={{ minWidth: '16px', minHeight: '16px' }} />
                                    {t('staff.roleKitchen')}
                                  </div>
                                </SelectItem>
                                <SelectItem value="floor">
                                  <div className="flex items-center gap-2">
                                    <Footprints className="h-4 w-4 flex-shrink-0 text-blue-400" />
                                    {t('staff.roleFloor')}
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Restaurant Assignment (only for non-admin roles) */}
                            {user.role !== 'admin' && (
                              <Popover
                                open={restaurantAssignOpen === user.id}
                                onOpenChange={(open) => setRestaurantAssignOpen(open ? user.id : null)}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 flex-1 justify-between text-xs bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10"
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                                      <span className="truncate">
                                        {assignedRestaurants.length === 0
                                          ? t('staff.allRestaurants')
                                          : `${assignedRestaurants.length} ${t('staff.restaurants')}`
                                        }
                                      </span>
                                    </div>
                                    <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground ml-1" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-2" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                                      {t('staff.assignToRestaurants')}
                                    </p>
                                    {allRestaurants.map((restaurant) => {
                                      const isAssigned = assignedRestaurants.includes(restaurant.id);
                                      return (
                                        <div
                                          key={restaurant.id}
                                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                                          onClick={() => {
                                            const newAssignments = isAssigned
                                              ? assignedRestaurants.filter(id => id !== restaurant.id)
                                              : [...assignedRestaurants, restaurant.id];

                                            updateAssignmentMutation.mutate({
                                              userId: user.id,
                                              restaurantIds: newAssignments
                                            });
                                          }}
                                        >
                                          <Checkbox
                                            checked={isAssigned}
                                            className="h-4 w-4"
                                          />
                                          <span className="text-sm truncate">{restaurant.name}</span>
                                        </div>
                                      );
                                    })}
                                    {allRestaurants.length === 0 && (
                                      <p className="text-xs text-muted-foreground text-center py-2">
                                        {t('staff.noRestaurantsAvailable')}
                                      </p>
                                    )}
                                    <div className="border-t border-gray-200 dark:border-white/5 mt-2 pt-2">
                                      <p className="text-[10px] text-muted-foreground px-2">
                                        {assignedRestaurants.length === 0
                                          ? t('staff.accessToAll')
                                          : t('staff.onlySelected')
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}

                            {/* Remove User */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 flex-shrink-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => setDeleteUserConfirm(user)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
      
      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={!!roleChangeConfirm} onOpenChange={(open) => !open && setRoleChangeConfirm(null)}>
        <AlertDialogContent className="bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('staff.confirmRoleChange')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('staff.confirmRoleChangeDesc')} {roleChangeConfirm?.user.name} {t('staff.roleFrom')}{' '}
              <span className="font-medium text-foreground">{getRoleLabel(roleChangeConfirm?.user.role || 'floor')}</span> {t('staff.roleTo')}{' '}
              <span className="font-medium text-foreground">{getRoleLabel(roleChangeConfirm?.newRole || 'floor')}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-white/10">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRoleChange}
              className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-0"
            >
              {t('staff.confirmChange')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!deleteUserConfirm} onOpenChange={(open) => !open && setDeleteUserConfirm(null)}>
        <AlertDialogContent className="bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('staff.removeStaffMember')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('staff.confirmRemoveDesc')} <span className="font-medium text-foreground">{deleteUserConfirm?.name}</span> ({deleteUserConfirm?.email}) {t('staff.confirmRemoveDesc2')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-white/10">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserConfirm && handleDeleteUser(deleteUserConfirm)}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0"
            >
              {t('staff.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Staff Detail Modal */}
      <StaffDetailModal
        open={staffDetailOpen}
        onOpenChange={setStaffDetailOpen}
        user={selectedStaff}
        isOnline={selectedStaff ? isUserOnline(selectedStaff.name) : false}
      />
    </Dialog>
  );
}
