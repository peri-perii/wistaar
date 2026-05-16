// AdminManagement with Real-Time Supabase Subscriptions
import { useState, useEffect } from 'react'
import { Trash2, UserPlus, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Admin {
  id: string
  user_id: string
  email: string
  display_name?: string
  role: string
  can_approve_reject: boolean
  can_manage_coupons: boolean
  can_manage_admins: boolean
  can_manage_users: boolean
  created_at: string
}

const OWNER_EMAIL = 'priyamj1502@gmail.com'

export function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [adminToRemove, setAdminToRemove] = useState<Admin | null>(null)
  const [permissions, setPermissions] = useState({
    can_approve_reject: false,
    can_manage_coupons: false,
    can_manage_admins: false,
  })
  const { toast } = useToast()

  // Load admins and subscribe to real-time changes
  useEffect(() => {
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    try {
      setLoading(true)

      // First fetch: get all admins with their user data
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          can_approve_reject,
          can_manage_coupons,
          can_manage_admins,
          can_manage_users,
          created_at,
          user_profiles!inner(id, email, display_name)
        `)
        .eq('role', 'admin')

      if (rolesError) throw rolesError

      // Transform data
      const transformedAdmins = (adminRoles || []).map(ar => ({
        id: ar.id,
        user_id: ar.user_id,
        email: ar.user_profiles?.email || '',
        display_name: ar.user_profiles?.display_name,
        role: ar.role,
        can_approve_reject: ar.can_approve_reject,
        can_manage_coupons: ar.can_manage_coupons,
        can_manage_admins: ar.can_manage_admins,
        can_manage_users: ar.can_manage_users,
        created_at: ar.created_at,
      }))

      setAdmins(transformedAdmins)

      // Subscribe to real-time changes on user_roles
      const subscription = supabase
        .from('user_roles')
        .on('*', payload => {
          if (payload.eventType === 'INSERT' && payload.new.role === 'admin') {
            toast({
              title: 'New admin added',
              description: 'A new admin has been added to the system',
            })
            loadAdmins() // Reload to get user details
          } else if (payload.eventType === 'DELETE' && payload.old.role === 'admin') {
            setAdmins(prev => prev.filter(a => a.id !== payload.old.id))
            toast({
              title: 'Admin removed',
              description: 'An admin has been removed from the system',
              variant: 'destructive',
            })
          } else if (payload.eventType === 'UPDATE' && payload.new.role === 'admin') {
            setAdmins(prev =>
              prev.map(a =>
                a.id === payload.new.id
                  ? {
                      ...a,
                      can_approve_reject: payload.new.can_approve_reject,
                      can_manage_coupons: payload.new.can_manage_coupons,
                      can_manage_admins: payload.new.can_manage_admins,
                      can_manage_users: payload.new.can_manage_users,
                    }
                  : a
              )
            )
            toast({
              title: 'Admin permissions updated',
              description: 'Admin permissions have been changed',
            })
          }
        })
        .subscribe()

      return () => {
        subscription?.unsubscribe()
      }
    } catch (error: any) {
      toast({
        title: 'Error loading admins',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      })
      return
    }

    try {
      setAddingAdmin(true)

      // First, find user by email
      const { data: users, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', newAdminEmail)
        .single()

      if (userError || !users) {
        toast({
          title: 'Error',
          description: 'User not found. They must create an account first.',
          variant: 'destructive',
        })
        return
      }

      // Check if already admin
      const { data: existingAdmin } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', users.id)
        .eq('role', 'admin')
        .single()

      if (existingAdmin) {
        toast({
          title: 'Error',
          description: 'This user is already an admin',
          variant: 'destructive',
        })
        return
      }

      // Add admin role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: users.id,
          role: 'admin',
          can_approve_reject: permissions.can_approve_reject,
          can_manage_coupons: permissions.can_manage_coupons,
          can_manage_admins: permissions.can_manage_admins,
        })

      if (insertError) throw insertError

      toast({
        title: 'Success',
        description: `${newAdminEmail} is now an admin`,
      })

      setNewAdminEmail('')
      setPermissions({
        can_approve_reject: false,
        can_manage_coupons: false,
        can_manage_admins: false,
      })

      // Reload admins (subscription will update)
      loadAdmins()
    } catch (error: any) {
      toast({
        title: 'Error adding admin',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setAddingAdmin(false)
    }
  }

  const handleUpdatePermissions = async (admin: Admin, permission: string, value: boolean) => {
    try {
      const updates: any = {}
      updates[permission] = value

      const { error } = await supabase
        .from('user_roles')
        .update(updates)
        .eq('id', admin.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Admin permissions updated',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleRemoveAdmin = async (admin: Admin) => {
    if (admin.email === OWNER_EMAIL) {
      toast({
        title: 'Error',
        description: 'Cannot remove the owner/super admin',
        variant: 'destructive',
      })
      return
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', admin.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `${admin.email} is no longer an admin`,
      })

      setAdminToRemove(null)
    } catch (error: any) {
      toast({
        title: 'Error removing admin',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Admin Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Add New Admin
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              disabled={addingAdmin}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Permissions</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={permissions.can_approve_reject}
                  onChange={e =>
                    setPermissions(p => ({ ...p, can_approve_reject: e.target.checked }))
                  }
                  disabled={addingAdmin}
                  className="rounded"
                />
                <span className="text-sm">Can Approve/Reject Books</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={permissions.can_manage_coupons}
                  onChange={e =>
                    setPermissions(p => ({ ...p, can_manage_coupons: e.target.checked }))
                  }
                  disabled={addingAdmin}
                  className="rounded"
                />
                <span className="text-sm">Can Manage Coupons</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={permissions.can_manage_admins}
                  onChange={e =>
                    setPermissions(p => ({ ...p, can_manage_admins: e.target.checked }))
                  }
                  disabled={addingAdmin}
                  className="rounded"
                />
                <span className="text-sm">Can Manage Admins</span>
              </label>
            </div>
          </div>

          <Button onClick={handleAddAdmin} disabled={addingAdmin} className="w-full">
            {addingAdmin ? 'Adding...' : 'Add Admin'}
          </Button>
        </div>
      </div>

      {/* Admins List */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Current Admins ({admins.length})
        </h2>

        {loading ? (
          <div className="text-center py-8">Loading admins...</div>
        ) : admins.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No admins yet</div>
        ) : (
          <div className="space-y-4">
            {admins.map(admin => (
              <div
                key={admin.id}
                className="border rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{admin.email}</h3>
                      {admin.email === OWNER_EMAIL && (
                        <span className="text-lg" title="Owner/Super Admin">
                          👑
                        </span>
                      )}
                    </div>
                    {admin.display_name && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {admin.display_name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Added {new Date(admin.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {admin.email !== OWNER_EMAIL && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAdminToRemove(admin)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Permissions */}
                <div className="bg-white dark:bg-slate-700 rounded p-3 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={admin.can_approve_reject}
                      onChange={e =>
                        handleUpdatePermissions(
                          admin,
                          'can_approve_reject',
                          e.target.checked
                        )
                      }
                      disabled={admin.email === OWNER_EMAIL}
                      className="rounded"
                    />
                    <span className="text-sm">Approve/Reject Books</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={admin.can_manage_coupons}
                      onChange={e =>
                        handleUpdatePermissions(
                          admin,
                          'can_manage_coupons',
                          e.target.checked
                        )
                      }
                      disabled={admin.email === OWNER_EMAIL}
                      className="rounded"
                    />
                    <span className="text-sm">Manage Coupons</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={admin.can_manage_admins}
                      onChange={e =>
                        handleUpdatePermissions(
                          admin,
                          'can_manage_admins',
                          e.target.checked
                        )
                      }
                      disabled={admin.email === OWNER_EMAIL}
                      className="rounded"
                    />
                    <span className="text-sm">Manage Admins</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remove Admin Dialog */}
      <AlertDialog open={!!adminToRemove} onOpenChange={() => setAdminToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Remove Admin</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove {adminToRemove?.email} as an admin? They will lose all admin privileges.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => adminToRemove && handleRemoveAdmin(adminToRemove)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Real-time Updates:</strong> When an admin is added or removed anywhere in the system, this list updates instantly!
        </p>
      </div>
    </div>
  )
}
