// Complete Real-Time Dashboard Example
// This shows how everything works together in one component

import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

interface Admin {
  id: string
  email: string
  role: string
  created_at: string
}

interface Comment {
  id: string
  content: string
  author_email: string
  created_at: string
}

interface BookApproval {
  id: string
  book_title: string
  status: 'pending' | 'approved' | 'rejected'
  approved_at?: string
}

interface Notification {
  id: string
  title: string
  message: string
  created_at: string
}

/**
 * Complete Real-Time Dashboard
 * 
 * This component demonstrates all real-time features:
 * 1. Live admin list updates
 * 2. Live book approvals
 * 3. Live recent comments
 * 4. Live notifications
 * 
 * Every change appears instantly across all clients!
 */
export function RealTimeDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()

  // Real-Time State
  const [admins, setAdmins] = useState<Admin[]>([])
  const [approvals, setApprovals] = useState<BookApproval[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Effect: Load all data and subscribe to real-time changes
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    loadAllData()
  }, [user?.id])

  const loadAllData = async () => {
    try {
      // 1. Load admins
      const { data: adminData } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at, user_profiles(email)')
        .eq('role', 'admin')

      const transformedAdmins = (adminData || []).map(a => ({
        id: a.id,
        email: a.user_profiles?.email || '',
        role: a.role,
        created_at: a.created_at,
      }))
      setAdmins(transformedAdmins)

      // 2. Load book approvals for this user
      const { data: approvalsData } = await supabase
        .from('book_approvals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      setApprovals(approvalsData as BookApproval[] || [])

      // 3. Load recent comments
      const { data: commentsData } = await supabase
        .from('comments_reviews')
        .select('id, content, created_at, user_profiles(email)')
        .order('created_at', { ascending: false })
        .limit(5)

      const transformedComments = (commentsData || []).map(c => ({
        id: c.id,
        content: c.content,
        author_email: c.user_profiles?.email || 'Anonymous',
        created_at: c.created_at,
      }))
      setComments(transformedComments)

      // 4. Load recent notifications for user
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setNotifications(notifData as Notification[] || [])

      setLoading(false)
    } catch (err: any) {
      toast({
        title: 'Error loading data',
        description: err.message,
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  // Effect: Subscribe to real-time admin changes
  useEffect(() => {
    const subscription = supabase
      .from('user_roles')
      .on('*', payload => {
        if (payload.eventType === 'INSERT' && payload.new.role === 'admin') {
          // New admin added
          const newAdmin: Admin = {
            id: payload.new.id,
            email: payload.new.email,
            role: 'admin',
            created_at: payload.new.created_at,
          }
          setAdmins(prev => [newAdmin, ...prev])
          toast({
            title: 'New admin',
            description: `${newAdmin.email} is now an admin`,
          })
        } else if (payload.eventType === 'DELETE' && payload.old.role === 'admin') {
          // Admin removed
          setAdmins(prev => prev.filter(a => a.id !== payload.old.id))
          toast({
            title: 'Admin removed',
            description: `${payload.old.email} is no longer an admin`,
            variant: 'destructive',
          })
        }
      })
      .subscribe()

    return () => subscription?.unsubscribe()
  }, [toast])

  // Effect: Subscribe to real-time approvals
  useEffect(() => {
    const subscription = supabase
      .from('book_approvals')
      .on('*', payload => {
        if (payload.eventType === 'UPDATE') {
          // Approval status changed
          setApprovals(prev =>
            prev.map(a =>
              a.id === payload.new.id
                ? {
                    ...a,
                    status: payload.new.status,
                    approved_at: payload.new.approved_at,
                  }
                : a
            )
          )
          toast({
            title: 'Book approval updated',
            description: `Book status changed to ${payload.new.status}`,
          })
        } else if (payload.eventType === 'INSERT') {
          // New approval needed
          setApprovals(prev => [payload.new as BookApproval, ...prev])
          toast({
            title: 'New book to approve',
            description: 'A new book submission is waiting for review',
          })
        }
      })
      .subscribe()

    return () => subscription?.unsubscribe()
  }, [toast])

  // Effect: Subscribe to real-time comments
  useEffect(() => {
    const subscription = supabase
      .from('comments_reviews')
      .on('INSERT', payload => {
        // New comment created
        const newComment: Comment = {
          id: payload.new.id,
          content: payload.new.content,
          author_email: payload.new.author_email,
          created_at: payload.new.created_at,
        }
        setComments(prev => [newComment, ...prev.slice(0, 4)]) // Keep only 5 most recent
        toast({
          title: 'New comment',
          description: `${newComment.author_email}: "${newComment.content.substring(0, 30)}..."`,
        })
      })
      .subscribe()

    return () => subscription?.unsubscribe()
  }, [toast])

  // Effect: Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) return

    const subscription = supabase
      .from('notifications')
      .on('INSERT', payload => {
        if (payload.new.user_id === user.id) {
          // New notification for this user
          const newNotif: Notification = {
            id: payload.new.id,
            title: payload.new.title,
            message: payload.new.message,
            created_at: payload.new.created_at,
          }
          setNotifications(prev => [newNotif, ...prev.slice(0, 4)]) // Keep only 5 most recent
          toast({
            title: newNotif.title,
            description: newNotif.message,
          })
        }
      })
      .subscribe()

    return () => subscription?.unsubscribe()
  }, [user?.id, toast])

  if (loading) {
    return <div className="p-8 text-center">Loading real-time dashboard...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* ===== ADMINS CARD ===== */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">👥 Admins ({admins.length})</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {admins.length === 0 ? (
            <p className="text-gray-500">No admins yet</p>
          ) : (
            admins.map(admin => (
              <div
                key={admin.id}
                className="bg-blue-50 dark:bg-blue-900 p-3 rounded border-l-4 border-blue-500"
              >
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  {admin.email}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Added {new Date(admin.created_at).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-800 rounded text-sm text-blue-900 dark:text-blue-100">
          ✨ Real-time: Add an admin in another window and see it appear instantly!
        </div>
      </div>

      {/* ===== BOOK APPROVALS CARD ===== */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">📚 Book Approvals ({approvals.length})</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {approvals.length === 0 ? (
            <p className="text-gray-500">No pending approvals</p>
          ) : (
            approvals.map(approval => (
              <div
                key={approval.id}
                className={`p-3 rounded border-l-4 ${
                  approval.status === 'approved'
                    ? 'bg-green-50 dark:bg-green-900 border-green-500'
                    : approval.status === 'rejected'
                      ? 'bg-red-50 dark:bg-red-900 border-red-500'
                      : 'bg-yellow-50 dark:bg-yellow-900 border-yellow-500'
                }`}
              >
                <div className="font-medium">
                  {approval.book_title}
                  <span
                    className={`ml-2 text-xs px-2 py-1 rounded ${
                      approval.status === 'approved'
                        ? 'bg-green-200 text-green-800'
                        : approval.status === 'rejected'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-yellow-200 text-yellow-800'
                    }`}
                  >
                    {approval.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-800 rounded text-sm text-green-900 dark:text-green-100">
          ✨ Real-time: Book status changes appear instantly!
        </div>
      </div>

      {/* ===== COMMENTS CARD ===== */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">💬 Recent Comments ({comments.length})</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-gray-500">No comments yet</p>
          ) : (
            comments.map(comment => (
              <div
                key={comment.id}
                className="bg-purple-50 dark:bg-purple-900 p-3 rounded border-l-4 border-purple-500"
              >
                <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  {comment.author_email}
                </div>
                <div className="text-sm text-purple-800 dark:text-purple-200 mt-1">
                  {comment.content.substring(0, 60)}...
                </div>
                <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  {new Date(comment.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-800 rounded text-sm text-purple-900 dark:text-purple-100">
          ✨ Real-time: Comments appear as users post them!
        </div>
      </div>

      {/* ===== NOTIFICATIONS CARD ===== */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">🔔 Notifications ({notifications.length})</h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications</p>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className="bg-orange-50 dark:bg-orange-900 p-3 rounded border-l-4 border-orange-500"
              >
                <div className="font-medium text-orange-900 dark:text-orange-100">
                  {notif.title}
                </div>
                <div className="text-sm text-orange-800 dark:text-orange-200">
                  {notif.message}
                </div>
                <div className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                  {new Date(notif.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-800 rounded text-sm text-orange-900 dark:text-orange-100">
          ✨ Real-time: Notifications arrive instantly as toasts!
        </div>
      </div>

      {/* ===== TEST INSTRUCTIONS CARD ===== */}
      <div className="md:col-span-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded-lg shadow-md p-6 border-2 border-blue-300 dark:border-blue-700">
        <h2 className="text-xl font-bold mb-3">🚀 Try Real-Time Now!</h2>
        <div className="space-y-2 text-sm">
          <p>1. Open this dashboard in TWO browser windows</p>
          <p>2. In Window 1, go to Admin Dashboard and add an admin</p>
          <p>3. In Window 2, watch the admins count and list update INSTANTLY ✨</p>
          <p>4. Repeat with comments, approvals, and notifications</p>
          <p className="mt-3 font-medium text-blue-900 dark:text-blue-100">
            🎉 That's real-time collaboration in action!
          </p>
        </div>
      </div>
    </div>
  )
}

export default RealTimeDashboard
