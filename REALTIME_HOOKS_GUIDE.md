# Real-Time Hooks for Hybrid Architecture

Below are all the hooks updated for Supabase real-time with live subscriptions.

## 1. useAdmins - Live Admin List

```typescript
// hooks/useAdmins.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from './use-toast'

interface Admin {
  id: string
  email: string
  role: string
  can_approve_reject: boolean
  can_manage_coupons: boolean
  can_manage_admins: boolean
  created_at: string
}

export function useAdmins() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    let subscription: any

    const loadAdmins = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('*, users(email)')
          .eq('role', 'admin')

        if (error) throw error
        setAdmins(data as Admin[])
      } catch (err: any) {
        toast({
          title: 'Error loading admins',
          description: err.message,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadAdmins()

    // Subscribe to real-time changes
    subscription = supabase
      .from('user_roles')
      .on('*', payload => {
        if (payload.eventType === 'INSERT') {
          setAdmins(prev => [...prev, payload.new as Admin])
          toast({
            title: 'New admin added',
            description: `${payload.new.email} is now an admin`,
          })
        } else if (payload.eventType === 'DELETE') {
          setAdmins(prev => prev.filter(a => a.id !== payload.old.id))
          toast({
            title: 'Admin removed',
            description: `${payload.old.email} is no longer an admin`,
          })
        } else if (payload.eventType === 'UPDATE') {
          setAdmins(prev =>
            prev.map(a => a.id === payload.new.id ? payload.new as Admin : a)
          )
        }
      })
      .subscribe()

    return () => {
      subscription?.unsubscribe()
    }
  }, [toast])

  return { admins, loading }
}
```

## 2. useNotifications - Live Toast Alerts

```typescript
// hooks/useNotifications.ts
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export function useNotifications() {
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!user?.id) return

    // Subscribe to real-time notifications
    const subscription = supabase
      .from('notifications')
      .on('INSERT', payload => {
        // Only show if notification is for this user
        if (payload.new.user_id === user.id) {
          toast({
            title: payload.new.title,
            description: payload.new.message,
            variant: payload.new.type === 'error' ? 'destructive' : 'default',
          })
        }
      })
      .subscribe()

    return () => {
      subscription?.unsubscribe()
    }
  }, [user?.id, toast])
}
```

## 3. useBookApprovals - Live Book Status Updates

```typescript
// hooks/useBookApprovals.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface BookApproval {
  id: string
  book_id: string
  status: 'pending' | 'approved' | 'rejected'
  feedback?: string
  approved_by?: string
  approved_at?: string
}

export function useBookApprovals(bookId?: string) {
  const [approvals, setApprovals] = useState<BookApproval[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let subscription: any

    const loadApprovals = async () => {
      let query = supabase.from('book_approvals').select('*')
      
      if (bookId) {
        query = query.eq('book_id', bookId)
      }

      const { data } = await query
      setApprovals(data as BookApproval[] || [])
      setLoading(false)
    }

    loadApprovals()

    // Subscribe to real-time changes
    subscription = supabase
      .from('book_approvals')
      .on('*', payload => {
        if (!bookId || payload.new.book_id === bookId) {
          if (payload.eventType === 'INSERT') {
            setApprovals(prev => [...prev, payload.new as BookApproval])
          } else if (payload.eventType === 'UPDATE') {
            setApprovals(prev =>
              prev.map(a => a.id === payload.new.id ? payload.new as BookApproval : a)
            )
          } else if (payload.eventType === 'DELETE') {
            setApprovals(prev => prev.filter(a => a.id !== payload.old.id))
          }
        }
      })
      .subscribe()

    return () => {
      subscription?.unsubscribe()
    }
  }, [bookId])

  return { approvals, loading }
}
```

## 4. useComments - Live Comments

```typescript
// hooks/useComments.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

interface Comment {
  id: string
  book_id: string
  user_id: string
  content: string
  rating?: number
  created_at: string
  author_name?: string
  author_avatar?: string
}

export function useComments(bookId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    let subscription: any

    const loadComments = async () => {
      const { data } = await supabase
        .from('comments_reviews')
        .select('*, users(display_name, avatar)')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false })

      setComments(data as Comment[] || [])
      setLoading(false)
    }

    loadComments()

    // Subscribe to new comments in real-time
    subscription = supabase
      .from('comments_reviews')
      .on('INSERT', payload => {
        if (payload.new.book_id === bookId) {
          setComments(prev => [payload.new as Comment, ...prev])
        }
      })
      .subscribe()

    return () => {
      subscription?.unsubscribe()
    }
  }, [bookId])

  const addComment = async (content: string, rating?: number) => {
    if (!user?.id) return

    const { data, error } = await supabase
      .from('comments_reviews')
      .insert({
        book_id: bookId,
        user_id: user.id,
        content,
        rating,
      })
      .select()

    if (error) throw error
    return data?.[0]
  }

  return { comments, loading, addComment }
}
```

## 5. useReadingProgress - Live Reading Tracking

```typescript
// hooks/useReadingProgress.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

interface Progress {
  id: string
  book_id: string
  user_id: string
  current_page: number
  total_pages: number
  reading_time: number // in minutes
  last_read_at: string
  completed_at?: string
}

export function useReadingProgress(bookId: string) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id || !bookId) return

    let subscription: any

    const loadProgress = async () => {
      const { data } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .single()

      setProgress(data as Progress || null)
    }

    loadProgress()

    // Subscribe to progress updates
    subscription = supabase
      .from('reading_progress')
      .on('UPDATE', payload => {
        if (
          payload.new.book_id === bookId &&
          payload.new.user_id === user.id
        ) {
          setProgress(payload.new as Progress)
        }
      })
      .subscribe()

    return () => {
      subscription?.unsubscribe()
    }
  }, [bookId, user?.id])

  const updateProgress = async (page: number, time: number) => {
    if (!user?.id) return

    const { data, error } = await supabase
      .from('reading_progress')
      .upsert({
        book_id: bookId,
        user_id: user.id,
        current_page: page,
        reading_time: time,
        last_read_at: new Date().toISOString(),
      })
      .select()

    if (error) throw error
    return data?.[0]
  }

  return { progress, updateProgress }
}
```

## 6. useWishlist - Live Wishlist Updates

```typescript
// hooks/useWishlist.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

export function useWishlist() {
  const [wishlist, setWishlist] = useState<string[]>([]) // array of book IDs
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return

    let subscription: any

    const loadWishlist = async () => {
      const { data } = await supabase
        .from('wishlists')
        .select('book_id')
        .eq('user_id', user.id)

      setWishlist(data?.map(w => w.book_id) || [])
    }

    loadWishlist()

    // Subscribe to wishlist changes
    subscription = supabase
      .from('wishlists')
      .on('*', payload => {
        if (payload.new.user_id === user.id) {
          if (payload.eventType === 'INSERT') {
            setWishlist(prev => [...prev, payload.new.book_id])
          } else if (payload.eventType === 'DELETE') {
            setWishlist(prev => prev.filter(id => id !== payload.old.book_id))
          }
        }
      })
      .subscribe()

    return () => {
      subscription?.unsubscribe()
    }
  }, [user?.id])

  const toggleWishlist = async (bookId: string) => {
    if (!user?.id) return

    if (wishlist.includes(bookId)) {
      await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', bookId)
    } else {
      await supabase
        .from('wishlists')
        .insert({ user_id: user.id, book_id: bookId })
    }
  }

  return { wishlist, toggleWishlist }
}
```

## 7. useBookmarks - Live Bookmarks

```typescript
// hooks/useBookmarks.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

interface Bookmark {
  id: string
  book_id: string
  page: number
  note?: string
  created_at: string
}

export function useBookmarks(bookId: string) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id || !bookId) return

    let subscription: any

    const loadBookmarks = async () => {
      const { data } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .order('page', { ascending: true })

      setBookmarks(data as Bookmark[] || [])
    }

    loadBookmarks()

    // Subscribe to bookmark changes
    subscription = supabase
      .from('bookmarks')
      .on('*', payload => {
        if (
          payload.new.book_id === bookId &&
          payload.new.user_id === user.id
        ) {
          if (payload.eventType === 'INSERT') {
            setBookmarks(prev => [
              ...prev,
              payload.new as Bookmark,
            ].sort((a, b) => a.page - b.page))
          } else if (payload.eventType === 'DELETE') {
            setBookmarks(prev => prev.filter(b => b.id !== payload.old.id))
          }
        }
      })
      .subscribe()

    return () => {
      subscription?.unsubscribe()
    }
  }, [bookId, user?.id])

  const addBookmark = async (page: number, note?: string) => {
    if (!user?.id) return

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        book_id: bookId,
        user_id: user.id,
        page,
        note,
      })
      .select()

    if (error) throw error
    return data?.[0]
  }

  return { bookmarks, addBookmark }
}
```

## Usage in Components

```typescript
// Example: Admin Dashboard with real-time admin list
import { useAdmins } from '@/hooks/useAdmins'
import { useNotifications } from '@/hooks/useNotifications'

export function AdminDashboard() {
  // Subscribe to real-time notifications
  useNotifications()
  
  // Get live admin list
  const { admins, loading } = useAdmins()

  return (
    <div>
      <h1>Admins ({admins.length})</h1>
      {admins.map(admin => (
        <div key={admin.id}>{admin.email}</div>
      ))}
    </div>
  )
  // When admin is added anywhere, this list updates instantly!
}
```

```typescript
// Example: Book reader with live comments
import { useComments } from '@/hooks/useComments'
import { useReadingProgress } from '@/hooks/useReadingProgress'

export function BookReader({ bookId }: { bookId: string }) {
  // Live comments
  const { comments } = useComments(bookId)
  
  // Live reading progress
  const { progress, updateProgress } = useReadingProgress(bookId)

  return (
    <div>
      <div>
        <h2>Reading Progress: {progress?.current_page}/{progress?.total_pages}</h2>
      </div>
      
      <div>
        <h3>Comments ({comments.length})</h3>
        {comments.map(c => (
          <div key={c.id}>{c.author_name}: {c.content}</div>
        ))}
        {/* New comments appear instantly! */}
      </div>
    </div>
  )
}
```

---

## Key Features

✅ **Real-time subscriptions** to all data changes  
✅ **Automatic UI updates** when data changes  
✅ **Live counts** (comment count, admin count, etc)  
✅ **Toast notifications** for important events  
✅ **Efficient** - only subscribe to relevant data  
✅ **Type-safe** - full TypeScript support  

---

## Performance Tips

1. **Unsubscribe on unmount** - All hooks do this automatically
2. **Scope subscriptions** - Only subscribe to user's own data
3. **Use RLS policies** - Supabase enforces row-level security
4. **Debounce updates** - Don't update too frequently
5. **Use presence** - Coming soon! Show who's reading what

---

**These hooks give you Instagram/Discord-like real-time updates!** 🚀
