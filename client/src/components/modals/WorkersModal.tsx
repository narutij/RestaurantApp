import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { accountRequestService, userService, type AppUser, type AccountRequest } from "@/lib/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
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
  Footprints
} from 'lucide-react';

// Mock workers for UI/UX demonstration
const MOCK_WORKERS: AppUser[] = [
  {
    id: 'mock-1',
    name: 'Jonas Kazlauskas',
    email: 'jonas@example.com',
    role: 'floor',
    status: 'active',
    isOnline: true,
  },
  {
    id: 'mock-2',
    name: 'Eglė Petrauskienė',
    email: 'egle@example.com',
    role: 'floor',
    status: 'active',
    isOnline: true,
  },
  {
    id: 'mock-3',
    name: 'Tomas Jonaitis',
    email: 'tomas@example.com',
    role: 'kitchen',
    status: 'active',
    isOnline: false,
  },
];

// Mock pending account requests for UI/UX demonstration
const MOCK_PENDING_REQUESTS: AccountRequest[] = [
  {
    id: 'mock-request-1',
    email: 'laura.vilkaite@example.com',
    name: 'Laura Vilkaitė',
    password: 'mock-password',
    status: 'pending',
    role: 'user',
    requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'mock-request-2',
    email: 'marius.sakalauskas@example.com',
    name: 'Marius Sakalauskas',
    password: 'mock-password',
    status: 'pending',
    role: 'user',
    requestedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
];

type WorkerRole = 'admin' | 'kitchen' | 'floor';

interface WorkersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkersModal({ open, onOpenChange }: WorkersModalProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [activeUsers, setActiveUsers] = useState<AppUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccountRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, WorkerRole>>({});
  
  // Role change confirmation state
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    user: AppUser;
    newRole: WorkerRole;
    isMock: boolean;
  } | null>(null);

  useEffect(() => {
    if (open && isAdmin) {
      loadData();
    }
  }, [open, isAdmin]);

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

      setActiveUsers([...realUsers, ...MOCK_WORKERS]);
      setPendingRequests([...realRequests, ...MOCK_PENDING_REQUESTS]);
    } catch (error) {
      console.error('Error loading workers data:', error);
      setActiveUsers([...MOCK_WORKERS]);
      setPendingRequests([...MOCK_PENDING_REQUESTS]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (request: AccountRequest) => {
    const role = selectedRoles[request.id] || 'floor';
    try {
      setProcessingRequest(request.id);
      
      // Check if it's a mock request
      const isMockRequest = request.id.startsWith('mock-');
      
      if (isMockRequest) {
        // Handle mock request locally
        const newUser: AppUser = {
          id: `approved-${request.id}`,
          name: request.name,
          email: request.email,
          role: role,
          status: 'active',
          isOnline: false,
        };
        setActiveUsers(prev => [...prev, newUser]);
        setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      } else {
        // Handle real request with Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, request.email, request.password);
        await userService.add({
          uid: userCredential.user.uid,
          email: request.email,
          name: request.name,
          role: role,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          approvedAt: new Date()
        });
        await accountRequestService.update(request.id, {
          status: 'approved',
          role: role,
          approvedAt: new Date()
        });
        await loadData();
      }
      
      toast({
        title: "Request Approved",
        description: `${request.name} has been approved as ${getRoleLabel(role)}`,
      });
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve the request",
        variant: "destructive"
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (request: AccountRequest) => {
    try {
      setProcessingRequest(request.id);
      
      // Check if it's a mock request
      const isMockRequest = request.id.startsWith('mock-');
      
      if (isMockRequest) {
        // Handle mock request locally - just remove from pending
        setPendingRequests(prev => prev.filter(r => r.id !== request.id));
      } else {
        // Handle real request with Firebase
        await accountRequestService.update(request.id, {
          status: 'rejected',
          rejectedAt: new Date(),
          rejectionReason: 'Rejected by admin'
        });
        await loadData();
      }
      
      toast({
        title: "Request Declined",
        description: `${request.name}'s request has been declined`,
      });
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Decline Failed",
        description: error.message || "Failed to decline the request",
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
        title: "Role Updated",
        description: `User role has been updated to ${getRoleLabel(newRole)}`,
      });
      await loadData();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'kitchen': return 'Kitchen';
      case 'floor': return 'Floor';
      default: return 'Floor';
    }
  };

  const handleConfirmRoleChange = () => {
    if (!roleChangeConfirm) return;
    
    const { user, newRole, isMock } = roleChangeConfirm;
    
    if (isMock) {
      // Update mock user role locally
      setActiveUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, role: newRole } : u
      ));
      toast({
        title: "Role Updated",
        description: `${user.name}'s role has been changed to ${getRoleLabel(newRole)}`,
      });
    } else {
      handleUpdateUserRole(user.id, newRole);
    }
    
    setRoleChangeConfirm(null);
  };


  if (!isAdmin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px] p-0 bg-[#1E2429] border-white/10 overflow-hidden" hideCloseButton>
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <UserX className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-sm text-muted-foreground">You need admin privileges to access worker management.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 bg-[#1E2429] border-white/10 overflow-hidden max-h-[85vh]" hideCloseButton>
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
                  <h2 className="text-lg font-semibold">Staff Management</h2>
                  <p className="text-xs text-muted-foreground">{activeUsers.length} Approved member{activeUsers.length !== 1 ? 's' : ''}</p>
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
                    <h3 className="text-sm font-medium">Pending Requests</h3>
                  </div>
                  <div className="space-y-2">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 bg-[#181818] rounded-xl border border-white/5"
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
                              {new Date(request.requestedAt).toLocaleDateString()}
                            </p>
                            
                            {/* Actions - Stacked Layout */}
                            <div className="mt-3 space-y-2">
                              {/* Approve/Reject buttons */}
                              <div className="flex gap-2">
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
                                      Approve
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
                                  Decline
                                </Button>
                              </div>
                              
                              {/* Role Selection */}
                              <Select
                                value={selectedRoles[request.id] || 'floor'}
                                onValueChange={(role: WorkerRole) => {
                                  setSelectedRoles(prev => ({ ...prev, [request.id]: role }));
                                }}
                                disabled={processingRequest === request.id}
                              >
                                <SelectTrigger className="w-full h-8 text-xs bg-white/5 border-white/10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">
                                    <div className="flex items-center gap-2">
                                      <Shield className="h-4 w-4 flex-shrink-0 text-purple-400" />
                                      Admin
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="kitchen">
                                    <div className="flex items-center gap-2">
                                      <ChefHat className="h-4 w-4 flex-shrink-0 text-orange-400" style={{ minWidth: '16px', minHeight: '16px' }} />
                                      Kitchen
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="floor">
                                    <div className="flex items-center gap-2">
                                      <Footprints className="h-4 w-4 flex-shrink-0 text-blue-400" />
                                      Floor
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
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
                  <h3 className="text-sm font-medium">Approved Staff</h3>
                </div>
                <div className="space-y-2">
                  {activeUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No approved staff found</p>
                    </div>
                  ) : (
                    activeUsers.map((user) => {
                      const isMockUser = user.id.startsWith('mock-') || user.id.startsWith('approved-');
                      
                      return (
                        <div
                          key={user.id}
                          className="p-4 bg-[#181818] rounded-xl border border-white/5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                                  <span className="text-sm font-medium">
                                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </span>
                                </div>
                                <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#181818] ${
                                  user.isOnline ? 'bg-green-500' : 'bg-gray-500'
                                }`} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{user.name}</p>
                              </div>
                            </div>
                            <Select
                              value={user.role || 'floor'}
                              onValueChange={(role: WorkerRole) => {
                                if (role !== user.role) {
                                  setRoleChangeConfirm({
                                    user,
                                    newRole: role,
                                    isMock: isMockUser
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="w-[100px] h-8 text-xs bg-white/5 border-white/10 flex-shrink-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 flex-shrink-0 text-purple-400" />
                                    Admin
                                  </div>
                                </SelectItem>
                                <SelectItem value="kitchen">
                                  <div className="flex items-center gap-2">
                                    <ChefHat className="h-4 w-4 flex-shrink-0 text-orange-400" style={{ minWidth: '16px', minHeight: '16px' }} />
                                    Kitchen
                                  </div>
                                </SelectItem>
                                <SelectItem value="floor">
                                  <div className="flex items-center gap-2">
                                    <Footprints className="h-4 w-4 flex-shrink-0 text-blue-400" />
                                    Floor
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
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
        <AlertDialogContent className="bg-[#1E2429] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change {roleChangeConfirm?.user.name}'s role from{' '}
              <span className="font-medium text-foreground">{getRoleLabel(roleChangeConfirm?.user.role || 'floor')}</span> to{' '}
              <span className="font-medium text-foreground">{getRoleLabel(roleChangeConfirm?.newRole || 'floor')}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRoleChange}
              className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-0"
            >
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
