// AdminManagement with Real-Time Supabase Subscriptions
import { useState, useEffect } from 'react'
import { Trash2, UserPlus, Shield, Crown } from 'lucide-react'
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
  is_super_admin: boolean
  can_approve_reject: boolean
  can_manage_coupons: boolean
  can_manage_admins: boolean
  can_manage_users: boolean
  created_at: string
}

function PermissionToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div
        role="checkbox"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors duration-200 flex-shrink-0
          ${checked ? 'bg-foreground' : 'bg-border'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-background transition-transform duration-200
            ${checked ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </div>
      <span className="text-sm font-sans text-muted-foreground">{label}</span>
    </label>
  )
}

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

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadAdmins()
  }, [])

  // ── Realtime subscription (set up once, not inside loadAdmins) ────────────
  useEffect(() => {
    const channel = supabase
      .channel('admin-roles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        loadAdmins()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_permissions' }, () => {
        loadAdmins()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAdmins = async () => {
    try {
      setLoading(true)
      const { data: adminRoles, error: rolesError } = await supabase
        .rpc('get_admins_with_emails')
      if (rolesError) throw rolesError

      const transformedAdmins = (adminRoles || []).map((ar: any) => ({
        id: ar.id,
        user_id: ar.user_id,
        email: ar.email || '',
        display_name: ar.display_name,
        role: 'admin',
        is_super_admin: !!ar.is_super_admin,
        can_approve_reject: ar.can_approve_reject,
        can_manage_coupons: ar.can_manage_coupons,
        can_manage_admins: ar.can_manage_admins,
        can_manage_users: false,
        created_at: ar.created_at,
      }))

      setAdmins(transformedAdmins)
    } catch (error: any) {
      toast({ title: 'Error loading admins', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' })
      return
    }
    try {
      setAddingAdmin(true)
      const { error: insertError } = await supabase.rpc('add_admin_by_email', {
        target_email: newAdminEmail.trim(),
        p_can_approve_reject: permissions.can_approve_reject,
        p_can_manage_coupons: permissions.can_manage_coupons,
        p_can_manage_admins: permissions.can_manage_admins,
      })
      if (insertError) throw insertError
      toast({ title: 'Admin added', description: `${newAdminEmail} is now an admin` })
      setNewAdminEmail('')
      setPermissions({ can_approve_reject: false, can_manage_coupons: false, can_manage_admins: false })
      loadAdmins()
    } catch (error: any) {
      toast({ title: 'Error adding admin', description: error.message, variant: 'destructive' })
    } finally {
      setAddingAdmin(false)
    }
  }

  const handleUpdatePermissions = async (admin: Admin, permission: string, value: boolean) => {
    try {
      const updates: any = {}
      updates[permission] = value
      const { error } = await supabase
        .from('admin_permissions')
        .update(updates)
        .eq('id', admin.id)
      if (error) throw error
      toast({ title: 'Permissions updated' })
      loadAdmins()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const handleRemoveAdmin = async (admin: Admin) => {
    if (admin.is_super_admin) {
      toast({ title: 'Error', description: 'Cannot remove the owner/super admin', variant: 'destructive' })
      return
    }
    try {
      const { error: rolesError } = await supabase
        .from('user_roles').delete().eq('user_id', admin.user_id).eq('role', 'admin')
      if (rolesError) throw rolesError
      const { error: permError } = await supabase
        .from('admin_permissions').delete().eq('id', admin.id)
      if (permError) throw permError
      toast({ title: 'Admin removed', description: `${admin.email} is no longer an admin` })
      setAdminToRemove(null)
      loadAdmins()
    } catch (error: any) {
      toast({ title: 'Error removing admin', description: error.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-8">

      {/* ── Add New Admin ── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-1.5 rounded-lg bg-foreground/5">
            <UserPlus className="w-4 h-4 text-foreground/60" />
          </div>
          <h2 className="font-serif text-xl text-foreground">Add New Admin</h2>
        </div>

        <div className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-sans font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Email
            </label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              disabled={addingAdmin}
              className="h-10 font-sans"
            />
          </div>

          {/* Permissions */}
          <div>
            <p className="text-xs font-sans font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Permissions
            </p>
            <div className="space-y-3 p-4 rounded-lg bg-secondary/40 border border-border">
              <PermissionToggle
                label="Can Approve / Reject Books"
                checked={permissions.can_approve_reject}
                onChange={v => setPermissions(p => ({ ...p, can_approve_reject: v }))}
                disabled={addingAdmin}
              />
              <PermissionToggle
                label="Can Manage Coupons"
                checked={permissions.can_manage_coupons}
                onChange={v => setPermissions(p => ({ ...p, can_manage_coupons: v }))}
                disabled={addingAdmin}
              />
              <PermissionToggle
                label="Can Manage Admins"
                checked={permissions.can_manage_admins}
                onChange={v => setPermissions(p => ({ ...p, can_manage_admins: v }))}
                disabled={addingAdmin}
              />
            </div>
          </div>

          <Button
            onClick={handleAddAdmin}
            disabled={addingAdmin}
            className="w-full gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {addingAdmin ? 'Adding...' : 'Add Admin'}
          </Button>
        </div>
      </div>

      {/* ── Current Admins ── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-1.5 rounded-lg bg-foreground/5">
            <Shield className="w-4 h-4 text-foreground/60" />
          </div>
          <h2 className="font-serif text-xl text-foreground">
            Current Admins
            <span className="ml-2 text-sm font-sans font-normal text-muted-foreground">
              ({admins.length})
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm font-sans text-muted-foreground">
            Loading admins...
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-10 text-sm font-sans text-muted-foreground">
            No admins yet
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map((admin, i) => (
              <div key={admin.id}>
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-sans font-medium text-sm text-foreground">{admin.email}</p>
                        {admin.is_super_admin && (
                          <Crown className="w-3.5 h-3.5 text-accent" title="Owner / Super Admin" />
                        )}
                      </div>
                      {admin.display_name && (
                        <p className="text-xs font-sans text-muted-foreground">{admin.display_name}</p>
                      )}
                      <p className="text-xs font-sans text-muted-foreground/60 mt-0.5">
                        Added {new Date(admin.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {!admin.is_super_admin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAdminToRemove(admin)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Permissions toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
                    <PermissionToggle
                      label="Approve/Reject Books"
                      checked={admin.can_approve_reject}
                      onChange={v => handleUpdatePermissions(admin, 'can_approve_reject', v)}
                      disabled={admin.is_super_admin}
                    />
                    <PermissionToggle
                      label="Manage Coupons"
                      checked={admin.can_manage_coupons}
                      onChange={v => handleUpdatePermissions(admin, 'can_manage_coupons', v)}
                      disabled={admin.is_super_admin}
                    />
                    <PermissionToggle
                      label="Manage Admins"
                      checked={admin.can_manage_admins}
                      onChange={v => handleUpdatePermissions(admin, 'can_manage_admins', v)}
                      disabled={admin.is_super_admin}
                    />
                  </div>
                </div>
                {i < admins.length - 1 && <div className="h-px" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remove Admin Dialog */}
      <AlertDialog open={!!adminToRemove} onOpenChange={() => setAdminToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogTitle className="font-serif text-lg">Remove Admin</AlertDialogTitle>
          <AlertDialogDescription className="font-sans text-sm text-muted-foreground">
            Are you sure you want to remove <strong className="text-foreground">{adminToRemove?.email}</strong> as an admin? They will lose all admin privileges immediately.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end mt-2">
            <AlertDialogCancel className="font-sans">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => adminToRemove && handleRemoveAdmin(adminToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-sans"
            >
              Remove
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
