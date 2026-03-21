import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserPlus, Trash2, Shield, ShieldCheck, Mail } from 'lucide-react';

interface AdminRecord {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  can_approve_reject: boolean;
  can_manage_coupons: boolean;
  can_manage_admins: boolean;
  is_super_admin: boolean;
  createdAt: string;
  bookCount?: number;
}

export default function AdminManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [permissions, setPermissions] = useState({
    can_approve_reject: true,
    can_manage_coupons: false,
    can_manage_admins: false,
  });

  useEffect(() => {
    loadAdmins();
  }, [user]);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getAdmins();
      if (response.success && response.data) {
        setAdmins(response.data);
      } else {
        toast({
          title: 'Failed to load admins',
          description: response.error || 'Could not fetch admin list',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('Load admins error:', err);
      toast({
        title: 'Error loading admins',
        description: err.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newEmail.trim() || !user) return;
    setAdding(true);
    try {
      const response = await apiClient.addAdmin(newEmail.trim().toLowerCase(), permissions);

      if (response.success) {
        toast({
          title: 'Admin added!',
          description: `${newEmail} now has admin access.`,
        });
        setNewEmail('');
        setPermissions({ can_approve_reject: true, can_manage_coupons: false, can_manage_admins: false });
        await loadAdmins();
      } else {
        toast({
          title: 'Failed to add admin',
          description: response.error || 'Could not add admin',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Failed to add admin',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleUpdatePermissions = async (adminId: number, field: string, value: boolean) => {
    try {
      const response = await apiClient.updateAdminPermissions(String(adminId), {
        [field]: value,
      } as any);

      if (response.success) {
        setAdmins(prev =>
          prev.map(a =>
            a.id === adminId ? { ...a, [field]: value } : a
          )
        );
        toast({ title: 'Permissions updated', description: 'Admin permissions have been updated.' });
      } else {
        toast({
          title: 'Update failed',
          description: response.error || 'Could not update permissions',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveAdmin = async (admin: AdminRecord) => {
    try {
      const response = await apiClient.removeAdmin(String(admin.id));

      if (response.success) {
        toast({
          title: 'Admin removed',
          description: `${admin.email} no longer has admin access.`,
        });
        await loadAdmins();
      } else {
        toast({
          title: 'Remove failed',
          description: response.error || 'Could not remove admin',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Remove failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The user must already have an account on Wistaar before you can grant them admin access.
          </p>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="admin@example.com"
              type="email"
              onKeyDown={e => e.key === 'Enter' && handleAddAdmin()}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Permissions for this admin</Label>
            <div className="flex flex-col gap-3">
              {[
                { key: 'can_approve_reject', label: 'Can approve / reject book submissions' },
                { key: 'can_manage_coupons', label: 'Can create and manage coupon codes' },
                { key: 'can_manage_admins', label: 'Can add and remove other admins' },
              ].map(p => (
                <div key={p.key} className="flex items-center gap-3">
                  <Switch
                    checked={permissions[p.key as keyof typeof permissions]}
                    onCheckedChange={v => setPermissions(prev => ({ ...prev, [p.key]: v }))}
                  />
                  <span className="text-sm text-muted-foreground">{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleAddAdmin} disabled={!newEmail.trim() || adding} className="gap-2">
            <UserPlus className="w-4 h-4" />
            {adding ? 'Adding...' : 'Grant Admin Access'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-serif text-lg text-foreground">Current Admins</h3>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : admins.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No admins configured yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add your first admin above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Display Super Admin (Owner) Separately */}
            {admins.filter(a => a.is_super_admin).map(admin => (
              <Card key={admin.id} className="border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900/30">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-foreground">
                            {admin.email}
                          </p>
                          <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800">
                            👑 Owner / Super Admin
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Owner account - Full access to all admin features
                        </p>
                        <div className="mt-3 text-xs text-muted-foreground">
                          <p className="font-medium text-foreground mb-2">Permissions:</p>
                          <div className="space-y-1 pl-2">
                            <p>✓ Approve & reject book submissions</p>
                            <p>✓ Create & manage coupon codes</p>
                            <p>✓ Add & remove other admins</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Display Other Admins */}
            {admins.filter(a => !a.is_super_admin).map(admin => (
              <Card key={admin.id} className="hover:border-accent/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{admin.email}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(admin.createdAt).toLocaleDateString()} • {admin.bookCount || 0} books approved
                        </p>
                      </div>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1 h-7 text-xs shrink-0">
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove admin access?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will revoke all admin privileges for <strong>{admin.email}</strong>. They will lose access to the admin dashboard and their admin role.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveAdmin(admin)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove Admin Access
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Permissions Section */}
                  <div className="mt-4 flex flex-col gap-3 pl-12 border-t pt-4">
                    <p className="text-xs font-medium text-foreground">Permissions</p>
                    {[
                      { key: 'can_approve_reject', label: 'Approve / reject book submissions' },
                      { key: 'can_manage_coupons', label: 'Manage coupon codes' },
                      { key: 'can_manage_admins', label: 'Manage other admins' },
                    ].map(p => (
                      <div key={p.key} className="flex items-center gap-3">
                        <Switch
                          checked={admin[p.key as keyof AdminRecord] as boolean}
                          onCheckedChange={v => handleUpdatePermissions(admin.id, p.key, v)}
                        />
                        <span className="text-sm text-muted-foreground">{p.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
