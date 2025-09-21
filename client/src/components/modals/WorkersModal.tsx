import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { accountRequestService, userService, type AppUser, type AccountRequest } from "@/lib/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserCheck, UserPlus, UserX, Clock, Shield, User, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    if (open && isAdmin) {
      loadData();
    }
  }, [open, isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [users, requests] = await Promise.all([
        userService.getAll(),
        accountRequestService.getPending()
      ]);
      setActiveUsers(users);
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error loading workers data:', error);
      toast({
        title: "Error",
        description: "Failed to load workers data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (request: AccountRequest, role: 'admin' | 'user') => {
    try {
      setProcessingRequest(request.id);

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, request.email, request.password);

      // Create user record in Firestore
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

      // Update the account request as approved
      await accountRequestService.update(request.id, {
        status: 'approved',
        role: role,
        approvedAt: new Date()
      });

      toast({
        title: "Request Approved",
        description: `${request.name} has been approved as ${role}`,
      });

      // Reload data
      await loadData();
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

      await accountRequestService.update(request.id, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: 'Rejected by admin'
      });

      toast({
        title: "Request Rejected",
        description: `${request.name}'s request has been rejected`,
      });

      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject the request",
        variant: "destructive"
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await userService.update(userId, { role: newRole });

      toast({
        title: "Role Updated",
        description: `User role has been updated to ${newRole}`,
      });

      // Reload data
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

  if (!isAdmin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Access Denied</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <UserX className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <p className="text-muted-foreground">You need admin privileges to access worker management.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Workers Management
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Account Requests ({pendingRequests.length})
                  </CardTitle>
                  <CardDescription>
                    New users requesting access to the system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{request.name}</h4>
                          <p className="text-sm text-muted-foreground">{request.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Requested: {new Date(request.requestedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            onValueChange={(role: 'admin' | 'user') => {
                              handleApproveRequest(request, role);
                            }}
                            disabled={processingRequest === request.id}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Approve as..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  User
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Admin
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectRequest(request)}
                            disabled={processingRequest === request.id}
                          >
                            {processingRequest === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Active Users Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Active Users ({activeUsers.length})
                </CardTitle>
                <CardDescription>
                  Current users with access to the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No active users found
                  </p>
                ) : (
                  activeUsers.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{user.name}</h4>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role === 'admin' ? (
                                <Shield className="h-3 w-3 mr-1" />
                              ) : (
                                <User className="h-3 w-3 mr-1" />
                              )}
                              {user.role}
                            </Badge>
                            <Badge variant="outline">
                              {user.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(role: 'admin' | 'user') => {
                              handleUpdateUserRole(user.id, role);
                            }}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  User
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Admin
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {pendingRequests.length === 0 && (
              <div className="text-center py-4">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No pending account requests</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}